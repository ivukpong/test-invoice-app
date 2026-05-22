import { useState } from "react";
import styles from "./SettingsPage.module.css";

export default function SettingsPage({ profile, onBack, onRetakeTour, onStartTutorial }) {
  const [activeTab, setActiveTab] = useState("general");

  const tabs = [
    { id: "general", label: "General", icon: "⚙️" },
    { id: "notifications", label: "Notifications", icon: "🔔" },
    { id: "privacy", label: "Privacy", icon: "🔒" },
    { id: "help", label: "Help & Tutorials", icon: "❓" },
  ];

  const handleRetakeTour = () => {
    localStorage.removeItem("onboardingComplete");
    onRetakeTour();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={onBack}>
          ← Back
        </button>
        <h1 className={styles.title}>Settings</h1>
      </div>

      <div className={styles.content}>
        {/* Tabs */}
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

        {/* Tab Content */}
        <div className={styles.tabContent}>
          {activeTab === "general" && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>General Settings</h2>
              
              <div className={styles.settingCard}>
                <div className={styles.settingInfo}>
                  <h3 className={styles.settingName}>Language</h3>
                  <p className={styles.settingDescription}>Choose your preferred language</p>
                </div>
                <select className={styles.select} defaultValue="en">
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                </select>
              </div>

              <div className={styles.settingCard}>
                <div className={styles.settingInfo}>
                  <h3 className={styles.settingName}>Currency</h3>
                  <p className={styles.settingDescription}>Default currency for invoices</p>
                </div>
                <select className={styles.select} defaultValue="NGN">
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
                <select className={styles.select} defaultValue="Africa/Lagos">
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
              
              <div className={styles.settingCard}>
                <div className={styles.settingInfo}>
                  <h3 className={styles.settingName}>Email Notifications</h3>
                  <p className={styles.settingDescription}>Receive invoice updates via email</p>
                </div>
                <label className={styles.toggle}>
                  <input type="checkbox" defaultChecked />
                  <span className={styles.toggleSlider}></span>
                </label>
              </div>

              <div className={styles.settingCard}>
                <div className={styles.settingInfo}>
                  <h3 className={styles.settingName}>Invoice Reminders</h3>
                  <p className={styles.settingDescription}>Get reminded about unpaid invoices</p>
                </div>
                <label className={styles.toggle}>
                  <input type="checkbox" defaultChecked />
                  <span className={styles.toggleSlider}></span>
                </label>
              </div>

              <div className={styles.settingCard}>
                <div className={styles.settingInfo}>
                  <h3 className={styles.settingName}>Negotiation Alerts</h3>
                  <p className={styles.settingDescription}>Notifications for negotiation updates</p>
                </div>
                <label className={styles.toggle}>
                  <input type="checkbox" defaultChecked />
                  <span className={styles.toggleSlider}></span>
                </label>
              </div>
            </div>
          )}

          {activeTab === "privacy" && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Privacy & Security</h2>
              
              <div className={styles.settingCard}>
                <div className={styles.settingInfo}>
                  <h3 className={styles.settingName}>Two-Factor Authentication</h3>
                  <p className={styles.settingDescription}>Add an extra layer of security</p>
                </div>
                <button className={styles.enableButton}>Enable</button>
              </div>

              <div className={styles.settingCard}>
                <div className={styles.settingInfo}>
                  <h3 className={styles.settingName}>Change Password</h3>
                  <p className={styles.settingDescription}>Update your password regularly</p>
                </div>
                <button className={styles.actionButton}>Change</button>
              </div>

              <div className={styles.settingCard}>
                <div className={styles.settingInfo}>
                  <h3 className={styles.settingName}>Data Export</h3>
                  <p className={styles.settingDescription}>Download all your invoice data</p>
                </div>
                <button className={styles.actionButton}>Export</button>
              </div>

              <div className={styles.settingCardDanger}>
                <div className={styles.settingInfo}>
                  <h3 className={styles.settingNameDanger}>Delete Account</h3>
                  <p className={styles.settingDescriptionDanger}>Permanently delete your account and all data</p>
                </div>
                <button className={styles.dangerButton}>Delete</button>
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
                    Retake the guided tour to learn how to use Free Invoice. 
                    Perfect for new users or if you need a refresher.
                  </p>
                </div>
                <button className={styles.primaryButton} onClick={onStartTutorial}>
                  Start Tutorial →
                </button>
              </div>

              <div className={styles.settingCard}>
                <div className={styles.settingInfo}>
                  <h3 className={styles.settingName}>Help Center</h3>
                  <p className={styles.settingDescription}>Browse articles and guides</p>
                </div>
                <button className={styles.actionButton}>Visit</button>
              </div>

              <div className={styles.settingCard}>
                <div className={styles.settingInfo}>
                  <h3 className={styles.settingName}>Video Tutorials</h3>
                  <p className={styles.settingDescription}>Watch step-by-step videos</p>
                </div>
                <button className={styles.actionButton}>Watch</button>
              </div>

              <div className={styles.settingCard}>
                <div className={styles.settingInfo}>
                  <h3 className={styles.settingName}>Contact Support</h3>
                  <p className={styles.settingDescription}>Get help from our team</p>
                </div>
                <button className={styles.actionButton}>Contact</button>
              </div>

              <div className={styles.versionInfo}>
                <p><strong>Version:</strong> 2.1.0</p>
                <p><strong>Last Updated:</strong> May 2026</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
