import { useState, useEffect } from "react";
import { ArrowLeft, MessageSquare, CheckCircle2, XCircle, Clock, Send, Plus, Trash2, Edit2, Save } from "lucide-react";
import styles from "./NegotiationDetailsPage.module.css";

export default function NegotiationDetailsPage({ profile, onNavigate }) {
  const [negotiationId, setNegotiationId] = useState(null);
  const [negotiation, setNegotiation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [itemNotes, setItemNotes] = useState({});
  const [generalNotes, setGeneralNotes] = useState("");
  const [editableItems, setEditableItems] = useState([]);

  // Get negotiation ID from URL path
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/negotiation\/(\d+)$/);
    if (match) {
      setNegotiationId(match[1]);
    }
  }, []);

  // Mock data - in real app, fetch from API
  useEffect(() => {
    // Simulate loading negotiation data
    const mockNegotiation = {
      id: 1,
      invoiceNumber: "INV-2026-003",
      originalAmount: 500000,
      currentOffer: 450000,
      status: "negotiating",
      client: {
        name: "Bob Johnson",
        company: "Enterprise Corp",
        email: "bob@enterprise.com",
      },
      items: [
        { id: 1, name: "Consulting Services", quantity: 40, unitPrice: 10000, originalPrice: 400000 },
        { id: 2, name: "Software License", quantity: 1, unitPrice: 100000, originalPrice: 100000 },
      ],
      createdAt: "2026-01-13T09:15:00Z",
    };
    
    setNegotiation(mockNegotiation);
    setEditableItems(mockNegotiation.items.map(item => ({ 
      ...item, 
      newUnitPrice: item.unitPrice,
      newTotal: item.quantity * item.unitPrice,
    })));

    setMessages([
      {
        id: 1,
        from: "client",
        fromName: "Bob Johnson",
        message: "We'd like to discuss the pricing. Can we reduce the consulting hours?",
        timestamp: "2026-01-13T10:30:00Z",
        type: "message",
      },
      {
        id: 2,
        from: "client",
        fromName: "Bob Johnson",
        message: "We're proposing ₦450,000 instead of ₦500,000",
        timestamp: "2026-01-13T10:32:00Z",
        type: "offer",
        amount: 450000,
      },
    ]);

    setItemNotes({
      1: "Client requested reduction in consulting hours from 40 to 35",
    });
  }, []);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    const message = {
      id: messages.length + 1,
      from: "owner",
      fromName: profile?.name || "You",
      message: newMessage,
      timestamp: new Date().toISOString(),
      type: "message",
    };
    
    setMessages([...messages, message]);
    setNewMessage("");
  };

  const handleSaveItemNote = (itemId, note) => {
    setItemNotes({ ...itemNotes, [itemId]: note });
  };

  const handleSaveGeneralNote = () => {
    // Save general notes
    console.log("Saving general notes:", generalNotes);
  };

  const handleAcceptOffer = () => {
    if (confirm("Accept this offer?")) {
      // Update negotiation status
      console.log("Offer accepted");
    }
  };

  const handleRejectOffer = () => {
    if (confirm("Reject this offer?")) {
      // Update negotiation status
      console.log("Offer rejected");
    }
  };

  const handleItemPriceChange = (itemId, field, value) => {
    setEditableItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const newValue = field === 'newUnitPrice' ? parseFloat(value) || 0 : value;
      const updated = { ...item, [field]: newValue };
      if (field === 'newUnitPrice' || field === 'quantity') {
        updated.newTotal = updated.quantity * updated.newUnitPrice;
      }
      return updated;
    }));
  };

  const handleItemNoteChange = (itemId, note) => {
    setItemNotes({ ...itemNotes, [itemId]: note });
  };

  const handleItemCounterOffer = (itemId) => {
    const item = editableItems.find(i => i.id === itemId);
    if (!item) return;
    
    if (item.newUnitPrice <= 0) {
      alert("Please enter a valid unit price");
      return;
    }
    
    const confirmMsg = `Submit counter offer for ${item.name}?\n\nOriginal: ₦${item.originalPrice.toLocaleString()}\nYour Price: ₦${item.newTotal.toLocaleString()}`;
    if (!confirm(confirmMsg)) return;
    
    // Update the item's unit price to the new price
    setEditableItems(prev => prev.map(i => {
      if (i.id !== itemId) return i;
      return { ...i, unitPrice: i.newUnitPrice, originalPrice: i.unitPrice };
    }));
    
    console.log(`Counter offer submitted for item ${itemId}: ₦${item.newTotal.toLocaleString()}`);
  };

  const handleEditInvoice = () => {
    // Navigate to invoice builder with negotiation data
    const params = new URLSearchParams();
    params.set('negotiation_id', negotiation.id);
    params.set('invoice_number', negotiation.invoiceNumber);
    params.set('client_name', negotiation.client.name);
    params.set('client_email', negotiation.client.email);
    params.set('client_company', negotiation.client.company);
    params.set('items', JSON.stringify(editableItems));
    window.location.href = `/?${params.toString()}`;
  };

  const calculateTotal = () => {
    return editableItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
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

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => onNavigate?.("negotiations")}>
          <ArrowLeft size={20} />
          Back
        </button>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>Negotiation - {negotiation.invoiceNumber}</h1>
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
        {/* Left Column - Negotiation Thread */}
        <div className={styles.leftColumn}>
          {/* Offer Summary */}
          <div className={styles.offerSummary}>
            <div className={styles.offerRow}>
              <span className={styles.offerLabel}>Original Amount:</span>
              <span className={styles.offerValue}>₦{negotiation.originalAmount.toLocaleString()}</span>
            </div>
            <div className={styles.offerRow}>
              <span className={styles.offerLabel}>Current Offer:</span>
              <span className={styles.offerValueHighlight}>₦{negotiation.currentOffer.toLocaleString()}</span>
            </div>
            <div className={styles.offerRow}>
              <span className={styles.offerLabel}>Your Counter:</span>
              <span className={styles.offerValueHighlight}>₦{calculateTotal().toLocaleString()}</span>
            </div>
            <div className={styles.offerRow}>
              <span className={styles.offerLabel}>Difference:</span>
              <span className={styles.offerValueNegative}>
                -₦{(negotiation.originalAmount - negotiation.currentOffer).toLocaleString()}
              </span>
            </div>
            
            <div className={styles.actionButtons}>
              <button className={styles.acceptButton} onClick={handleAcceptOffer}>
                <CheckCircle2 size={18} />
                Accept Offer
              </button>
              <button className={styles.rejectButton} onClick={handleRejectOffer}>
                <XCircle size={18} />
                Reject
              </button>
            </div>

            {/* Edit Invoice Button */}
            <button className={styles.editInvoiceButton} onClick={handleEditInvoice}>
              <Edit2 size={18} />
              Edit Invoice in Builder
            </button>
          </div>

          {/* Messages Thread - Commented out for now (no backend support yet) */}
          {false && (
          <div className={styles.messagesContainer}>
            <h3 className={styles.sectionTitle}>
              <MessageSquare size={20} />
              Conversation
            </h3>
            
            <div className={styles.messages}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`${styles.message} ${msg.from === "owner" ? styles.messageOwner : styles.messageClient}`}
                >
                  <div className={styles.messageHeader}>
                    <span className={styles.messageFrom}>{msg.fromName}</span>
                    <span className={styles.messageTime}>{formatTime(msg.timestamp)}</span>
                  </div>
                  
                  {msg.type === "offer" ? (
                    <div className={styles.offerMessage}>
                      <strong>💰 Offer:</strong> ₦{msg.amount.toLocaleString()}
                    </div>
                  ) : (
                    <p className={styles.messageText}>{msg.message}</p>
                  )}
                </div>
              ))}
            </div>

            <div className={styles.messageInputContainer}>
              <textarea
                className={styles.messageInput}
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={3}
              />
              <button className={styles.sendButton} onClick={handleSendMessage}>
                <Send size={18} />
                Send
              </button>
            </div>
          </div>
          )}
        </div>

        {/* Right Column - Items & Notes */}
        <div className={styles.rightColumn}>
          {/* Invoice Items - Editable */}
          <div className={styles.itemsCard}>
            <h3 className={styles.cardTitle}>Invoice Items (Editable)</h3>
            {editableItems.map((item) => (
              <div key={item.id} className={styles.itemCard}>
                <div className={styles.itemHeader}>
                  <h4 className={styles.itemName}>{item.name}</h4>
                </div>
                
                {/* Previous Amount Row */}
                <div className={styles.previousAmountRow}>
                  <span className={styles.previousAmountLabel}>Previous Amount:</span>
                  <span className={styles.previousAmountValue}>₦{item.originalPrice.toLocaleString()}</span>
                </div>
                
                <div className={styles.itemEditRow}>
                  <div className={styles.itemEditField}>
                    <label className={styles.itemEditLabel}>Quantity</label>
                    <input
                      type="number"
                      className={styles.itemEditInput}
                      value={item.quantity}
                      onChange={(e) => handleItemPriceChange(item.id, 'quantity', e.target.value)}
                      min="1"
                    />
                  </div>
                  <div className={styles.itemEditField}>
                    <label className={styles.itemEditLabel}>Your Unit Price (₦)</label>
                    <input
                      type="number"
                      className={styles.itemEditInput}
                      value={item.newUnitPrice}
                      onChange={(e) => handleItemPriceChange(item.id, 'newUnitPrice', e.target.value)}
                      min="0"
                      step="100"
                    />
                  </div>
                </div>
                
                {/* New Total Display */}
                <div className={styles.newTotalRow}>
                  <span className={styles.newTotalLabel}>Your Total:</span>
                  <span className={styles.newTotalValue}>₦{item.newTotal.toLocaleString()}</span>
                </div>
                
                {/* Counter Offer Button per Item */}
                <button 
                  className={styles.itemCounterButton}
                  onClick={() => handleItemCounterOffer(item.id)}
                >
                  <Edit2 size={16} />
                  Submit Counter for this Item
                </button>
                
                {/* Item-specific Notes */}
                <div className={styles.itemNoteSection}>
                  <label className={styles.itemNoteLabel}>
                    <Edit2 size={14} />
                    Item Notes
                  </label>
                  <textarea
                    className={styles.itemNoteInput}
                    value={itemNotes[item.id] || ""}
                    onChange={(e) => handleItemNoteChange(item.id, e.target.value)}
                    placeholder="Add notes about this item..."
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* General Notes */}
          <div className={styles.notesCard}>
            <h3 className={styles.cardTitle}>
              <MessageSquare size={20} />
              General Notes
            </h3>
            <textarea
              className={styles.generalNoteInput}
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder="Add general notes about this negotiation..."
              rows={8}
            />
            <button className={styles.saveNotesButton} onClick={handleSaveGeneralNote}>
              <Save size={16} />
              Save Notes
            </button>
          </div>

          {/* Negotiation Timeline */}
          <div className={styles.timelineCard}>
            <h3 className={styles.cardTitle}>Timeline</h3>
            <div className={styles.timeline}>
              <div className={styles.timelineItem}>
                <div className={styles.timelineDot}></div>
                <div className={styles.timelineContent}>
                  <p className={styles.timelineTitle}>Negotiation Started</p>
                  <p className={styles.timelineTime}>{formatTime(negotiation.createdAt)}</p>
                </div>
              </div>
              {messages.map((msg) => (
                <div key={msg.id} className={styles.timelineItem}>
                  <div className={`${styles.timelineDot} ${msg.from === "owner" ? styles.timelineDotOwner : ""}`}></div>
                  <div className={styles.timelineContent}>
                    <p className={styles.timelineTitle}>
                      {msg.type === "offer" ? "Offer Made" : "Message"} - {msg.fromName}
                    </p>
                    <p className={styles.timelineTime}>{formatTime(msg.timestamp)}</p>
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
