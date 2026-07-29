// Single source of truth for where the API lives, plus JSON helpers that
// report *why* a request failed instead of collapsing everything into
// "could not reach the server".

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || "")
  .trim()
  .replace(/\/+$/, "");

function isLoopback(hostname) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]" ||
    hostname.endsWith(".localhost")
  );
}

// A loopback base URL is baked into the bundle at build time. When the app is
// served from a real origin that address points at the visitor's own machine,
// so every request fails. Fall back to same-origin and let the platform
// rewrite /api/* to the serverless function.
function resolveApiBase() {
  if (!RAW_BASE) return "";
  if (typeof window === "undefined") return RAW_BASE;

  let target;
  try {
    target = new URL(RAW_BASE, window.location.origin);
  } catch {
    return "";
  }

  if (isLoopback(target.hostname) && !isLoopback(window.location.hostname)) {
    return "";
  }

  return (target.origin + target.pathname).replace(/\/+$/, "");
}

export const API_BASE_URL = resolveApiBase();

export class ApiError extends Error {
  constructor(message, { status = 0, network = false } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.network = network;
  }
}

async function parseBody(res) {
  const raw = await res.text().catch(() => "");
  if (!raw) return { data: null, raw: "" };
  try {
    return { data: JSON.parse(raw), raw };
  } catch {
    return { data: null, raw };
  }
}

// Rate limiters, proxies and crashed serverless functions all answer with
// HTML or plain text, so the body is parsed defensively rather than assumed.
export async function requestJson(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, options);
  } catch {
    throw new ApiError(
      "Could not reach the server. Check your connection and try again.",
      { network: true },
    );
  }

  const { data, raw } = await parseBody(res);

  if (!res.ok) {
    const fromBody = data?.error || data?.message;
    const fromText = raw && raw.length <= 200 && !/^\s*</.test(raw) && raw.trim();
    throw new ApiError(
      fromBody || fromText || `Request failed (HTTP ${res.status}).`,
      { status: res.status },
    );
  }

  if (data === null) {
    throw new ApiError(
      `The server returned an unexpected response (HTTP ${res.status}).`,
      { status: res.status },
    );
  }

  return data;
}

export function postJson(path, body) {
  return requestJson(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
