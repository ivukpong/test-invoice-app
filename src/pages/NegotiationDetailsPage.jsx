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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

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

  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/negotiation\/(\d+)$/);
    if (match) {
      setNegotiationId(match[1]);
    }
  }, []);

  // Load negotiation data
  useEffect(() => {
    if (!negotiationId) return;
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE_URL}/api/negotiate/${negotiationId}`).then((r) =>
        r.ok ? r.json() : Promise.reject(r.status),
      ),
      fetch(`${API_BASE_URL}/api/negotiate/${negotiationId}/messages`).then(
        (r) => (r.ok ? r.json() : Promise.reject(r.status)),
      ),
    ])
      .then(([neg, msgs]) => {
        const negData = Array.isArray(neg) ? neg[0] : neg;
        setNegotiation(negData);
        if (negData?.items) {
          setEditableItems(
            (negData.items || []).map((item) => ({
              ...item,
              newUnitPrice: item.unitPrice ?? item.unit_price ?? 0,
              newTotal:
                (item.quantity ?? 1) * (item.unitPrice ?? item.unit_price ?? 0),
            })),
          );
        }
        setMessages(Array.isArray(msgs) ? msgs : (msgs.messages ?? []));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [negotiationId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !negotiationId) return;
    setSendingMessage(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/negotiate/${negotiationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sender_profile_id: profile?.id,
            content: newMessage.trim(),
          }),
        },
      );
      if (!res.ok) throw new Error("Failed to send message");
      const saved = await res.json();
      setMessages((prev) => [...prev, saved]);
      setNewMessage("");
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

  const handleCollectiveCounter = () => {
    const invalidItem = editableItems.find((i) => i.newUnitPrice <= 0);
    if (invalidItem) {
      alert(`Please enter a valid unit price for "${invalidItem.name}"`);
      return;
    }

    const totalNew = editableItems.reduce((sum, i) => sum + i.newTotal, 0);
    const confirmMsg = `Submit collective counter offer?\n\nOriginal: ₦${negotiation.originalAmount.toLocaleString()}\nCurrent Offer: ₦${negotiation.currentOffer.toLocaleString()}\nYour Counter: ₦${totalNew.toLocaleString()}`;
    if (!confirm(confirmMsg)) return;

    console.log(
      `Collective counter offer submitted: ₦${totalNew.toLocaleString()}`,
    );
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
      companyName: profile?.name || "",
      companyAddress: "",
      companyEmail: profile?.email || "",
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
      currency: "NGN",
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
            {negotiation.client.name} • {negotiation.client.company}
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
          {/* Offer Summary */}
          <div className={styles.offerSummary}>
            <h3 className={styles.cardTitle}>
              <FileText size={20} />
              Offer Summary
            </h3>
            <div className={styles.offerRow}>
              <span className={styles.offerLabel}>Original Amount:</span>
              <span className={styles.offerValue}>
                ₦{negotiation.originalAmount.toLocaleString()}
              </span>
            </div>
            <div className={styles.offerRow}>
              <span className={styles.offerLabel}>Client Offer:</span>
              <span className={styles.offerValueHighlight}>
                ₦{negotiation.currentOffer.toLocaleString()}
              </span>
            </div>
            <div className={styles.offerRow}>
              <span className={styles.offerLabel}>Your Counter:</span>
              <span className={styles.offerValueHighlight}>
                ₦{calculateTotal().toLocaleString()}
              </span>
            </div>
            <div className={styles.offerRow}>
              <span className={styles.offerLabel}>
                Difference from Original:
              </span>
              <span className={styles.offerValueNegative}>
                -₦
                {(
                  negotiation.originalAmount -
                  Math.min(negotiation.currentOffer, calculateTotal())
                ).toLocaleString()}
              </span>
            </div>

            <div className={styles.actionButtons}>
              <button
                className={styles.acceptButton}
                onClick={() =>
                  confirm("Accept offer?") && console.log("Accepted")
                }
              >
                <CheckCircle2 size={18} />
                Accept Offer
              </button>
              <button
                className={styles.rejectButton}
                onClick={() =>
                  confirm("Reject offer?") && console.log("Rejected")
                }
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
                    ₦{item.originalPrice.toLocaleString()}
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
                    ₦{item.newTotal.toLocaleString()}
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
                <strong>₦{calculateTotal().toLocaleString()}</strong>
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
                      <label>Client</label>
                      <span>{negotiation.client.name}</span>
                    </div>
                    <div className={styles.builderField}>
                      <label>Company</label>
                      <span>{negotiation.client.company}</span>
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
                          <td>₦{item.newUnitPrice.toLocaleString()}</td>
                          <td>₦{item.newTotal.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3}>
                          <strong>Total</strong>
                        </td>
                        <td>
                          <strong>₦{calculateTotal().toLocaleString()}</strong>
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
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`${styles.message} ${msg.from === "owner" || msg.sender_profile_id === profile?.id ? styles.messageOwner : styles.messageClient}`}
                >
                  <div className={styles.messageHeader}>
                    <span className={styles.messageFrom}>
                      {msg.fromName ??
                        msg.sender_name ??
                        (msg.sender_profile_id === profile?.id
                          ? "You"
                          : "Client")}
                    </span>
                    <span className={styles.messageTime}>
                      {formatTime(msg.timestamp ?? msg.created_at)}
                    </span>
                  </div>
                  {msg.type === "offer" ? (
                    <div className={styles.offerMessage}>
                      💰 Offer: ₦{msg.amount?.toLocaleString()}
                    </div>
                  ) : (
                    <p className={styles.messageText}>
                      {msg.message ?? msg.content}
                    </p>
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
                    className={`${styles.timelineDot} ${msg.from === "owner" ? styles.timelineDotOwner : ""}`}
                  ></div>
                  <div className={styles.timelineContent}>
                    <p className={styles.timelineTitle}>
                      {msg.type === "offer" ? "Offer Made" : "Message"} -{" "}
                      {msg.fromName}
                    </p>
                    <p className={styles.timelineTime}>
                      {formatTime(msg.timestamp)}
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
