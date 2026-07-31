// Single place that knows how to call the BuildOS ERP.
//
// Previously each call site read BUILDOS_API_URL / BUILDOS_API_TOKEN itself and
// sent the token as `Authorization: Bearer`. That token was documented as a JWT
// from a "service-account login", but BuildOS has no service accounts and its
// user JWTs expire, so the integration broke on every rotation. BuildOS now
// accepts a long-lived service key (Admin › API Keys) on routes marked
// @ServiceAuth(), presented in `X-Api-Key`.

const RAW_BASE = (process.env.BUILDOS_API_URL || "").trim().replace(/\/+$/, "");
const SERVICE_KEY = (process.env.BUILDOS_SERVICE_API_KEY || "").trim();

if (!SERVICE_KEY && process.env.BUILDOS_API_TOKEN) {
  console.warn(
    "BUILDOS_API_TOKEN is set but is no longer used. BuildOS now authenticates " +
      "service calls with an API key — set BUILDOS_SERVICE_API_KEY instead " +
      "(generate it in BuildOS under Admin › API Keys).",
  );
}

export function isBuildosConfigured() {
  return Boolean(RAW_BASE && SERVICE_KEY);
}

// Callers skip the sync entirely when this is unconfigured, which looks
// identical to "the sync ran and did nothing". Say so once at boot so a
// deployment missing these vars is obvious rather than being diagnosed as a
// broken integration.
if (!isBuildosConfigured()) {
  const missing = [
    !RAW_BASE && "BUILDOS_API_URL",
    !SERVICE_KEY && "BUILDOS_SERVICE_API_KEY",
  ].filter(Boolean);
  console.warn(
    `BuildOS integration disabled — ${missing.join(" and ")} not set. ` +
      "Supplier profiles will NOT sync into BuildOS Procurement until this is configured.",
  );
}

export class BuildosError extends Error {
  constructor(message, { status = 0, body = null } = {}) {
    super(message);
    this.name = "BuildosError";
    this.status = status;
    this.body = body;
  }
}

/**
 * Call BuildOS. `path` is relative to BUILDOS_API_URL, which must already
 * include the ERP's global `/api` prefix.
 *
 * Throws BuildosError on a non-2xx response or a transport failure, so callers
 * decide whether a sync failure should surface to the user or just be logged.
 */
export async function buildosFetch(path, { method = "GET", body, timeoutMs = 10000 } = {}) {
  if (!isBuildosConfigured()) {
    throw new BuildosError(
      "BuildOS integration is not configured (set BUILDOS_API_URL and BUILDOS_SERVICE_API_KEY)",
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(`${RAW_BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": SERVICE_KEY,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    throw new BuildosError(
      error.name === "AbortError"
        ? `BuildOS request timed out after ${timeoutMs}ms`
        : `Could not reach BuildOS: ${error.message}`,
    );
  } finally {
    clearTimeout(timer);
  }

  const raw = await response.text().catch(() => "");
  let parsed = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    // Non-JSON error page — keep the text for the message below.
  }

  if (!response.ok) {
    throw new BuildosError(
      parsed?.message || parsed?.error || `BuildOS returned HTTP ${response.status}`,
      { status: response.status, body: parsed ?? raw },
    );
  }

  return parsed;
}
