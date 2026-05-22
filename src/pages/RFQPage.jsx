import { useState, useEffect } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export default function RFQPage({ profile, currentRfqId }) {
  const [submittedQuotes, setSubmittedQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(
      `${API_BASE_URL}/api/invoices/by-profile/${encodeURIComponent(profile.id)}`,
    )
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load quotes.");
        return r.json();
      })
      .then((data) => {
        const all = data.invoices || [];
        setSubmittedQuotes(
          all.filter((inv) => inv.status === "quote_submitted"),
        );
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load quotes.");
        setLoading(false);
      });
  }, [profile?.id]);

  function openInvoice(id) {
    window.location.href = `/?id=${id}`;
  }

  function formatAmount(amount, currency) {
    if (amount === null || amount === undefined) return "—";
    try {
      return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: currency || "NGN",
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${currency || ""} ${amount}`;
    }
  }

  return (
    <div style={s.page}>
      <h1 style={s.pageTitle}>RFQ</h1>
      <p style={s.subtitle}>
        Request for Quotation — respond to procurement requests from buyers.
      </p>

      {currentRfqId && (
        <div style={s.activeRfq}>
          <div style={s.rfqIcon}>📋</div>
          <div>
            <p style={s.rfqTitle}>Active RFQ in progress</p>
            <p style={s.rfqId}>RFQ ID: {currentRfqId}</p>
            <p style={s.rfqHint}>
              Fill in your quote in the Builder tab, then click{" "}
              <strong>Submit Quote</strong> to send it back.
            </p>
          </div>
        </div>
      )}

      {!profile && (
        <div style={s.empty}>Sign in to view your RFQ responses.</div>
      )}

      {!currentRfqId && (
        <div style={s.howto}>
          <h3 style={s.howtoTitle}>How it works</h3>
          <ol style={s.howtoList}>
            <li>
              A buyer sends you a WhatsApp link from BuildOS with an RFQ request
            </li>
            <li>Open the link — your quote form loads automatically</li>
            <li>
              Fill in your prices and details in the <strong>Builder</strong>{" "}
              tab
            </li>
            <li>
              Click <strong>Submit Quote</strong> to send it back to the buyer
            </li>
          </ol>
        </div>
      )}

      {profile && !loading && submittedQuotes.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <h2 style={s.sectionTitle}>Submitted Quotes</h2>
          <div style={s.card}>
            <div style={{ overflowX: "auto" }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {["Invoice #", "Total", "Date", ""].map((col) => (
                      <th key={col} style={s.th}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {submittedQuotes.map((inv) => (
                    <tr key={inv.id} style={s.row}>
                      <td style={s.td}>{inv.invoice_number || "—"}</td>
                      <td style={s.td}>
                        {formatAmount(inv.total, inv.currency)}
                      </td>
                      <td style={s.td}>
                        {inv.created_at
                          ? new Date(inv.created_at).toLocaleDateString()
                          : "—"}
                      </td>
                      <td style={s.td}>
                        <span style={s.submittedBadge}>Quote Submitted</span>
                        <button
                          onClick={() => openInvoice(inv.id)}
                          style={{ ...s.viewBtn, marginLeft: 8 }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {profile && loading && <p style={s.muted}>Loading…</p>}
      {profile && error && (
        <p style={{ color: "#dc2626", fontSize: 14 }}>{error}</p>
      )}
    </div>
  );
}

const s = {
  page: {
    maxWidth: 960,
    margin: "0 auto",
    padding: "32px 20px 60px",
    fontFamily: "var(--font-body, system-ui, sans-serif)",
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: "var(--color-accent, #0f172a)",
    margin: "0 0 8px 0",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    margin: "0 0 24px 0",
  },
  activeRfq: {
    display: "flex",
    gap: 16,
    alignItems: "flex-start",
    background: "#eff6ff",
    border: "1.5px solid #bfdbfe",
    borderRadius: 12,
    padding: "20px 24px",
    marginBottom: 24,
  },
  rfqIcon: {
    fontSize: 28,
    lineHeight: 1,
  },
  rfqTitle: {
    fontWeight: 700,
    fontSize: 15,
    color: "#1e40af",
    margin: "0 0 4px 0",
  },
  rfqId: {
    fontSize: 12,
    color: "#3b82f6",
    fontFamily: "monospace",
    margin: "0 0 8px 0",
  },
  rfqHint: {
    fontSize: 13,
    color: "#1e3a8a",
    margin: 0,
  },
  howto: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "20px 24px",
  },
  howtoTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#0f172a",
    margin: "0 0 12px 0",
  },
  howtoList: {
    margin: 0,
    paddingLeft: 20,
    color: "#475569",
    fontSize: 14,
    lineHeight: 1.9,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#0f172a",
    margin: "0 0 14px 0",
  },
  card: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    overflow: "hidden",
  },
  muted: {
    color: "#94a3b8",
    fontSize: 14,
    margin: 0,
  },
  empty: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "40px 24px",
    textAlign: "center",
    color: "#64748b",
    fontSize: 14,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 14,
  },
  th: {
    textAlign: "left",
    padding: "12px 16px",
    fontWeight: 600,
    color: "#64748b",
    background: "#f8fafc",
    borderBottom: "2px solid #e2e8f0",
    whiteSpace: "nowrap",
  },
  row: {
    borderBottom: "1px solid #f1f5f9",
  },
  td: {
    padding: "11px 16px",
    color: "#1c1c1e",
    verticalAlign: "middle",
  },
  submittedBadge: {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    background: "#dbeafe",
    color: "#1e40af",
  },
  viewBtn: {
    background: "var(--color-accent, #0f172a)",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "5px 14px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
};
