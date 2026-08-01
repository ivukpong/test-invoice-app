import { useEffect, useState } from "react";
import { API_BASE_URL } from "../utils/apiClient";

/** Mirrors the account types offered during registration. */
const CATEGORIES = [
  { value: "public", label: "Public / Individual" },
  { value: "vendor", label: "Vendor / Business" },
];

/** Vendor roles, matching onboarding. */
const VENDOR_ROLES = [
  { value: "buyer", label: "Procurement / Buyer" },
  { value: "supplier", label: "Supplier" },
  { value: "contractor", label: "Contractor" },
];

/**
 * Roles Procurement raises purchase orders against. Only these sync into
 * BuildOS as suppliers — a buyer is a procurement-side account, not somebody
 * being purchased from. Mirrors SUPPLYING_ROLES on the server.
 */
const SUPPLYING_ROLES = new Set(["supplier", "contractor"]);

/**
 * My Profile.
 *
 * This was a read-only list of five fields. Nothing could be edited, so a user
 * who registered as "public" could never become a vendor, a vendor could not
 * correct their role, and there was nowhere to enter the BuildOS vendor ID that
 * links an existing Procurement supplier to this account — which is why
 * established vendors kept being duplicated in the ERP instead of claimed.
 */
export default function ProfilePage({ profile, onBack, onProfileChange }) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    company: "",
    category: "public",
    role: "public",
    buildos_supplier_ref: "",
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    setForm({
      name: profile?.name ?? "",
      phone: profile?.phone ?? "",
      company: profile?.company ?? "",
      category: profile?.category ?? "public",
      role: profile?.role ?? "public",
      buildos_supplier_ref: profile?.buildos_supplier_ref ?? "",
    });
  }, [profile]);

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const isVendor = form.category === "vendor";
  const willSync = isVendor && SUPPLYING_ROLES.has(form.role);

  async function save(e) {
    e.preventDefault();
    if (!profile?.id || saving) return;
    setSaving(true);
    setStatus(null);
    try {
      // A public account has no vendor role; sending one would leave a stale
      // role behind if the user switched back.
      const payload = {
        ...form,
        role: isVendor ? form.role : "public",
        buildos_supplier_ref: form.buildos_supplier_ref.trim() || null,
      };
      const res = await fetch(`${API_BASE_URL}/api/profile/${profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Could not save your profile.");

      onProfileChange?.({ ...profile, ...body });
      setStatus({
        tone: "ok",
        message: willSync
          ? "Profile saved. Sign out and back in to sync with BuildOS Procurement."
          : "Profile saved.",
      });
    } catch (err) {
      setStatus({ tone: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  }

  const syncState = profile?.buildos_supplier_id
    ? `Linked to Procurement supplier ${profile.buildos_supplier_id}`
    : profile?.buildos_sync_status === "failed"
      ? `Last sync failed: ${profile.buildos_sync_error || "unknown error"}`
      : "Not yet linked to Procurement";

  return (
    <div style={s.page}>
      <button onClick={onBack} style={s.backBtn}>
        ← Back to Invoice Builder
      </button>

      <form style={s.card} onSubmit={save}>
        <h2 style={s.cardTitle}>My Profile</h2>

        <div style={s.grid}>
          <label style={s.field}>
            <span style={s.fieldLabel}>Name</span>
            <input style={s.input} value={form.name} onChange={set("name")} />
          </label>

          <label style={s.field}>
            <span style={s.fieldLabel}>Email</span>
            {/* Read-only: the email identifies the account and is what a
                password change and every notification is sent to. */}
            <input
              style={{ ...s.input, ...s.readOnly }}
              value={profile?.email ?? ""}
              readOnly
            />
          </label>

          <label style={s.field}>
            <span style={s.fieldLabel}>Phone</span>
            <input style={s.input} value={form.phone} onChange={set("phone")} />
          </label>

          <label style={s.field}>
            <span style={s.fieldLabel}>Company</span>
            <input
              style={s.input}
              value={form.company}
              onChange={set("company")}
            />
          </label>

          <label style={s.field}>
            <span style={s.fieldLabel}>Account type</span>
            <select
              style={s.input}
              value={form.category}
              onChange={set("category")}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          {isVendor && (
            <label style={s.field}>
              <span style={s.fieldLabel}>Vendor role</span>
              <select style={s.input} value={form.role} onChange={set("role")}>
                {VENDOR_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {isVendor && (
          <div style={s.syncBlock}>
            <h3 style={s.subTitle}>BuildOS Procurement</h3>
            <label style={s.field}>
              <span style={s.fieldLabel}>BuildOS Vendor ID (optional)</span>
              <input
                style={s.input}
                value={form.buildos_supplier_ref}
                onChange={set("buildos_supplier_ref")}
                placeholder="Paste the supplier ID Procurement gave you"
                autoComplete="off"
              />
            </label>
            <p style={s.hint}>
              Already supply this company? Enter your vendor ID so your existing
              supplier record is linked to this account instead of a duplicate
              being created. Leave blank if you are new.
            </p>
            <p style={s.syncState}>{syncState}</p>
            {!willSync && (
              <p style={s.hint}>
                Only Supplier and Contractor accounts sync into Procurement — a
                Buyer is a procurement-side account.
              </p>
            )}
          </div>
        )}

        {status && (
          <p
            role="status"
            style={{
              ...s.status,
              color: status.tone === "error" ? "#b91c1c" : "#15803d",
            }}
          >
            {status.message}
          </p>
        )}

        <button type="submit" style={s.saveBtn} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}

const s = {
  page: {
    maxWidth: 920,
    margin: "0 auto",
    padding: "32px 20px 60px",
    fontFamily: "var(--font-body, system-ui, sans-serif)",
  },
  backBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    color: "var(--color-accent, #0f172a)",
    fontWeight: 600,
    padding: "0 0 24px 0",
    display: "block",
  },
  card: {
    background: "#fff",
    border: "1px solid var(--color-grey, #e2e8f0)",
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 700,
    margin: "0 0 18px 0",
    color: "var(--color-accent, #0f172a)",
  },
  subTitle: {
    fontSize: 14,
    fontWeight: 700,
    margin: "0 0 12px 0",
    color: "var(--color-accent, #0f172a)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: 16,
  },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    padding: "9px 11px",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    fontSize: 14,
    fontFamily: "inherit",
    background: "#fff",
  },
  readOnly: { background: "#f8fafc", color: "#64748b" },
  syncBlock: {
    marginTop: 24,
    paddingTop: 20,
    borderTop: "1px solid #e2e8f0",
  },
  hint: { fontSize: 12, color: "#64748b", margin: "8px 0 0", lineHeight: 1.5 },
  syncState: {
    fontSize: 12,
    color: "#334155",
    margin: "10px 0 0",
    fontWeight: 600,
  },
  status: { fontSize: 13, fontWeight: 600, margin: "16px 0 0" },
  saveBtn: {
    marginTop: 20,
    padding: "10px 20px",
    border: "none",
    borderRadius: 8,
    background: "var(--color-accent, #1a1a2e)",
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
};
