import { useState, useEffect } from "react";
import { Inbox, CheckCircle2, XCircle, Clock, Search, RefreshCw, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import styles from "./RequestsPage.module.css";

export default function RequestsPage({ profile }) {
  const [requests, setRequests] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [expandedRequestId, setExpandedRequestId] = useState(null);

  // Mock ERP data - in real app this comes from ERP system
  const MOCK_REQUESTS = [
    {
      id: 1,
      requestNumber: "REQ-2026-001",
      title: "Office Supplies Purchase",
      requester: {
        name: "John Doe",
        email: "john.doe@company.com",
        phone: "+234 801 234 5678",
        department: "Operations",
      },
      erpData: {
        poNumber: "PO-2026-0123",
        deliveryDate: "2026-02-15",
        deliveryAddress: "123 Business Street, Lagos, Nigeria",
        paymentTerms: "Net 30",
      },
      materials: [
        { id: 1, name: "Printer Paper A4", quantity: 50, unit: "Reams", description: "Premium white paper" },
        { id: 2, name: "Ballpoint Pens", quantity: 100, unit: "Pieces", description: "Blue ink, medium tip" },
        { id: 3, name: "Notebooks", quantity: 30, unit: "Pieces", description: "A5 size, ruled pages" },
      ],
      pricing: {
        items: [
          { materialId: 1, unitPrice: 0 },
          { materialId: 2, unitPrice: 0 },
          { materialId: 3, unitPrice: 0 },
        ],
        taxRate: 7.5,
      },
      status: "pending",
      date: "2026-01-15",
    },
    {
      id: 2,
      requestNumber: "REQ-2026-002",
      title: "IT Equipment",
      requester: {
        name: "Jane Smith",
        email: "jane.smith@company.com",
        phone: "+234 802 345 6789",
        department: "IT",
      },
      erpData: {
        poNumber: "PO-2026-0124",
        deliveryDate: "2026-02-20",
        deliveryAddress: "456 Tech Avenue, Abuja, Nigeria",
        paymentTerms: "Net 45",
      },
      materials: [
        { id: 1, name: "Laptop Stand", quantity: 10, unit: "Pieces", description: "Adjustable aluminum stand" },
        { id: 2, name: "Wireless Mouse", quantity: 15, unit: "Pieces", description: "Ergonomic design" },
      ],
      pricing: {
        items: [
          { materialId: 1, unitPrice: 0 },
          { materialId: 2, unitPrice: 0 },
        ],
        taxRate: 7.5,
      },
      status: "received",
      date: "2026-01-14",
    },
  ];

  useEffect(() => {
    // Simulate loading from ERP
    setLoading(true);
    setTimeout(() => {
      setRequests(MOCK_REQUESTS);
      setLoading(false);
    }, 1000);
  }, []);

  function formatAmount(amount, currency = "NGN") {
    if (amount === null || amount === undefined) return "—";
    try {
      return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: currency,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${currency} ${amount.toLocaleString()}`;
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
    received: { label: "Received", color: "#dbeafe", textColor: "#1e40af", icon: Inbox },
    pending: { label: "Pending Review", color: "#fef9c3", textColor: "#854d0e", icon: Clock },
    processed: { label: "Processed", color: "#e0e7ff", textColor: "#3730a3", icon: CheckCircle2 },
    approved: { label: "Approved", color: "#d1fae5", textColor: "#065f46", icon: CheckCircle2 },
    rejected: { label: "Rejected", color: "#fee2e2", textColor: "#991b1b", icon: XCircle },
  };

  const filteredRequests = requests.filter((req) => {
    const matchesCategory =
      selectedCategory === "all" ? true
      : selectedCategory === "sent" ? req.status === "approved" || req.status === "processed"
      : req.status === selectedCategory;

    const matchesSearch = searchQuery
      ? (req.requestNumber || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (req.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (req.requester?.name || "").toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    return matchesCategory && matchesSearch;
  });

  function calculateTotal(request) {
    if (!request.pricing?.items) return 0;
    const subtotal = request.pricing.items.reduce((total, item) => {
      const material = request.materials.find(m => m.id === item.materialId);
      if (!material) return total;
      return total + (material.quantity * item.unitPrice);
    }, 0);
    const taxRate = request.pricing.taxRate || 0;
    const tax = subtotal * (taxRate / 100);
    return subtotal + tax;
  }

  function calculateSubtotal(request) {
    if (!request.pricing?.items) return 0;
    return request.pricing.items.reduce((total, item) => {
      const material = request.materials.find(m => m.id === item.materialId);
      if (!material) return total;
      return total + (material.quantity * item.unitPrice);
    }, 0);
  }

  function calculateTax(request) {
    const subtotal = calculateSubtotal(request);
    const taxRate = request.pricing.taxRate || 0;
    return subtotal * (taxRate / 100);
  }

  function handlePriceChange(requestId, materialId, field, value) {
    setRequests(prev => prev.map(req => {
      if (req.id !== requestId) return req;
      if (field === 'taxRate') {
        return { ...req, pricing: { ...req.pricing, taxRate: parseFloat(value) || 0 } };
      }
      const pricingItem = req.pricing.items.find(p => p.materialId === materialId);
      if (!pricingItem) return req;
      pricingItem[field] = parseFloat(value) || 0;
      return { ...req, pricing: { ...req.pricing } };
    }));
  }

  function handleQuickFillTotal(requestId, totalAmount) {
    const request = requests.find(r => r.id === requestId);
    if (!request) return;
    
    const totalQty = request.materials.reduce((sum, m) => sum + m.quantity, 0);
    if (totalQty === 0) return;
    
    const basePricePerUnit = parseFloat(totalAmount) / totalQty;
    
    setRequests(prev => prev.map(req => {
      if (req.id !== requestId) return req;
      const newPricingItems = req.materials.map(m => ({
        materialId: m.id,
        unitPrice: Math.round(basePricePerUnit * m.quantity) / m.quantity,
      }));
      return { ...req, pricing: { items: newPricingItems, taxRate: req.pricing.taxRate || 7.5 } };
    }));
  }

  function handleSubmit(request) {
    const hasAllPrices = request.pricing.items.every(item => item.unitPrice > 0);
    if (!hasAllPrices) {
      alert("Please enter prices for all items before submitting");
      return;
    }
    
    const total = calculateTotal(request);
    const confirmMsg = `Submit invoice for ${request.requestNumber}?\n\nTotal: ${formatAmount(total)}\n\nThis will create an invoice with the pre-filled information.`;
    if (!confirm(confirmMsg)) return;
    
    navigateToInvoiceBuilder(request);
  }

  function navigateToInvoiceBuilder(request) {
    // Navigate to invoice builder with request data
    const params = new URLSearchParams();
    params.set('request_id', request.id);
    params.set('request_number', request.requestNumber);
    params.set('title', request.title);
    params.set('requester_name', request.requester?.name || '');
    params.set('requester_email', request.requester?.email || '');
    params.set('po_number', request.erpData?.poNumber || '');
    params.set('materials', JSON.stringify(request.materials));
    params.set('pricing', JSON.stringify(request.pricing.items));
    params.set('tax_rate', request.pricing.taxRate || 0);
    
    window.location.href = `/?${params.toString()}`;
  }

  return (
    <div className={styles.container}>
      {/* Left Sidebar Navigation */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>
            <Inbox className={styles.sidebarIcon} />
            Requests
          </h2>
        </div>

        <nav className={styles.nav}>
          <button
            className={`${styles.navItem} ${selectedCategory === "all" ? styles.navItemActive : ""}`}
            onClick={() => setSelectedCategory("all")}
          >
            <Inbox size={20} />
            <span>All Requests</span>
          </button>
          <button
            className={`${styles.navItem} ${selectedCategory === "received" ? styles.navItemActive : ""}`}
            onClick={() => setSelectedCategory("received")}
          >
            <Inbox size={20} />
            <span>Received</span>
          </button>
          <button
            className={`${styles.navItem} ${selectedCategory === "sent" ? styles.navItemActive : ""}`}
            onClick={() => setSelectedCategory("sent")}
          >
            <CheckCircle2 size={20} />
            <span>Sent</span>
          </button>
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.infoCard}>
            <span className={styles.infoIcon}>ℹ️</span>
            <p className={styles.infoText}>
              Requests from ERP are pre-filled. Add pricing and tax before submitting.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.pageTitle}>
              {selectedCategory === "all" ? "All Requests" 
               : selectedCategory === "sent" ? "Sent Requests"
               : selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
            </h1>
            <span className={styles.resultCount}>
              {filteredRequests.length} {filteredRequests.length === 1 ? "request" : "requests"}
            </span>
          </div>

          <div className={styles.headerRight}>
            <div className={styles.searchBox}>
              <Search size={20} />
              <input
                type="text"
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            <button className={styles.refreshButton} onClick={() => setLoading(true)}>
              <RefreshCw size={18} />
              Refresh
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className={styles.infoBanner}>
          <span className={styles.infoBannerIcon}>💡</span>
          <p className={styles.infoBannerText}>
            <strong>ERP Integration Active:</strong> Request details are automatically populated from your ERP system. 
            Review the information, add pricing and tax values, then submit to create an invoice.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className={styles.loadingState}>
            <div className={styles.loader}></div>
            <p>Syncing with ERP system...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className={styles.errorState}>
            <div className={styles.errorIcon}>⚠️</div>
            <p className={styles.errorText}>{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredRequests.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📭</div>
            <h3 className={styles.emptyTitle}>No requests found</h3>
            <p className={styles.emptyText}>
              {searchQuery
                ? `No results for "${searchQuery}". Try a different search term.`
                : "All caught up! No pending requests to review."}
            </p>
          </div>
        )}

        {/* Requests List */}
        {!loading && !error && filteredRequests.length > 0 && (
          <div className={styles.requestsList}>
            {filteredRequests.map((request) => {
              const status = statusConfig[request.status];
              const StatusIcon = status?.icon || Clock;
              const isExpanded = expandedRequestId === request.id;
              const total = calculateTotal(request);

              return (
                <div key={request.id} className={styles.requestCard}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardHeaderLeft}>
                      <span className={styles.requestNumber}>
                        {request.requestNumber}
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
                    <button 
                      className={styles.expandButton}
                      onClick={() => setExpandedRequestId(isExpanded ? null : request.id)}
                    >
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                  </div>

                  <div className={styles.cardBody}>
                    <h3 className={styles.requestTitle}>{request.title}</h3>
                    
                    <div className={styles.requestMeta}>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Requester</span>
                        <span className={styles.metaValue}>{request.requester?.name}</span>
                      </div>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Department</span>
                        <span className={styles.metaValue}>{request.requester?.department}</span>
                      </div>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>PO Number</span>
                        <span className={styles.metaValue}>{request.erpData?.poNumber}</span>
                      </div>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Delivery Date</span>
                        <span className={styles.metaValue}>{formatDate(request.erpData?.deliveryDate)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className={styles.cardDetails}>
                      {/* ERP Information */}
                      <div className={styles.detailsSection}>
                        <h4 className={styles.sectionTitle}>ERP Information</h4>
                        <div className={styles.infoGrid}>
                          <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Delivery Address:</span>
                            <span className={styles.infoValue}>{request.erpData?.deliveryAddress}</span>
                          </div>
                          <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Payment Terms:</span>
                            <span className={styles.infoValue}>{request.erpData?.paymentTerms}</span>
                          </div>
                        </div>
                      </div>

                      {/* Materials & Pricing */}
                      <div className={styles.detailsSection}>
                        <h4 className={styles.sectionTitle}>Materials & Pricing</h4>
                        <div className={styles.pricingTable}>
                          <table className={styles.table}>
                            <thead>
                              <tr>
                                <th>Material</th>
                                <th>Description</th>
                                <th>Quantity</th>
                                <th>Unit</th>
                                <th>Unit Price (₦)</th>
                                <th>Line Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {request.materials.map((material) => {
                                const pricingItem = request.pricing.items.find(p => p.materialId === material.id);
                                const unitPrice = pricingItem?.unitPrice || 0;
                                const subtotal = material.quantity * unitPrice;

                                return (
                                  <tr key={material.id}>
                                    <td className={styles.tableBold}>{material.name}</td>
                                    <td>{material.description}</td>
                                    <td>{material.quantity}</td>
                                    <td>{material.unit}</td>
                                    <td>
                                      <input
                                        type="number"
                                        className={styles.priceInput}
                                        value={unitPrice || ""}
                                        onChange={(e) => handlePriceChange(request.id, material.id, 'unitPrice', e.target.value)}
                                        placeholder="Enter price"
                                        min="0"
                                        step="100"
                                      />
                                    </td>
                                    <td className={styles.tableBold}>
                                      {formatAmount(subtotal)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Global Tax Rate */}
                        <div className={styles.taxRateSection}>
                          <label className={styles.taxRateLabel}>
                            <span>Tax Rate (%):</span>
                            <input
                              type="number"
                              className={styles.taxRateInput}
                              value={request.pricing.taxRate ?? 7.5}
                              onChange={(e) => handlePriceChange(request.id, null, 'taxRate', e.target.value)}
                              min="0"
                              max="100"
                              step="0.1"
                            />
                          </label>
                        </div>
                      </div>

                      {/* Totals */}
                      <div className={styles.totalsSection}>
                        <div className={styles.totalRow}>
                          <span className={styles.totalLabel}>Subtotal:</span>
                          <span className={styles.totalValue}>{formatAmount(calculateSubtotal(request))}</span>
                        </div>
                        <div className={styles.totalRow}>
                          <span className={styles.totalLabel}>Tax ({request.pricing.taxRate || 0}%):</span>
                          <span className={styles.totalValue}>{formatAmount(calculateTax(request))}</span>
                        </div>
                        <div className={`${styles.totalRow} ${styles.totalRowGrand}`}>
                          <span className={styles.totalLabelGrand}>Total Amount:</span>
                          <span className={styles.totalValueGrand}>{formatAmount(total)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      {(request.status === "pending" || request.status === "received") && (
                        <div className={styles.actionButtons}>
                          <button 
                            className={styles.submitButton}
                            onClick={() => handleSubmit(request)}
                          >
                            <CheckCircle2 size={18} />
                            Submit Invoice
                          </button>
                          <button 
                            className={styles.secondaryActionButton}
                            onClick={() => navigateToInvoiceBuilder(request)}
                          >
                            <Plus size={18} />
                            Go to Invoice Builder
                          </button>
                          <button className={styles.rejectButton}>
                            <XCircle size={18} />
                            Reject Request
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
