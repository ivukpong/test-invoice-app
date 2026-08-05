import { useState, useEffect } from "react";
import {
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
} from "lucide-react";
import styles from "./RequestsPage.module.css";

import { API_BASE_URL } from "../utils/apiClient";

/**
 * ERP-sourced requests arrive via the BuildOS webhook with a minimal shape
 * (title, amount, a flat `materials` array of line items) and no `pricing`.
 * The card's expanded view assumes the richer portal shape — `material.id`,
 * `pricing.items`, `pricing.taxRate` — so expanding a webhook request read
 * `pricing.items` off undefined and blanked the page. Normalising on load
 * gives every request that shape, and seeds one pricing row per material so the
 * supplier can type a unit price (handlePriceChange matches on `materialId`).
 */
function normalizeMaterial(m, idx) {
  return {
    id: m?.id ?? m?.materialId ?? String(idx),
    name: m?.name ?? m?.material ?? m?.materialName ?? "Item",
    description: m?.description ?? "",
    quantity: Number(m?.quantity ?? m?.qty ?? 0),
    unit: m?.unit ?? "",
  };
}

function normalizeRequest(r) {
  const materials = Array.isArray(r?.materials)
    ? r.materials.map(normalizeMaterial)
    : [];
  return {
    ...r,
    requestNumber: r?.requestNumber ?? r?.buildos_ref ?? r?.id,
    title: r?.title ?? "ERP Request",
    requester: r?.requester ?? {},
    erpData: r?.erpData ?? {},
    materials,
    pricing: r?.pricing ?? {
      items: materials.map((m) => ({ materialId: m.id, unitPrice: 0 })),
      taxRate: 7.5,
    },
  };
}

