import { useState, useEffect } from "react";
import { MessageSquare, CheckCircle2, XCircle, Clock, Eye } from "lucide-react";
import styles from "./NegotiationsPage.module.css";

export default function NegotiationsPage({ profile }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Mock data since backend is commented out
  const MOCK_NEGOTIATIONS = [
    {
      id: 1,
      invoice_number: "INV-2026-003",
      client_email: "accounts@business.com",
      sender_company_name: "Consulting Pro",
      total: 500000,
      currency: "NGN",
      status: "negotiating",
      created_at: "2026-01-13T09:15:00Z",
      payload: {
        clientName: "Bob Johnson",
        clientCompanyName: "Enterprise Corp",
      },
    },
    {
      id: 4,
      invoice_number: "INV-2026-004",
      client_email: "finance@corp.com",
      sender_company_name: "Services Ltd",
      total: 350000,
      currency: "NGN",
      status: "accepted",
      created_at: "2026-01-12T11:30:00Z",
      payload: {
        clientName: "Alice Williams",
        clientCompanyName: "Global Tech",
      },
    },
    {
      id: 5,
      invoice_number: "INV-2026-005",
      client_email: "billing@startup.com",
      sender_company_name: "Freelancer",
      total: 120000,
      currency: "NGN",
      status: "rejected",
      created_at: "2026-01-11T16:45:00Z",
      payload: {
        clientName: "Charlie Brown",
        clientCompanyName: "Startup Inc",
      },
    },
  ];

  useEffect(() => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    // Simulate loading negotiations (backend is commented out)
    setLoading(true);
    setTimeout(() => {
      setInvoices(MOCK_NEGOTIATIONS);
      setLoading(false);
    }, 800);
  }, [profile?.id]);

  function openInvoice(id) {
    // Navigate to negotiation details page
    window.location.href = `/negotiation/${id}`;
  }

  function formatAmount(amount, currency) {
    if (amount === null || amount === undefined) return "—";
    try {
      return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: currency || "NGN",
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${currency || ""} ${amount.toLocaleString()}`;
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("en-NG", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  }

  const statusConfig = {
    negotiating: { label: "Negotiating", color: "#fef9c3", textColor: "#854d0e", icon: Clock },
    accepted: { label: "Accepted", color: "#d1fae5", textColor: "#065f46", icon: CheckCircle2 },
    rejected: { label: "Rejected", color: "#fee2e2", textColor: "#991b1b", icon: XCircle },
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>
            <MessageSquare className={styles.pageIcon} />
            Negotiations
          </h1>
          <p className={styles.pageSubtitle}>
            Manage invoice negotiations and counter-offers
          </p>
        </div>
      </div>

      {!profile && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🔐</div>
          <h3 className={styles.emptyTitle}>Sign in to view negotiations</h3>
          <p className={styles.emptyText}>
            Sign in to access your invoice negotiations and counter-offers.
          </p>
        </div>
      )}

      {profile && loading && (
        <div className={styles.loadingState}>
          <div className={styles.loader}></div>
          <p>Loading negotiations...</p>
        </div>
      )}

      {profile && error && (
        <div className={styles.errorState}>
          <div className={styles.errorIcon}>⚠️</div>
          <p className={styles.errorText}>{error}</p>
        </div>
      )}

      {profile && !loading && !error && invoices.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>💬</div>
          <h3 className={styles.emptyTitle}>No negotiations yet</h3>
          <p className={styles.emptyText}>
            When you have invoices in negotiation, they will appear here.
          </p>
        </div>
      )}

      {profile && !loading && invoices.length > 0 && (
        <div className={styles.cardsGrid}>
          {invoices.map((inv) => {
            const status = statusConfig[inv.status];
            const StatusIcon = status?.icon || Clock;
            return (
              <div key={inv.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardHeaderLeft}>
                    <span className={styles.invoiceNumber}>
                      {inv.invoice_number}
                    </span>
                    {status && (
                      <span
                        className={styles.statusBadge}
                        style={{ background: status.color, color: status.textColor }}
                      >
                        <StatusIcon size={14} />
                        {status.label}
                      </span>
                    )}
                  </div>
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Client:</span>
                    <span className={styles.infoValue}>
                      {inv.payload?.clientName || inv.client_email || "—"}
                    </span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Company:</span>
                    <span className={styles.infoValue}>
                      {inv.payload?.clientCompanyName || "—"}
                    </span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Amount:</span>
                    <span className={styles.infoValueAmount}>
                      {formatAmount(inv.total, inv.currency)}
                    </span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Date:</span>
                    <span className={styles.infoValue}>
                      {formatDate(inv.created_at)}
                    </span>
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <button
                    className={styles.viewButton}
                    onClick={() => openInvoice(inv.id)}
                  >
                    <Eye size={16} />
                    View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
