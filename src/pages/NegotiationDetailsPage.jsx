import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Edit2,
  Eye,
  FileText,
  Download,
} from "lucide-react";
import {
  downloadInvoicePdf,
  generateInvoicePdfDataUrl,
} from "../utils/invoiceGenerator";
import styles from "./NegotiationDetailsPage.module.css";

import { API_BASE_URL } from "../utils/apiClient";

function formatMoney(amount, currency = "NGN") {
  const n = Number(amount) || 0;
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: currency || "NGN",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency || "NGN"} ${n.toLocaleString()}`;
  }
}

export default function NegotiationDetailsPage({ profile, onNavigate }) {
  const [negotiationId, setNegotiationId] = useState(null);
  const [negotiation, setNegotiation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [itemNotes, setItemNotes] = useState({});
  const [editableItems, setEditableItems] = useState([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef(null);

  const money = (n) => formatMoney(n, negotiation?.currency);

  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/negotiation\/(\d+)$/);
    if (match) {
      setNegotiationId(match[1]);
    }
  }, []);

  // The page is opened with an invoice id (/negotiation/:invoiceId), so the
  // invoice carries client, sender, items, currency and totals while the
  // negotiations table holds the counter-offer thread (buyer counters pushed
  // from BuildOS arrive here with a null sender_profile_id).
  const loadData = () => {
    if (!negotiationId) return;
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE_URL}/api/invoices/${negotiationId}`).then((r) =>
        r.ok ? r.json() : Promise.reject(r.status),
      ),
      fetch(`${API_BASE_URL}/api/negotiate/${negotiationId}`).then((r) =>
        r.ok ? r.json() : [],
      ),
    ])
      .then(([inv, rounds]) => {
        const roundList = Array.isArray(rounds) ? rounds : [];
        const payload = inv?.payload || {};
        const items = (payload.items || []).map((it, idx) => {
          const quantity = Number(it.quantity ?? it.qty) || 0;
          const unitPrice =
            Number(it.unitPrice ?? it.rate ?? it.unit_price) || 0;
          const amount = Number(it.amount ?? it.total) || quantity * unitPrice;
          return {
            id: it.id ?? idx,
            name: it.description || it.name || it.material || `Item ${idx + 1}`,
            quantity,
            unitPrice,
            originalPrice: amount,
          };
        });
        const lastRound = roundList[roundList.length - 1] || null;
        const originalAmount =
          Number(inv?.total) || items.reduce((s, i) => s + i.originalPrice, 0);
        setNegotiation({
          invoiceId: inv?.id,
          invoiceNumber: inv?.invoice_number || `#${negotiationId}`,
          createdAt: inv?.created_at,
          currency: inv?.currency || payload.currency || "NGN",
          status: inv?.status,
          originalAmount,
          currentOffer: lastRound
            ? Number(lastRound.proposed_total) || originalAmount
            : originalAmount,
          client: {
            name: payload.clientName || inv?.client_email || "Buyer",
            company: payload.clientCompanyName || "",
            email: payload.clientEmail || inv?.client_email || "",
          },
          sender: {
            name:
              payload.companyName ||
              inv?.sender_company_name ||
              profile?.name ||
              "",
            company: payload.companyName || inv?.sender_company_name || "",
            email: payload.companyEmail || profile?.email || "",
            phone: payload.companyPhone || "",
            address: payload.companyAddress || "",
          },
          pendingClientOffer:
            [...roundList]
              .reverse()
              .find(
                (r) =>
                  !r.sender_profile_id &&
                  r.status !== "accepted" &&
                  r.status !== "rejected",
              ) || null,
        });
        setEditableItems(
          items.map((item) => ({
            ...item,
            newUnitPrice: item.unitPrice,
            newTotal: item.quantity * item.unitPrice,
          })),
        );
        setMessages(
          roundList.map((r) => ({
            id: r.id,
            sender_profile_id: r.sender_profile_id,
            sender_name:
              r.profiles?.name || (r.sender_profile_id ? "Supplier" : "Client"),
            content: r.message,
            amount: r.proposed_total,
            created_at: r.created_at,
          })),
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [negotiationId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !negotiationId) return;
    setSendingMessage(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/negotiate/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: Number(negotiationId),
          sender_profile_id: profile?.id,
          proposed_total:
            negotiation?.currentOffer ?? negotiation?.originalAmount ?? 0,
          message: newMessage.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      setNewMessage("");
      loadData();
    } catch {
      // silently ignore send errors
    } finally {
      setSendingMessage(false);
    }
  };

  const handleItemPriceChange = (itemId, field, value) => {
    setEditableItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const newValue =
          field === "newUnitPrice" ? parseFloat(value) || 0 : value;
        const updated = { ...item, [field]: newValue };
        if (field === "newUnitPrice" || field === "quantity") {
          updated.newTotal = updated.quantity * updated.newUnitPrice;
        }
        return updated;
      }),
    );
  };

  const handleItemNoteChange = (itemId, note) => {
    setItemNotes({ ...itemNotes, [itemId]: note });
  };

  const handleCollectiveCounter = async () => {
    const invalidItem = editableItems.find((i) => i.newUnitPrice <= 0);
    if (invalidItem) {
      alert(`Please enter a valid unit price for "${invalidItem.name}"`);
      return;
    }

    const totalNew = editableItems.reduce((sum, i) => sum + i.newTotal, 0);
    if (!confirm(`Submit collective counter offer of ${money(totalNew)}?`))
      return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/negotiate/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: Number(negotiationId),
          sender_profile_id: profile?.id,
          proposed_total: totalNew,
          message: "Collective counter offer",
        }),
      });
      if (!res.ok) throw new Error("Failed to submit counter");
      loadData();
    } catch {
      alert("Could not submit your counter offer. Please try again.");
    }
  };

  const handleAcceptOffer = async () => {
    const offer = negotiation?.pendingClientOffer;
    if (!offer) return;
    if (!confirm(`Accept the client offer of ${money(offer.proposed_total)}?`))
      return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/negotiate/${offer.id}/accept`,
        { method: "PATCH" },
      );
      if (!res.ok) throw new Error();
      loadData();
    } catch {
      alert("Could not accept the offer. Please try again.");
    }
  };

  const handleRejectOffer = async () => {
    const offer = negotiation?.pendingClientOffer;
    if (!offer) return;
    if (!confirm("Reject this offer?")) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/negotiate/${offer.id}/reject`,
        { method: "PATCH" },
      );
      if (!res.ok) throw new Error();
      loadData();
    } catch {
      alert("Could not reject the offer. Please try again.");
    }
  };

  const calculateTotal = () => {
    return editableItems.reduce((sum, item) => sum + item.newTotal, 0);
  };

  if (!negotiation) {
    return (
      <div className={styles.loading}>
        <div className={styles.loader}></div>
        <p>Loading negotiation...</p>
      </div>
    );
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString("en-NG", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDownloadPdf = () => {
    const pdfData = {
      companyName: negotiation.sender.name || profile?.name || "",
      companyAddress: negotiation.sender.address || "",
      companyEmail: negotiation.sender.email || profile?.email || "",
      clientName: negotiation.client.name,
      clientCompanyName: negotiation.client.company,
      invoiceNumber: negotiation.invoiceNumber,
      items: editableItems.map((i) => ({
        description: i.name,
        quantity: i.quantity,
        unitPrice: i.newUnitPrice,
        amount: i.newTotal,
      })),
      subtotal: calculateTotal(),
      total: calculateTotal(),
      currency: negotiation.currency,
      notes: "",
      taxRate: 0,
      tax: 0,
    };
    downloadInvoicePdf("template-1", pdfData);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => onNavigate?.("negotiations")}
        >
          <ArrowLeft size={20} />
          Back
        </button>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>
            Negotiation - {negotiation.invoiceNumber}
          </h1>
          <p className={styles.subtitle}>
            {negotiation.sender.name || "You"} → {negotiation.client.name}
            {negotiation.client.company
              ? ` • ${negotiation.client.company}`
              : ""}
          </p>
        </div>
        <div className={styles.statusBadge}>
          <Clock size={16} />
          Negotiating
        </div>
      </div>

      <div className={styles.content}>
        {/* Left Column - Offer Summary + Items + Builder */}
        <div className={styles.leftColumn}>
          {/* Parties & Invoice details */}
          <div className={styles.offerSummary}>
            <h3 className={styles.cardTitle}>
              <FileText size={20} />
              Details
            </h3>
            <div className={styles.offerRow}>
              <span className={styles.offerLabel}>From (You):</span>
              <span className={styles.offerValue}>
                {negotiation.sender.name || "—"}
                {negotiation.sender.company &&
                negotiation.sender.company !== negotiation.sender.name
                  ? ` • ${negotiation.sender.company}`
                  : ""}
              </span>
            </div>
            {negotiation.sender.email && (
              <div className={styles.offerRow}>
                <span className={styles.offerLabel}>Your Email:</span>
                <span className={styles.offerValue}>
                  {negotiation.sender.email}
                </span>
              </div>
            )}
            <div className={styles.offerRow}>
              <span className={styles.offerLabel}>Client:</span>
              <span className={styles.offerValue}>
                {negotiation.client.name || "—"}
                {negotiation.client.company
                  ? ` • ${negotiation.client.company}`
                  : ""}
              </span>
            </div>
            {negotiation.client.email && (
              <div className={styles.offerRow}>
                <span className={styles.offerLabel}>Client Email:</span>
                <span className={styles.offerValue}>
                  {negotiation.client.email}
                </span>
              </div>
            )}
            <div className={styles.offerRow}>
              <span className={styles.offerLabel}>Invoice #:</span>
              <span className={styles.offerValue}>
                {negotiation.invoiceNumber}
              </span>
            </div>
            <div className={styles.offerRow}>
              <span className={styles.offerLabel}>Currency:</span>
              <span className={styles.offerValue}>{negotiation.currency}</span>
            </div>
          </div>

          {/* Offer Summary */}
          <div className={styles.offerSummary}>
            <h3 className={styles.cardTitle}>
              <FileText size={20} />
              Offer Summary
            </h3>
            <div className={styles.offerRow}>
              <span className={styles.offerLabel}>Original Amount:</span>
              <span className={styles.offerValue}>
                {money(negotiation.originalAmount)}
              </span>
            </div>
            <div className={styles.offerRow}>
              <span className={styles.offerLabel}>Client Offer:</span>
              <span className={styles.offerValueHighlight}>
                {money(negotiation.currentOffer)}
              </span>
            </div>
            <div className={styles.offerRow}>
              <span className={styles.offerLabel}>Your Counter:</span>
              <span className={styles.offerValueHighlight}>
                {money(calculateTotal())}
              </span>
            </div>
            <div className={styles.offerRow}>
              <span className={styles.offerLabel}>
                Difference from Original:
              </span>
              <span className={styles.offerValueNegative}>
                -
                {money(
                  negotiation.originalAmount -
                    Math.min(negotiation.currentOffer, calculateTotal()),
                )}
              </span>
            </div>

            <div className={styles.actionButtons}>
              <button
                className={styles.acceptButton}
                onClick={handleAcceptOffer}
                disabled={!negotiation.pendingClientOffer}
              >
                <CheckCircle2 size={18} />
                Accept Offer
              </button>
              <button
                className={styles.rejectButton}
                onClick={handleRejectOffer}
                disabled={!negotiation.pendingClientOffer}
              >
                <XCircle size={18} />
                Reject
              </button>
            </div>
          </div>

          {/* Invoice Items - Editable */}
          <div className={styles.itemsCard}>
            <h3 className={styles.cardTitle}>
              <Edit2 size={20} />
              Negotiate Items
            </h3>
            <p className={styles.sectionDesc}>
              Adjust quantities and unit prices below, then submit your
              collective counter offer.
            </p>
            {editableItems.map((item) => (
              <div key={item.id} className={styles.itemCard}>
                <div className={styles.itemHeader}>
                  <h4 className={styles.itemName}>{item.name}</h4>
                </div>

                <div className={styles.previousAmountRow}>
                  <span className={styles.previousAmountLabel}>Original:</span>
                  <span className={styles.previousAmountValue}>
                    {money(item.originalPrice)}
                  </span>
                </div>

                <div className={styles.itemEditRow}>
                  <div className={styles.itemEditField}>
                    <label className={styles.itemEditLabel}>Quantity</label>
                    <input
                      type="number"
                      className={styles.itemEditInput}
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemPriceChange(
                          item.id,
                          "quantity",
                          e.target.value,
                        )
                      }
                      min="1"
                    />
                  </div>
                  <div className={styles.itemEditField}>
                    <label className={styles.itemEditLabel}>
                      Unit Price (₦)
                    </label>
                    <input
                      type="number"
                      className={styles.itemEditInput}
                      value={item.newUnitPrice}
                      onChange={(e) =>
                        handleItemPriceChange(
                          item.id,
                          "newUnitPrice",
                          e.target.value,
                        )
                      }
                      min="0"
                      step="100"
                    />
                  </div>
                </div>

                <div className={styles.newTotalRow}>
                  <span className={styles.newTotalLabel}>Your New Total:</span>
                  <span className={styles.newTotalValue}>
                    {money(item.newTotal)}
                  </span>
                </div>

                <div className={styles.itemNoteSection}>
                  <label className={styles.itemNoteLabel}>
                    <Edit2 size={14} />
                    Notes
                  </label>
                  <textarea
                    className={styles.itemNoteInput}
                    value={itemNotes[item.id] || ""}
                    onChange={(e) =>
                      handleItemNoteChange(item.id, e.target.value)
                    }
                    placeholder="Add notes about this item..."
                    rows={2}
                  />
                </div>
              </div>
            ))}

            {/* Collective Submit Button */}
            <div className={styles.collectiveSubmit}>
              <div className={styles.collectiveTotal}>
                <span>Collective Counter Total:</span>
                <strong>{money(calculateTotal())}</strong>
              </div>
              <button
                className={styles.counterButton}
                onClick={handleCollectiveCounter}
              >
                <Send size={18} />
                Submit Collective Counter Offer
              </button>
            </div>
          </div>

          {/* Inline Negotiation Builder */}
          <div className={styles.builderSection}>
            <button
              className={styles.toggleBuilderButton}
              onClick={() => setShowBuilder(!showBuilder)}
            >
              <Eye size={18} />
              {showBuilder
                ? "Hide Negotiation Invoice"
                : "Preview & Edit in Invoice Builder"}
            </button>

            {showBuilder && (
              <div className={styles.builderContent}>
                <div className={styles.builderHeader}>
                  <h4 className={styles.cardTitle}>
                    <FileText size={18} />
                    Negotiation Invoice Preview
                  </h4>
                  <button
                    className={styles.downloadButton}
                    onClick={handleDownloadPdf}
                  >
                    <Download size={16} />
                    Download PDF
                  </button>
                </div>

                {/* Invoice Preview */}
                <div className={styles.builderPreview}>
                  <div className={styles.builderRow}>
                    <div className={styles.builderField}>
                      <label>From</label>
                      <span>{negotiation.sender.name || "—"}</span>
                    </div>
                    <div className={styles.builderField}>
                      <label>Client</label>
                      <span>{negotiation.client.name || "—"}</span>
                    </div>
                    <div className={styles.builderField}>
                      <label>Company</label>
                      <span>{negotiation.client.company || "—"}</span>
                    </div>
                    <div className={styles.builderField}>
                      <label>Invoice #</label>
                      <span>{negotiation.invoiceNumber}</span>
                    </div>
                  </div>

                  <table className={styles.builderTable}>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editableItems.map((item) => (
                        <tr key={item.id}>
                          <td>{item.name}</td>
                          <td>{item.quantity}</td>
                          <td>{money(item.newUnitPrice)}</td>
                          <td>{money(item.newTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3}>
                          <strong>Total</strong>
                        </td>
                        <td>
                          <strong>{money(calculateTotal())}</strong>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Conversation + Timeline */}
        <div className={styles.rightColumn}>
          {/* Conversation */}
          <div className={styles.messagesContainer}>
            <h3 className={styles.sectionTitle}>
              <MessageSquare size={20} />
              Conversation
            </h3>

            <div className={styles.messages}>
              {messages.length === 0 && (
                <p className={styles.messageText}>No messages yet.</p>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`${styles.message} ${msg.sender_profile_id === profile?.id ? styles.messageOwner : styles.messageClient}`}
                >
                  <div className={styles.messageHeader}>
                    <span className={styles.messageFrom}>
                      {msg.sender_profile_id === profile?.id
                        ? "You"
                        : msg.sender_name || "Client"}
                    </span>
                    <span className={styles.messageTime}>
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                  {msg.amount != null && (
                    <div className={styles.offerMessage}>
                      💰 {money(msg.amount)}
                    </div>
                  )}
                  {msg.content && (
                    <p className={styles.messageText}>{msg.content}</p>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className={styles.messageInputContainer}>
              <textarea
                className={styles.messageInput}
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={3}
              />
              <button
                className={styles.sendButton}
                onClick={handleSendMessage}
                disabled={sendingMessage}
              >
                <Send size={18} />
                {sendingMessage ? "Sending…" : "Send"}
              </button>
            </div>
          </div>

          {/* Negotiation History Timeline */}
          <div className={styles.timelineCard}>
            <h3 className={styles.cardTitle}>
              <Clock size={20} />
              Negotiation History
            </h3>
            <div className={styles.timeline}>
              <div className={styles.timelineItem}>
                <div className={styles.timelineDot}></div>
                <div className={styles.timelineContent}>
                  <p className={styles.timelineTitle}>Negotiation Started</p>
                  <p className={styles.timelineTime}>
                    {formatTime(negotiation.createdAt)}
                  </p>
                </div>
              </div>
              {messages.map((msg) => (
                <div key={msg.id} className={styles.timelineItem}>
                  <div
                    className={`${styles.timelineDot} ${msg.sender_profile_id === profile?.id ? styles.timelineDotOwner : ""}`}
                  ></div>
                  <div className={styles.timelineContent}>
                    <p className={styles.timelineTitle}>
                      {msg.amount != null ? "Offer" : "Message"} -{" "}
                      {msg.sender_profile_id === profile?.id
                        ? "You"
                        : msg.sender_name || "Client"}
                    </p>
                    <p className={styles.timelineTime}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