export default function RequestsPage({ profile }) {
  const [requests, setRequests] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [expandedRequestId, setExpandedRequestId] = useState(null);
  const [submitRequest, setSubmitRequest] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`${API_BASE_URL}/api/requests?profileId=${profile.id}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load requests (${res.status})`);
        return res.json();
      })
      .then((data) => {
        const rows = Array.isArray(data) ? data : (data.requests ?? []);
        setRequests(rows.map(normalizeRequest));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [profile?.id]);

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
    received: {
      label: "Received",
      color: "#dbeafe",
      textColor: "#1e40af",
      icon: Inbox,
    },
    pending: {
      label: "Pending Review",
      color: "#fef9c3",
      textColor: "#854d0e",
      icon: Clock,
    },
    processed: {
      label: "Processed",
      color: "#e0e7ff",
      textColor: "#3730a3",
      icon: CheckCircle2,
    },
    approved: {
      label: "Approved",
      color: "#d1fae5",
      textColor: "#065f46",
      icon: CheckCircle2,
    },
    rejected: {
      label: "Rejected",
      color: "#fee2e2",
      textColor: "#991b1b",
      icon: XCircle,
    },
  };

  const filteredRequests = requests.filter((req) => {
    const matchesCategory =
      selectedCategory === "all"
        ? true
        : selectedCategory === "sent"
          ? req.status === "approved" || req.status === "processed"
          : req.status === selectedCategory;

    const matchesSearch = searchQuery
      ? (req.requestNumber || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (req.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (req.requester?.name || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      : true;

    return matchesCategory && matchesSearch;
  });

  function calculateTotal(request) {
    if (!request.pricing?.items) return 0;
    const subtotal = request.pricing.items.reduce((total, item) => {
      const material = request.materials.find((m) => m.id === item.materialId);
      if (!material) return total;
      return total + material.quantity * item.unitPrice;
    }, 0);
    const taxRate = request.pricing.taxRate || 0;
    const tax = subtotal * (taxRate / 100);
    return subtotal + tax;
  }

  function calculateSubtotal(request) {
    if (!request.pricing?.items) return 0;
    return request.pricing.items.reduce((total, item) => {
      const material = request.materials.find((m) => m.id === item.materialId);
      if (!material) return total;
      return total + material.quantity * item.unitPrice;
    }, 0);
  }

  function calculateTax(request) {
    const subtotal = calculateSubtotal(request);
    const taxRate = request.pricing?.taxRate || 0;
    return subtotal * (taxRate / 100);
  }

  function handlePriceChange(requestId, materialId, field, value) {
    setRequests((prev) =>
      prev.map((req) => {
        if (req.id !== requestId) return req;
        if (field === "taxRate") {
          return {
            ...req,
            pricing: { ...req.pricing, taxRate: parseFloat(value) || 0 },
          };
        }
        const pricingItem = req.pricing?.items?.find(
          (p) => p.materialId === materialId,
        );
        if (!pricingItem) return req;
        pricingItem[field] = parseFloat(value) || 0;
        return { ...req, pricing: { ...req.pricing } };
      }),
    );
  }

  function handleQuickFillTotal(requestId, totalAmount) {
    const request = requests.find((r) => r.id === requestId);
    if (!request) return;

    const totalQty = request.materials.reduce((sum, m) => sum + m.quantity, 0);
    if (totalQty === 0) return;

    const basePricePerUnit = parseFloat(totalAmount) / totalQty;

    setRequests((prev) =>
      prev.map((req) => {
        if (req.id !== requestId) return req;
        const newPricingItems = req.materials.map((m) => ({
          materialId: m.id,
          unitPrice: Math.round(basePricePerUnit * m.quantity) / m.quantity,
        }));
        return {
          ...req,
          pricing: {
            items: newPricingItems,
            taxRate: req.pricing.taxRate || 7.5,
          },
        };
      }),
    );
  }

  function handleSubmit(request) {
    const hasAllPrices = (request.pricing?.items ?? []).every(
      (item) => item.unitPrice > 0,
    );
    if (!hasAllPrices) {
      alert("Please enter prices for all items before submitting");
      return;
    }
    setSubmitError(null);
    setSubmitRequest(request);
  }

  // The priced line items in the shape BuildOS records on a received quote.
  function buildQuoteItems(request) {
    return (request.materials ?? []).map((m) => {
      const priced = request.pricing?.items?.find(
        (p) => p.materialId === m.id,
      );
      const unitPrice = priced?.unitPrice || 0;
      return {
        material: m.name,
        qty: m.quantity,
        unit: m.unit,
        unitPrice,
        total: m.quantity * unitPrice,
      };
    });
  }

  async function confirmSubmit() {
    const request = submitRequest;
    if (!request) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/requests/${request.id}/quote`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: buildQuoteItems(request),
            totalValue: calculateTotal(request),
          }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body.error || `Failed to send to BuildOS (${res.status})`,
        );
      }
      // Reflect the new status locally so the card leaves the pending state.
      setRequests((prev) =>
        prev.map((r) =>
          r.id === request.id ? { ...r, status: "quoted" } : r,
        ),
      );
      setSubmitRequest(null);
      navigateToInvoiceBuilder(request);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function navigateToInvoiceBuilder(request) {
    // Navigate to invoice builder with request data
    const params = new URLSearchParams();
    params.set("request_id", request.id);
    params.set("request_number", request.requestNumber);
    params.set("title", request.title);
    params.set("requester_name", request.requester?.name || "");
    params.set("requester_email", request.requester?.email || "");
    params.set("po_number", request.erpData?.poNumber || "");
    params.set("materials", JSON.stringify(request.materials));
    params.set("pricing", JSON.stringify(request.pricing?.items ?? []));
    params.set("tax_rate", request.pricing?.taxRate || 0);

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
              Requests from ERP are pre-filled. Add pricing and tax before
              submitting.
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
              {selectedCategory === "all"
                ? "All Requests"
                : selectedCategory === "sent"
                  ? "Sent Requests"
                  : selectedCategory.charAt(0).toUpperCase() +
                    selectedCategory.slice(1)}
            </h1>
            <span className={styles.resultCount}>
              {filteredRequests.length}{" "}
              {filteredRequests.length === 1 ? "request" : "requests"}
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
            <button
              className={styles.refreshButton}
              onClick={() => setLoading(true)}
            >
              <RefreshCw size={18} />
              Refresh
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className={styles.infoBanner}>
          <span className={styles.infoBannerIcon}>💡</span>
          <p className={styles.infoBannerText}>
            <strong>ERP Integration Active:</strong> Request details are
            automatically populated from your ERP system. Review the
            information, add pricing and tax values, then submit to create an
            invoice.
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
                          style={{
                            background: status.color,
                            color: status.textColor,
                          }}
                        >
                          <StatusIcon size={14} />
                          {status.label}
                        </span>
                      )}
                    </div>
                    <button
                      className={styles.expandButton}
                      onClick={() =>
                        setExpandedRequestId(isExpanded ? null : request.id)
                      }
                    >
                      {isExpanded ? (
                        <ChevronUp size={20} />
                      ) : (
                        <ChevronDown size={20} />
                      )}
                    </button>
                  </div>

                  <div className={styles.cardBody}>
                    <h3 className={styles.requestTitle}>{request.title}</h3>

                    <div className={styles.requestMeta}>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Requester</span>
                        <span className={styles.metaValue}>
                          {request.requester?.name}
                        </span>
                      </div>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Department</span>
                        <span className={styles.metaValue}>
                          {request.requester?.department}
                        </span>
                      </div>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>PO Number</span>
                        <span className={styles.metaValue}>
                          {request.erpData?.poNumber}
                        </span>
                      </div>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Delivery Date</span>
                        <span className={styles.metaValue}>
                          {formatDate(request.erpData?.deliveryDate)}
                        </span>
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
                            <span className={styles.infoLabel}>
                              Delivery Address:
                            </span>
                            <span className={styles.infoValue}>
                              {request.erpData?.deliveryAddress}
                            </span>
                          </div>
                          <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>
                              Payment Terms:
                            </span>
                            <span className={styles.infoValue}>
                              {request.erpData?.paymentTerms}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Materials & Pricing */}
                      <div className={styles.detailsSection}>
                        <h4 className={styles.sectionTitle}>
                          Materials & Pricing
                        </h4>
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
                                const pricingItem = request.pricing?.items?.find(
                                  (p) => p.materialId === material.id,
                                );
                                const unitPrice = pricingItem?.unitPrice || 0;
                                const subtotal = material.quantity * unitPrice;

                                return (
                                  <tr key={material.id}>
                                    <td className={styles.tableBold}>
                                      {material.name}
                                    </td>
                                    <td>{material.description}</td>
                                    <td>{material.quantity}</td>
                                    <td>{material.unit}</td>
                                    <td>
                                      <input
                                        type="number"
                                        className={styles.priceInput}
                                        value={unitPrice || ""}
                                        onChange={(e) =>
                                          handlePriceChange(
                                            request.id,
                                            material.id,
                                            "unitPrice",
                                            e.target.value,
                                          )
                                        }
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
                              value={request.pricing?.taxRate ?? 7.5}
                              onChange={(e) =>
                                handlePriceChange(
                                  request.id,
                                  null,
                                  "taxRate",
                                  e.target.value,
                                )
                              }
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
                          <span className={styles.totalValue}>
                            {formatAmount(calculateSubtotal(request))}
                          </span>
                        </div>
                        <div className={styles.totalRow}>
                          <span className={styles.totalLabel}>
                            Tax ({request.pricing?.taxRate || 0}%):
                          </span>
                          <span className={styles.totalValue}>
                            {formatAmount(calculateTax(request))}
                          </span>
                        </div>
                        <div
                          className={`${styles.totalRow} ${styles.totalRowGrand}`}
                        >
                          <span className={styles.totalLabelGrand}>
                            Total Amount:
                          </span>
                          <span className={styles.totalValueGrand}>
                            {formatAmount(total)}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      {(request.status === "pending" ||
                        request.status === "received") && (
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

      {submitRequest && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => !submitting && setSubmitRequest(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 16,
              width: "100%",
              maxWidth: 460,
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #eef0f3" }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
                Send quote to BuildOS
              </h3>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>
                {submitRequest.requestNumber} · {submitRequest.title}
              </p>
            </div>

            <div style={{ padding: "18px 24px" }}>
              <p style={{ margin: "0 0 14px", fontSize: 14, color: "#334155" }}>
                Your priced response will be sent back to BuildOS
                {submitRequest.buildos_event === "purchase-order.created"
                  ? " as a purchase invoice"
                  : " as a received quote"}
                , and the invoice builder will open pre-filled.
              </p>

              <div style={{ fontSize: 14, color: "#334155" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                  <span>Subtotal</span>
                  <span>{formatAmount(calculateSubtotal(submitRequest))}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                  <span>Tax ({submitRequest.pricing?.taxRate || 0}%)</span>
                  <span>{formatAmount(calculateTax(submitRequest))}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "10px 0 0",
                    marginTop: 6,
                    borderTop: "1px solid #eef0f3",
                    fontWeight: 700,
                    color: "#0f172a",
                  }}
                >
                  <span>Total</span>
                  <span>{formatAmount(calculateTotal(submitRequest))}</span>
                </div>
              </div>

              {submitError && (
                <p
                  style={{
                    margin: "14px 0 0",
                    fontSize: 13,
                    color: "#b91c1c",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: 8,
                    padding: "8px 10px",
                  }}
                >
                  {submitError}
                </p>
              )}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                padding: "16px 24px",
                borderTop: "1px solid #eef0f3",
              }}
            >
              <button
                onClick={() => setSubmitRequest(null)}
                disabled={submitting}
                style={{
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  color: "#374151",
                  fontWeight: 600,
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmSubmit}
                disabled={submitting}
                style={{
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: submitting ? "#6ee7b7" : "#10b981",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                {submitting ? "Sending…" : "Send to BuildOS & Build Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
