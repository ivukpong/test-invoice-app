import { API_BASE_URL } from "./apiClient";

/**
 * User settings.
 *
 * These were rendered as uncontrolled inputs with no save path, so nothing a
 * user chose was recorded and nothing acted on it. They now persist on the
 * profile and are read by the parts of the app they govern — currency by the
 * invoice builder, the notification toggles by the server's email path.
 */
export const DEFAULT_SETTINGS = {
  language: "en",
  currency: "NGN",
  timezone: "Africa/Lagos",
  emailNotifications: true,
  invoiceReminders: true,
  negotiationAlerts: true,
};

/** Merges stored settings over the defaults, tolerating a null/!object value. */
export function withDefaults(stored) {
  return {
    ...DEFAULT_SETTINGS,
    ...(stored && typeof stored === "object" ? stored : {}),
  };
}

/**
 * The signed-in user's settings, read from the cached profile.
 *
 * Synchronous so callers that need a currency during render — the invoice
 * builder's initial state — do not have to wait on a request.
 */
export function readSettings() {
  try {
    const profile = JSON.parse(localStorage.getItem("profile") || "null");
    return withDefaults(profile?.settings);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** Persists settings to the profile and refreshes the local cache. */
export async function saveSettings(profileId, settings) {
  const response = await fetch(`${API_BASE_URL}/api/profile/${profileId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ settings }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "Could not save your settings.");
  }
  const updated = await response.json();
  // Keep the cached profile in step, so a reload does not show stale settings.
  try {
    const cached = JSON.parse(localStorage.getItem("profile") || "null");
    if (cached) {
      localStorage.setItem(
        "profile",
        JSON.stringify({ ...cached, ...updated, settings }),
      );
    }
  } catch {
    /* cache refresh is best-effort */
  }
  return updated;
}
