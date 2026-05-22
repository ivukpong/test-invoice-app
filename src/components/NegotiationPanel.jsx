import { useState, useEffect, useRef } from "react";

const API = import.meta.env.VITE_API_BASE_URL || "";

const STATUS_COLORS = {
  pending: { bg: "#fef9c3", text: "#854d0e", border: "#fef08a" },
  accepted: { bg: "#dcfce7", text: "#166534", border: "#86efac" },
  rejected: { bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" },
};

export default function NegotiationPanel({ invoiceId, profileId, isOwner }) {
  const [threads, setThreads] = useState([]);
  const [offer, setOffer] = useState("");
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const intervalRef = useRef(null);

  function fetchThreads() {
    if (!invoiceId) return;
    fetch(`${API}/api/negotiate/${invoiceId}`)
      .then((r) => r.json())
      .then((data) => setThreads(Array.isArray(data) ? data : []))
      .catch(() => {});
  }

  useEffect(() => {
    fetchThreads();
    intervalRef.current = setInterval(fetchThreads, 5000);
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  async function submitOffer() {
    const amount = parseFloat(offer);
    if (isNaN(amount) || amount <= 0) {
      alert("Enter a valid amount");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/negotiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: invoiceId,
          sender_profile_id: profileId,
          proposed_total: parseFloat(offer),
          message: msg,
        }),
      });
      const newThread = await res.json();
      setThreads((prev) => [...prev, newThread]);
      setOffer("");
      setMsg("");
    } finally {
      setSubmitting(false);
    }
  }

  async function respond(id, action) {
    await fetch(`${API}/api/negotiate/${id}/${action}`, { method: "PATCH" });
    setThreads((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: action === "accept" ? "accepted" : "rejected" }
          : t,
      ),
    );
  }

  if (!invoiceId) return null;

  return (
    <div id="negotiation-section" style={s.panel}>
      <div style={s.panelHeader}>
        <h3 style={s.panelTitle}>Negotiation</h3>
        <span style={s.liveIndicator}>
          <span style={s.liveDot} /> Live
        </span>
      </div>

      <div style={s.thread}>
        {threads.length === 0 && (
          <p style={s.empty}>
            No offers yet. Be the first to submit a counter-offer.
          </p>
        )}
        {threads.map((t) => {
          const colors = STATUS_COLORS[t.status] || STATUS_COLORS.pending;
          return (
            <div key={t.id} style={s.offerCard}>
              <div style={s.offerTop}>
                <div>
                  <span style={s.offerName}>
                    {t.profiles?.name ?? "Anonymous"}
                  </span>
                  <span
                    style={{
                      ...s.statusBadge,
                      background: colors.bg,
                      color: colors.text,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    {t.status}
                  </span>
                </div>
                {t.created_at && (
                  <span style={s.offerTime}>
                    {new Date(t.created_at).toLocaleString([], {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                )}
              </div>
              <p style={s.offerAmount}>
                Proposed:{" "}
                <strong>
                  {isNaN(Number(t.proposed_total))
                    ? "—"
                    : Number(t.proposed_total).toLocaleString()}
                </strong>
              </p>
              {t.message && <p style={s.offerMsg}>{t.message}</p>}
              {isOwner && t.status === "pending" && (
                <div style={s.offerActions}>
                  <button
                    style={s.acceptBtn}
                    onClick={() => respond(t.id, "accept")}
                  >
                    Accept
                  </button>
                  <button
                    style={s.rejectBtn}
                    onClick={() => respond(t.id, "reject")}
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!isOwner && profileId && (
        <div style={s.counterForm}>
          <h4 style={s.formTitle}>Submit counter-offer</h4>
          <input
            type="number"
            placeholder="Your proposed total"
            value={offer}
            onChange={(e) => setOffer(e.target.value)}
            style={s.input}
          />
          <textarea
            placeholder="Message (optional)"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            rows={3}
            style={{ ...s.input, resize: "vertical", marginTop: 8 }}
          />
          <button
            onClick={submitOffer}
            disabled={!offer || submitting}
            style={s.sendBtn}
          >
            {submitting ? "Sending…" : "Send offer"}
          </button>
        </div>
      )}
      {!isOwner && !profileId && (
        <p style={{ padding: "12px 16px", color: "#6b7280", fontSize: 14 }}>
          Sign in to submit a counter-offer.
        </p>
      )}
    </div>
  );
}

const s = {
  panel: {
    background: "var(--color-surface, #ffffff)",
    borderRadius: 14,
    boxShadow: "var(--shadow-soft, 0 18px 40px rgba(15,23,42,0.06))",
    padding: 24,
    marginTop: 24,
    fontFamily: "var(--font-family-base, 'Futura', Avenir, Inter, sans-serif)",
  },
  panelHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  panelTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: "var(--color-text, #1c1c1e)",
  },
  liveIndicator: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontSize: 11,
    fontWeight: 600,
    color: "#16a34a",
    background: "#dcfce7",
    borderRadius: 20,
    padding: "3px 10px",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#16a34a",
    display: "inline-block",
    animation: "pulse 1.5s infinite",
  },
  thread: { display: "flex", flexDirection: "column", gap: 12 },
  empty: { fontSize: 13, color: "var(--color-grey-dark, #6e6e73)", margin: 0 },
  offerCard: {
    background: "var(--color-bg, #f7f7f5)",
    border: "1px solid var(--color-grey-light, #ececeb)",
    borderRadius: 10,
    padding: "14px 16px",
  },
  offerTop: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
    flexWrap: "wrap",
    gap: 6,
  },
  offerName: {
    fontSize: 14,
    fontWeight: 700,
    color: "var(--color-text, #1c1c1e)",
    marginRight: 8,
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: 700,
    borderRadius: 20,
    padding: "2px 9px",
    textTransform: "capitalize",
    letterSpacing: "0.3px",
  },
  offerTime: { fontSize: 11, color: "var(--color-grey-dark, #6e6e73)" },
  offerAmount: {
    margin: "0 0 4px",
    fontSize: 14,
    color: "var(--color-text, #1c1c1e)",
  },
  offerMsg: {
    margin: 0,
    fontSize: 13,
    color: "var(--color-grey-dark, #6e6e73)",
    fontStyle: "italic",
  },
  offerActions: { display: "flex", gap: 8, marginTop: 12 },
  acceptBtn: {
    padding: "7px 18px",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
  },
  rejectBtn: {
    padding: "7px 18px",
    background: "transparent",
    color: "#b91c1c",
    border: "1.5px solid #fca5a5",
    borderRadius: 6,
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
  },
  counterForm: { marginTop: 20 },
  formTitle: {
    margin: "0 0 12px",
    fontSize: 14,
    fontWeight: 700,
    color: "var(--color-text, #1c1c1e)",
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
    display: "block",
  },
  sendBtn: {
    marginTop: 10,
    padding: "10px 24px",
    background: "var(--color-accent, #0f172a)",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
  },
};
