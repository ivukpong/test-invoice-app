import React, { useState } from "react";
import appLogo from "../assets/logo/free invoice logo.png";

const API = import.meta.env.VITE_API_BASE_URL || "";

const ROLES = [
  { value: "buyer", label: "Procurement / Buyer" },
  { value: "supplier", label: "Supplier" },
  { value: "contractor", label: "Contractor" },
];

export default function RegisterPage({ onRegister, onLogin }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    category: "public",
    role: "buyer",
    company: "",
    buildosUserId: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function validateStep1() {
    if (!form.name.trim()) return "Full name is required.";
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email))
      return "A valid email is required.";
    if (form.password.length < 8)
      return "Password must be at least 8 characters.";
    if (form.password !== form.confirmPassword)
      return "Passwords do not match.";
    return null;
  }

  function nextStep() {
    const err = validateStep1();
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setStep(2);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const body = {
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
        category: form.category,
        role: form.category === "vendor" ? form.role : "public",
        company: form.company || undefined,
      };
      const res = await fetch(`${API}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed.");
        return;
      }

      // Optional BuildOS account link
      if (form.buildosUserId.trim() && data.id) {
        await fetch(`${API}/api/auth/buildos-link`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profile_id: data.id,
            buildos_user_id: form.buildosUserId.trim(),
          }),
        });
      }

      localStorage.setItem("profile", JSON.stringify(data));
      onRegister(data);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.backdrop}>
      <div style={s.card}>
        <div style={s.logoWrap}>
          <img src={appLogo} alt="Free Invoice" style={s.logo} />
        </div>

        {/* Step indicator */}
        <div style={s.stepRow}>
          {[1, 2].map((n) => (
            <React.Fragment key={n}>
              <div
                style={{ ...s.stepDot, ...(step >= n ? s.stepDotActive : {}) }}
              >
                {n}
              </div>
              {n < 2 && (
                <div
                  style={{
                    ...s.stepLine,
                    ...(step > 1 ? s.stepLineActive : {}),
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        <h1 style={s.heading}>
          {step === 1 ? "Create your account" : "Your profile type"}
        </h1>
        <p style={s.subheading}>
          {step === 1
            ? "Enter your details to get started"
            : "Tell us how you'll use Free Invoice"}
        </p>

        {error && <div style={s.errorBanner}>{error}</div>}

        {step === 1 && (
          <div style={s.form}>
            <Field label="Full name">
              <input
                style={s.input}
                value={form.name}
                onChange={set("name")}
                placeholder="Jane Doe"
              />
            </Field>
            <Field label="Email address">
              <input
                style={s.input}
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </Field>
            <Field label="Password">
              <input
                style={s.input}
                type="password"
                value={form.password}
                onChange={set("password")}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
              />
            </Field>
            <Field label="Confirm password">
              <input
                style={s.input}
                type="password"
                value={form.confirmPassword}
                onChange={set("confirmPassword")}
                placeholder="Repeat password"
              />
            </Field>
            <Field label="Phone number (optional)">
              <input
                style={s.input}
                type="tel"
                value={form.phone}
                onChange={set("phone")}
                placeholder="+234 800 000 0000"
              />
            </Field>
            <button onClick={nextStep} style={s.primaryBtn}>
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} style={s.form}>
            {/* Category toggle */}
            <label style={s.label}>Account type</label>
            <div style={s.toggleRow}>
              {[
                {
                  v: "public",
                  label: "General Public",
                  desc: "Create & download invoices freely",
                },
                {
                  v: "vendor",
                  label: "Vendor / Trade",
                  desc: "Negotiations, quotes & BuildOS integration",
                },
              ].map(({ v, label, desc }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, category: v }))}
                  style={{
                    ...s.categoryCard,
                    ...(form.category === v ? s.categoryCardActive : {}),
                  }}
                >
                  <span style={s.categoryLabel}>{label}</span>
                  <span style={s.categoryDesc}>{desc}</span>
                </button>
              ))}
            </div>

            {form.category === "vendor" && (
              <>
                <Field label="Role">
                  <select
                    style={s.input}
                    value={form.role}
                    onChange={set("role")}
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Company name (optional)">
                  <input
                    style={s.input}
                    value={form.company}
                    onChange={set("company")}
                    placeholder="Acme Ltd."
                  />
                </Field>
                <Field label="BuildOS User ID (optional)">
                  <input
                    style={s.input}
                    value={form.buildosUserId}
                    onChange={set("buildosUserId")}
                    placeholder="Link your BuildOS account"
                  />
                  <p style={s.hint}>
                    Connect your BuildOS account to sync procurement activity
                  </p>
                </Field>
              </>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={s.backBtn}
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{ ...s.primaryBtn, flex: 1 }}
              >
                {loading ? "Creating account…" : "Create account"}
              </button>
            </div>
          </form>
        )}

        <p style={s.loginPrompt}>
          Already have an account?{" "}
          <button onClick={onLogin} style={s.linkBtn}>
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginTop: 14 }}>
      <label style={s.label}>{label}</label>
      {children}
    </div>
  );
}

const s = {
  backdrop: {
    minHeight: "100vh",
    background: "var(--color-bg, #f7f7f5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--font-family-base, 'Futura', Avenir, Inter, sans-serif)",
    padding: "24px 16px",
  },
  card: {
    background: "var(--color-surface, #ffffff)",
    borderRadius: 16,
    boxShadow: "var(--shadow-soft, 0 18px 40px rgba(15,23,42,0.08))",
    padding: "40px 36px",
    width: "100%",
    maxWidth: 460,
  },
  logoWrap: { textAlign: "center", marginBottom: 20 },
  logo: { height: 40, objectFit: "contain" },
  stepRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
    marginBottom: 24,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    border: "2px solid var(--color-grey, #d1d1d6)",
    background: "var(--color-bg, #f7f7f5)",
    color: "var(--color-grey-dark, #6e6e73)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
    transition: "all .2s",
  },
  stepDotActive: {
    background: "var(--color-accent, #0f172a)",
    borderColor: "var(--color-accent, #0f172a)",
    color: "#fff",
  },
  stepLine: {
    width: 48,
    height: 2,
    background: "var(--color-grey-light, #ececeb)",
    transition: "background .2s",
  },
  stepLineActive: { background: "var(--color-accent, #0f172a)" },
  heading: {
    margin: "0 0 4px",
    fontSize: 22,
    fontWeight: 700,
    color: "var(--color-text, #1c1c1e)",
  },
  subheading: {
    margin: "0 0 20px",
    fontSize: 13,
    color: "var(--color-grey-dark, #6e6e73)",
  },
  errorBanner: {
    background: "#fff0f0",
    border: "1px solid #fca5a5",
    color: "#b91c1c",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    marginBottom: 12,
  },
  form: { display: "flex", flexDirection: "column" },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "var(--color-text, #1c1c1e)",
    marginBottom: 5,
    letterSpacing: "0.3px",
    textTransform: "uppercase",
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 8,
    border: "1.5px solid var(--color-grey, #d1d1d6)",
    background: "var(--color-bg, #f7f7f5)",
    fontSize: 14,
    color: "var(--color-text, #1c1c1e)",
    outline: "none",
    boxSizing: "border-box",
  },
  primaryBtn: {
    marginTop: 20,
    width: "100%",
    padding: "12px 0",
    background: "var(--color-accent, #0f172a)",
    color: "#ffffff",
    border: "none",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
  },
  backBtn: {
    marginTop: 20,
    padding: "12px 20px",
    background: "transparent",
    color: "var(--color-accent, #0f172a)",
    border: "1.5px solid var(--color-grey, #d1d1d6)",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
  },
  toggleRow: { display: "flex", gap: 10, marginBottom: 4 },
  categoryCard: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 4,
    padding: "14px 12px",
    borderRadius: 10,
    border: "1.5px solid var(--color-grey, #d1d1d6)",
    background: "var(--color-bg, #f7f7f5)",
    cursor: "pointer",
    textAlign: "left",
    transition: "border-color .15s, background .15s",
  },
  categoryCardActive: {
    border: "1.5px solid var(--color-accent, #0f172a)",
    background: "var(--color-accent-soft, #f1f5f9)",
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: "var(--color-text, #1c1c1e)",
  },
  categoryDesc: { fontSize: 11, color: "var(--color-grey-dark, #6e6e73)" },
  hint: {
    margin: "4px 0 0",
    fontSize: 11,
    color: "var(--color-grey-dark, #6e6e73)",
  },
  loginPrompt: {
    marginTop: 24,
    textAlign: "center",
    fontSize: 13,
    color: "var(--color-grey-dark, #6e6e73)",
  },
  linkBtn: {
    background: "none",
    border: "none",
    color: "var(--color-accent, #0f172a)",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 13,
    padding: 0,
    textDecoration: "underline",
  },
};
