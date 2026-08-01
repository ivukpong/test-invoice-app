import { useEffect, useMemo, useState } from "react";
import styles from "./SettingsPage.module.css";
import { API_BASE_URL } from "../utils/apiClient";
import { withDefaults, saveSettings } from "../utils/settings";
import { getMyInvoices } from "../utils/invoiceApi";

const SUPPORT_EMAIL = "support@sabiquot.com";
const HELP_CENTRE_URL = "https://freeinvoice.app/help";
const VIDEO_TUTORIALS_URL = "https://freeinvoice.app/tutorials";

/**
 * Settings.
 *
 * Every control here was previously uncontrolled (`defaultValue` /
 * `defaultChecked`) with no save path, and every button except "Start Tutorial"
 * had no handler at all — so the module looked complete but did nothing. The
 * preferences now persist to the profile and are read by the code they govern
 * (currency by the invoice builder, the toggles by the server's email path), and
 * each action either performs its job or says plainly that it is unavailable.
 */
export default function SettingsPage({
  profile,
  onBack,
  onRetakeTour,
  onStartTutorial,
  onProfileChange,
}) {
  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState(() => withDefaults(profile?.settings));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const [busyAction, setBusyAction] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });

  useEffect(() => {
    setSettings(withDefaults(profile?.settings));
  }, [profile?.settings]);

  const tabs = useMemo(
    () => [
      { id: "general", label: "General", icon: "⚙️" },
      { id: "notifications", label: "Notifications", icon: "🔔" },
      { id: "privacy", label: "Privacy", icon: "🔒" },
      { id: "help", label: "Help & Tutorials", icon: "❓" },
    ],
    [],
  );

  function flash(message, tone = "ok") {
    setStatus({ message, tone });
    setTimeout(() => setStatus(null), 4000);
  }

  /** Applies a change optimistically, then persists it. */
  async function update(key, value) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    if (!profile?.id) {
      flash("Sign in to save your settings.", "error");
      return;
    }
    setSaving(true);
    try {
      const updated = await saveSettings(profile.id, next);
      onProfileChange?.({ ...profile, ...updated, settings: next });
      flash("Saved.");
    } catch (err) {
      // Put the old value back rather than showing a preference that was
      // not actually stored.
      setSettings(settings);
      flash(err.message || "Could not save your settings.", "error");
    } finally {
      setSaving(false);
    }
  }

  const handleRetakeTour = () => {
    localStorage.removeItem("onboardingComplete");
    onRetakeTour?.();
  };

  /** Downloads every invoice on this account as JSON. */
  async function exportData() {
    if (!profile?.id) return flash("Sign in to export your data.", "error");
    setBusyAction("export");
    try {
      const { invoices = [] } = await getMyInvoices({
        limit: 1000,
        profileId: profile.id,
      });
      const blob = new Blob(
        [JSON.stringify({ profile: { ...profile, password_hash: undefined }, invoices }, null, 2)],
        { type: "application/json" },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sabiquot-data-${new Date().toISOString().slice(0, 10)}.json`;
      // Appended to the document: Firefox and Safari ignore a click on a
      // detached anchor.
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      requestAnimationFrame(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
      flash(`Exported ${invoices.length} invoice(s).`);
    } catch (err) {
      flash(err.message || "Could not export your data.", "error");
    } finally {
      setBusyAction(null);
    }
  }

  /**
   * Changes the password in place. An emailed reset link would be a dead end —
   * there is no reset page or token storage in this app — so the current
   * password is required instead.
   */
  async function changePassword() {
    if (!profile?.id) return flash("Sign in to change your password.", "error");
    if (!pw.current || !pw.next) {
      return flash("Enter your current and new password.", "error");
    }
    if (pw.next.length < 8) {
      return flash("New password must be at least 8 characters.", "error");
    }
    if (pw.next !== pw.confirm) {
      return flash("New passwords do not match.", "error");
    }
    setBusyAction("password");
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: profile.id,
          currentPassword: pw.current,
          newPassword: pw.next,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Could not change your password.");
      setPw({ current: "", next: "", confirm: "" });
      setShowPasswordForm(false);
      flash("Password changed.");
    } catch (err) {
      flash(err.message || "Could not change your password.", "error");
    } finally {
      setBusyAction(null);
    }
  }

  async function deleteAccount() {
    if (!profile?.id) return;
    setBusyAction("delete");
    try {
      const res = await fetch(`${API_BASE_URL}/api/profile/${profile.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Could not delete your account.");
      localStorage.removeItem("profile");
      window.location.reload();
    } catch (err) {
      flash(err.message || "Could not delete your account.", "error");
      setConfirmDelete(false);
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={onBack}>
          ← Back
        </button>
        <h1 className={styles.title}>Settings</h1>
      </div>

      <div className={styles.content}>
        <div className={styles.tabs}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className={styles.tabIcon}>{tab.icon}</span>
              <span className={styles.tabLabel}>{tab.label}</span>
            </button>
          ))}
        </div>

        {status && (
          <p
            role="status"
            style={{
              margin: "12px 0 0",
              fontSize: 13,
              fontWeight: 600,
              color: status.tone === "error" ? "#b91c1c" : "#15803d",
            }}
          >
            {status.message}
          </p>
        )}

        <div className={styles.tabContent}>
          {activeTab === "general" && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>General Settings</h2>

              <div className={styles.settingCard}>
                <div className={styles.settingInfo}>
                  <h3 className={styles.settingName}>Language</h3>
                  <p className={styles.settingDescription}>
                    Choose your preferred language
                  </p>
                </div>
                <select
                  className={styles.select}
                  value={settings.language}
                  disabled={saving}
                  onChange={(e) => update("language", e.target.value)}
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                </select>
              </div>

              <div className={styles.settingCard}>
                <div className={styles.settingInfo}>
                  <h3 className={styles.settingName}>Currency</h3>
                  <p className={styles.settingDescription}>
                    Used as the default on new invoices
                  </p>
                </div>
                <select
                  className={styles.select}
                  value={settings.currency}
                  disabled={saving}
                  onChange={(e) => update("currency", e.target.value)}
                >
                  <option value="NGN">Nigerian Naira (₦)</option>
                  <option value="USD">US Dollar ($)</option>
                  <option value="EUR">Euro (€)</option>
                  <option value="GBP">British Pound (£)</option>
                </select>
              </div>

              <div className={styles.settingCard}>
                <div className={styles.settingInfo}>
                  <h3 className={styles.settingName}>Timezone</h3>
                  <p className={styles.settingDescription}>Your local timezone</p>
                </div>
                <select
                  className={styles.select}
                  value={settings.timezone}
                  disabled={saving}
                  onChange={(e) => update("timezone", e.target.value)}
                >
                  <option value="Africa/Lagos">West Africa Time</option>
                  <option value="UTC">UTC</option>
                  <option value="Europe/London">London</option>
                  <option value="America/New_York">New York</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Notification Preferences</h2>

              {[
                {
                  key: "emailNotifications",
                  name: "Email Notifications",
                  desc: "Receive invoice updates via email. Turning this off stops all notification emails.",
                },
                {
                  key: "invoiceReminders",
                  name: "Invoice Reminders",
                  desc: "Get reminded about unpaid invoices",
                },
                {
                  key: "negotiationAlerts",
                  name: "Negotiation Alerts",
                  desc: "Emails when a counter-offer is made, accepted or declined",
                },
              ].map((row) => (
                <div className={styles.settingCard} key={row.key}>
                  <div className={styles.settingInfo}>
                    <h3 className={styles.settingName}>{row.name}</h3>
                    <p className={styles.settingDescription}>{row.desc}</p>
                  </div>
                  <label className={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={settings[row.key] !== false}
                      disabled={
                        saving ||
                        // The master switch governs the other two, so they are
                        // not independently settable while it is off.
                        (row.key !== "emailNotifications" &&
                          settings.emailNotifications === false)
                      }
                      onChange={(e) => update(row.key, e.target.checked)}
                    />
                    <span className={styles.toggleSlider}></span>
                  </label>
                </div>
              ))}

              <p className={styles.settingDescription}>
                In-app notifications are always recorded — these control email
                delivery only.
              </p>
            </div>
          )}

          {activeTab === "privacy" && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Privacy & Security</h2>

              <div className={styles.settingCard}>
                <div className={styles.settingInfo}>
                  <h3 className={styles.settingName}>Two-Factor Authentication</h3>
                  <p className={styles.settingDescription}>
                    Not available yet — accounts are secured by password and
                    email reset.
                  </p>
                </div>
                {/* Left visibly unavailable rather than looking clickable and
                    doing nothing when pressed. */}
                <button className={styles.enableButton} disabled title="Coming soon">
                  Coming soon
                </button>
              </div>

              <div className={styles.settingCard}>
                <div className={styles.settingInfo}>
                  <h3 className={styles.settingName}>Change Password</h3>
                  <p className={styles.settingDescription}>
                    Update your password regularly
                  </p>
                  {showPasswordForm && (
                    <div
                      style={{
                        display: "grid",
                        gap: 8,
                        marginTop: 12,
                        maxWidth: 320,
                      }}
                    >
                      {[
                        ["current", "Current password"],
                        ["next", "New password"],
                        ["confirm", "Confirm new password"],
                      ].map(([key, label]) => (
                        <input
                          key={key}
                          type="password"
                          placeholder={label}
                          aria-label={label}
                          autoComplete={
                            key === "current" ? "current-password" : "new-password"
                          }
                          value={pw[key]}
                          onChange={(e) =>
                            setPw((p) => ({ ...p, [key]: e.target.value }))
                          }
                          style={{
                            padding: "8px 10px",
                            border: "1px solid #e2e8f0",
                            borderRadius: 8,
                            fontSize: 14,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                {showPasswordForm ? (
                  <span style={{ display: "flex", gap: 8 }}>
                    <button
                      className={styles.actionButton}
                      onClick={() => {
                        setShowPasswordForm(false);
                        setPw({ current: "", next: "", confirm: "" });
                      }}
                      disabled={busyAction === "password"}
                    >
                      Cancel
                    </button>
                    <button
                      className={styles.enableButton}
                      onClick={changePassword}
                      disabled={busyAction === "password"}
                    >
                      {busyAction === "password" ? "Saving…" : "Save"}
                    </button>
                  </span>
                ) : (
                  <button
                    className={styles.actionButton}
                    onClick={() => setShowPasswordForm(true)}
                  >
                    Change
                  </button>
                )}
              </div>

              <div className={styles.settingCard}>
                <div className={styles.settingInfo}>
                  <h3 className={styles.settingName}>Data Export</h3>
                  <p className={styles.settingDescription}>
                    Download your profile and invoices as JSON
                  </p>
                </div>
                <button
                  className={styles.actionButton}
                  onClick={exportData}
                  disabled={busyAction === "export"}
                >
                  {busyAction === "export" ? "Exporting…" : "Export"}
                </button>
              </div>

              <div className={styles.settingCardDanger}>
                <div className={styles.settingInfo}>
                  <h3 className={styles.settingNameDanger}>Delete Account</h3>
                  <p className={styles.settingDescriptionDanger}>
                    {confirmDelete
                      ? "This permanently deletes your account and invoices. This cannot be undone."
                      : "Permanently delete your account and all data"}
                  </p>
                </div>
                {/* Two steps: deleting an account is irreversible, so it is not
                    one stray click away. */}
                {confirmDelete ? (
                  <span style={{ display: "flex", gap: 8 }}>
                    <button
                      className={styles.actionButton}
                      onClick={() => setConfirmDelete(false)}
                      disabled={busyAction === "delete"}
                    >
                      Cancel
                    </button>
                    <button
                      className={styles.dangerButton}
                      onClick={deleteAccount}
                      disabled={busyAction === "delete"}
                    >
                      {busyAction === "delete" ? "Deleting…" : "Confirm"}
                    </button>
                  </span>
                ) : (
                  <button
                    className={styles.dangerButton}
                    onClick={() => setConfirmDelete(true)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === "help" && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Help & Tutorials</h2>

              <div className={styles.helpCard}>
                <div className={styles.helpIcon}>🎓</div>
                <div className={styles.helpInfo}>
                  <h3 className={styles.helpTitle}>Interactive Tutorial</h3>
                  <p className={styles.helpDescription}>
                    Retake the guided tour to learn how to use sabiquot. Perfect
                    for new users or if you need a refresher.
                  </p>
                </div>
                <button
                  className={styles.primaryButton}
                  onClick={onStartTutorial || handleRetakeTour}
                >
                  Start Tutorial →
                </button>
              </div>

              <div className={styles.settingCard}>
                <div className={styles.settingInfo}>
                  <h3 className={styles.settingName}>Help Center</h3>
                  <p className={styles.settingDescription}>
                    Browse articles and guides
                  </p>
                </div>
                <a
                  className={styles.actionButton}
                  href={HELP_CENTRE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Visit
                </a>
              </div>

              <div className={styles.settingCard}>
                <div className={styles.settingInfo}>
                  <h3 className={styles.settingName}>Video Tutorials</h3>
                  <p className={styles.settingDescription}>
                    Watch step-by-step videos
                  </p>
                </div>
                <a
                  className={styles.actionButton}
                  href={VIDEO_TUTORIALS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Watch
                </a>
              </div>

              <div className={styles.settingCard}>
                <div className={styles.settingInfo}>
                  <h3 className={styles.settingName}>Contact Support</h3>
                  <p className={styles.settingDescription}>
                    Email our team at {SUPPORT_EMAIL}
                  </p>
                </div>
                <a
                  className={styles.actionButton}
                  href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
                    "sabiquot support request",
                  )}`}
                >
                  Contact
                </a>
              </div>

              <div className={styles.versionInfo}>
                <p>
                  <strong>Version:</strong> 2.1.0
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
