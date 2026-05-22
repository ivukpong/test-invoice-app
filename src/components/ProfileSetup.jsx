import { useState } from "react";

const API = import.meta.env.VITE_API_BASE_URL;

export default function ProfileSetup({ onSave }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    role: "buyer",
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setSaving(true);
    const res = await fetch(`${API}/api/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const profile = await res.json();
    localStorage.setItem("profileId", profile.id);
    onSave(profile);
    setSaving(false);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-bg)",
        padding: 16,
      }}
    >
      <form
        className="profile-setup-card"
        style={{
          width: "100%",
          maxWidth: 400,
          background: "var(--color-surface)",
          border: "1px solid var(--color-grey-light)",
          borderRadius: 20,
          boxShadow: "var(--shadow-soft)",
          padding: 32,
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <h2 style={{ textAlign: "center", marginBottom: 18 }}>
          Set up your profile
        </h2>
        <label>
          Role
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            style={{ marginTop: 4 }}
          >
            <option value="buyer">Buyer (Procurement)</option>
            <option value="supplier">Supplier</option>
            <option value="contractor">Contractor</option>
          </select>
        </label>
        <label>
          Full name
          <input
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            style={{ marginTop: 4 }}
          />
        </label>
        <label>
          Email
          <input
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            type="email"
            style={{ marginTop: 4 }}
          />
        </label>
        <label>
          Company
          <input
            placeholder="Company"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            required
            style={{ marginTop: 4 }}
          />
        </label>
        <label>
          WhatsApp Phone Number
          <input
            placeholder="WhatsApp number (e.g. +2348012345678)"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            required
            style={{ marginTop: 4 }}
            type="tel"
          />
        </label>
        <button type="submit" disabled={saving} style={{ marginTop: 18 }}>
          {saving ? "Saving…" : "Save profile"}
        </button>
      </form>
    </div>
  );
}
