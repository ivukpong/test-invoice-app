import { useState, useEffect } from "react";
import styles from "./Homepage.module.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export default function Homepage({
  onCreateInvoice,
  onViewInvoices,
  onViewRequests,
  profile,
}) {
  const [stats, setStats] = useState({
    invoiceCount: 0,
    draftCount: 0,
    pendingCount: 0,
  });

  useEffect(() => {
    if (!profile?.id) return;
    fetch(`${API_BASE_URL}/api/profile/${profile.id}/stats`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => setStats(data))
      .catch(() => {});
  }, [profile?.id]);

  return (
    <div className={styles.container}>
      <div className={styles.welcomeSection}>
        <h1 className={styles.welcomeTitle}>Welcome to sabiquot</h1>
        <p className={styles.welcomeSubtitle}>
          Create professional invoices in minutes — no experience needed
        </p>

        {profile && (
          <div className={styles.quickStats}>
            <div className={styles.statCard}>
              <span className={styles.statNumber}>
                {stats.invoiceCount ?? 0}
              </span>
              <span className={styles.statLabel}>Total Invoices</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statNumber}>{stats.draftCount ?? 0}</span>
              <span className={styles.statLabel}>Drafts</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statNumber}>
                {stats.pendingCount ?? 0}
              </span>
              <span className={styles.statLabel}>Pending</span>
            </div>
          </div>
        )}
      </div>

      <div className={styles.quickActions}>
        <h3 className={styles.quickActionsTitle}>Quick Actions</h3>
        <div className={styles.actionButtons}>
          <button className={styles.actionButton} onClick={onCreateInvoice}>
            <span className={styles.actionIcon}>➕</span>
            <span>Create Invoice</span>
          </button>
          <button className={styles.actionButton} onClick={onViewInvoices}>
            <span className={styles.actionIcon}>📋</span>
            <span>View Invoices</span>
          </button>
          {profile && (
            <button className={styles.actionButton} onClick={onViewRequests}>
              <span className={styles.actionIcon}>📨</span>
              <span>View Requests</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
