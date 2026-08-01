import React, { useState } from "react";
import appLogo from "../assets/logo/logo-full.png";
import { postJson } from "../utils/apiClient";
import styles from "./RegisterPage.module.css";

const ROLES = [
  { value: "buyer", label: "Procurement / Buyer" },
  { value: "supplier", label: "Supplier" },
  { value: "contractor", label: "Contractor" },
];

const CATEGORIES = [
  {
    value: "public",
    label: "General Public",
    desc: "Create & download invoices freely",
  },
  {
    value: "vendor",
    label: "Vendor / Trade",
    desc: "Negotiations, quotes & BuildOS integration",
  },
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
    buildosSupplierId: "",
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
      const data = await postJson("/api/auth/register", {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
        category: form.category,
        role: form.category === "vendor" ? form.role : "public",
        company: form.company.trim() || undefined,
        // Lets an established vendor claim their existing Procurement
        // supplier record instead of a duplicate being created.
        buildosSupplierId: form.buildosSupplierId.trim() || undefined,
      });

      // Optional BuildOS account link — a failure here must not discard the
      // account that was just created.
      if (form.buildosUserId.trim() && data.id) {
        try {
          await postJson("/api/auth/buildos-link", {
            profile_id: data.id,
            buildos_user_id: form.buildosUserId.trim(),
          });
        } catch {
          // Non-fatal: the profile exists and can be linked from Settings.
        }
      }

      localStorage.setItem("profile", JSON.stringify(data));
      onRegister(data);
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.backdrop}>
      <div className={styles.card}>
        <div className={styles.logoWrap}>
          <img src={appLogo} alt="sabiquot" className={styles.logo} />
        </div>

        {/* Step indicator */}
        <div className={styles.stepRow}>
          {[1, 2].map((n) => (
            <React.Fragment key={n}>
              <div
                className={`${styles.stepDot} ${
                  step >= n ? styles.stepDotActive : ""
                }`}
              >
                {n}
              </div>
              {n < 2 && (
                <div
                  className={`${styles.stepLine} ${
                    step > 1 ? styles.stepLineActive : ""
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        <h1 className={styles.heading}>
          {step === 1 ? "Create your account" : "Your profile type"}
        </h1>
        <p className={styles.subheading}>
          {step === 1
            ? "Enter your details to get started"
            : "Tell us how you'll use sabiquot"}
        </p>

        {error && <div className={styles.errorBanner}>{error}</div>}

        {step === 1 && (
          <div className={styles.form}>
            <div className={styles.grid}>
              <Field label="Full name">
                <input
                  className={styles.input}
                  value={form.name}
                  onChange={set("name")}
                  placeholder="Jane Doe"
                  autoComplete="name"
                />
              </Field>
              <Field label="Email address">
                <input
                  className={styles.input}
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </Field>
              <Field label="Password">
                <input
                  className={styles.input}
                  type="password"
                  value={form.password}
                  onChange={set("password")}
                  placeholder="Minimum 8 characters"
                  autoComplete="new-password"
                />
              </Field>
              <Field label="Confirm password">
                <input
                  className={styles.input}
                  type="password"
                  value={form.confirmPassword}
                  onChange={set("confirmPassword")}
                  placeholder="Repeat password"
                  autoComplete="new-password"
                />
              </Field>
              <Field label="Phone number (optional)" full>
                <input
                  className={styles.input}
                  type="tel"
                  value={form.phone}
                  onChange={set("phone")}
                  placeholder="+234 800 000 0000"
                  autoComplete="tel"
                />
              </Field>
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                onClick={nextStep}
                className={styles.primaryBtn}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Account type</label>
              <div className={styles.categoryRow}>
                {CATEGORIES.map(({ value, label, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, category: value }))
                    }
                    className={`${styles.categoryCard} ${
                      form.category === value ? styles.categoryCardActive : ""
                    }`}
                  >
                    <span className={styles.categoryLabel}>{label}</span>
                    <span className={styles.categoryDesc}>{desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {form.category === "vendor" && (
              <div className={styles.grid} style={{ marginTop: 20 }}>
                <Field label="Role">
                  <select
                    className={styles.input}
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
                    className={styles.input}
                    value={form.company}
                    onChange={set("company")}
                    placeholder="Acme Ltd."
                    autoComplete="organization"
                  />
                </Field>
                <Field label="BuildOS Vendor ID (optional)" full>
                  <input
                    className={styles.input}
                    value={form.buildosSupplierId}
                    onChange={set("buildosSupplierId")}
                    placeholder="Paste the supplier ID Procurement gave you"
                    autoComplete="off"
                  />
                  <p className={styles.hint}>
                    Already supply this company? Enter the vendor ID from
                    Procurement so your existing supplier record is linked to this
                    account instead of a duplicate being created. Leave blank if
                    you are new.
                  </p>
                </Field>
                <Field label="BuildOS User ID (optional)" full>
                  <input
                    className={styles.input}
                    value={form.buildosUserId}
                    onChange={set("buildosUserId")}
                    placeholder="Link your BuildOS account"
                  />
                  <p className={styles.hint}>
                    Connect your BuildOS account to sync procurement activity
                  </p>
                </Field>
              </div>
            )}

            <div className={styles.actions}>
              <button
                type="button"
                onClick={() => setStep(1)}
                className={styles.backBtn}
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className={styles.primaryBtn}
              >
                {loading ? "Creating account…" : "Create account"}
              </button>
            </div>
          </form>
        )}

        <p className={styles.loginPrompt}>
          Already have an account?{" "}
          <button onClick={onLogin} className={styles.linkBtn}>
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}

function Field({ label, children, full = false }) {
  return (
    <div className={`${styles.field} ${full ? styles.spanFull : ""}`}>
      <label className={styles.label}>{label}</label>
      {children}
    </div>
  );
}
