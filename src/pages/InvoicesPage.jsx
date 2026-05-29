import { useState, useEffect } from "react";
import {
  FileText,
  Edit,
  Download,
  Trash2,
  Search,
  Plus,
  Filter,
  ChevronDown,
  CheckCircle2,
  Clock,
  XCircle,
  Archive,
} from "lucide-react";
import styles from "./InvoicesPage.module.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const CATEGORIES = [
  { id: "all", label: "All Invoices", icon: FileText, count: null },
  { id: "drafts", label: "Drafts", icon: Edit, count: null },
  { id: "saved", label: "Saved", icon: CheckCircle2, count: null },
  { id: "submitted", label: "Submitted", icon: Clock, count: null },
];

export default function InvoicesPage({ profile, onNavigate }) {
  const [invoices, setInvoices] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    fetch(`${API_BASE_URL}/api/invoices/by-profile/${profile.id}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load invoices (${res.status})`);
        return res.json();
      })
      .then((data) => {
        setInvoices(Array.isArray(data) ? data : (data.invoices ?? []));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [profile?.id]);

  function openInvoice(id) {
    window.history.pushState({}, "", `/?id=${id}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
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
    saved: {
      label: "Saved",
      color: "#dcfce7",
      textColor: "#166534",
      icon: CheckCircle2,
    },
    draft: {
      label: "Draft",
      color: "#f1f5f9",
      textColor: "#475569",
      icon: Edit,
    },
    negotiating: {
      label: "Negotiating",
      color: "#fef9c3",
      textColor: "#854d0e",
      icon: Clock,
    },
    accepted: {
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
    quote_submitted: {
      label: "Submitted",
      color: "#dbeafe",
      textColor: "#1e40af",
      icon: Clock,
    },
    finalized: {
      label: "Finalized",
      color: "#e0e7ff",
      textColor: "#3730a3",
      icon: CheckCircle2,
    },
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesCategory =
      selectedCategory === "all"
        ? true
        : selectedCategory === "saved"
          ? inv.status === "saved" || !inv.status
          : selectedCategory === "drafts"
            ? inv.status === "draft"
            : selectedCategory === "submitted"
              ? inv.status === "quote_submitted"
              : selectedCategory === "archived"
                ? inv.status === "archived"
                : true;

    const matchesSearch = searchQuery
      ? (inv.invoice_number || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (inv.client_email || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (inv.sender_company_name || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      : true;

    return matchesCategory && matchesSearch;
  });

  const categoryCounts = CATEGORIES.reduce((acc, cat) => {
    acc[cat.id] = invoices.filter((inv) => {
      if (cat.id === "all") return true;
      if (cat.id === "saved") return inv.status === "saved" || !inv.status;
      if (cat.id === "drafts") return inv.status === "draft";
      if (cat.id === "submitted") return inv.status === "quote_submitted";
      if (cat.id === "archived") return inv.status === "archived";
      return true;
    }).length;
    return acc;
  }, {});

  return (
    <div className={styles.container}>
      {/* Left Sidebar Navigation */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>Invoices</h2>
          <button
            className={styles.helpButton}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            title="Get help"
          >
            ?
          </button>
          {showTooltip && (
            <div className={styles.tooltip}>
              Filter your invoices by status. Click on any category to view
              invoices in that status.
            </div>
          )}
        </div>

        <nav className={styles.nav}>
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              className={`${styles.navItem} ${selectedCategory === category.id ? styles.navItemActive : ""}`}
              onClick={() => setSelectedCategory(category.id)}
            >
              <category.icon className={styles.navIcon} />
              <span className={styles.navLabel}>{category.label}</span>
              <span className={styles.navCount}>
                {category.counts !== null ? categoryCounts[category.id] : ""}
              </span>
            </button>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.tipCard}>
            <span className={styles.tipIcon}>💡</span>
            <p className={styles.tipText}>
              Click on any invoice to view or edit it. Drafts can be modified
              anytime.
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
              {CATEGORIES.find((c) => c.id === selectedCategory)?.label ||
                "Invoices"}
            </h1>
            <span className={styles.resultCount}>
              {filteredInvoices.length}{" "}
              {filteredInvoices.length === 1 ? "invoice" : "invoices"}
            </span>
          </div>

          <div className={styles.headerRight}>
            <div className={styles.searchBox}>
              <Search className={styles.searchIcon} size={20} />
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            <button
              className={styles.createButton}
              onClick={() => {
                window.history.pushState({}, "", "/");
                if (onNavigate) onNavigate("main");
                else window.location.href = "/";
              }}
            >
              <Plus size={18} />
              New Invoice
            </button>
          </div>
        </div>

        {/* Content */}
        {!profile && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🔐</div>
            <h3 className={styles.emptyTitle}>Sign in to view invoices</h3>
            <p className={styles.emptyText}>
              Create an account or sign in to access your saved invoices and
              manage them easily.
            </p>
          </div>
        )}

        {profile && loading && (
          <div className={styles.loadingState}>
            <div className={styles.loader}></div>
            <p>Loading your invoices...</p>
          </div>
        )}

        {profile && error && (
          <div className={styles.errorState}>
            <div className={styles.errorIcon}>⚠️</div>
            <p className={styles.errorText}>{error}</p>
          </div>
        )}

        {profile && !loading && !error && filteredInvoices.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📭</div>
            <h3 className={styles.emptyTitle}>No invoices found</h3>
            <p className={styles.emptyText}>
              {searchQuery
                ? `No results for "${searchQuery}". Try a different search term.`
                : selectedCategory !== "all"
                  ? `You don't have any ${selectedCategory} invoices yet.`
                  : "Create your first invoice to get started!"}
            </p>
            {!searchQuery && selectedCategory === "all" && (
              <button
                className={styles.createButtonLarge}
                onClick={() => {
                  window.history.pushState({}, "", "/");
                  if (onNavigate) onNavigate("main");
                  else window.location.href = "/";
                }}
              >
                <Plus size={18} />
                Create Your First Invoice
              </button>
            )}
          </div>
        )}

        {profile && !loading && filteredInvoices.length > 0 && (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Invoice #</th>
                  <th className={styles.th}>Client</th>
                  <th className={styles.th}>Company</th>
                  <th className={styles.th}>Amount</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Date</th>
                  <th className={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => {
                  const status = statusConfig[inv.status] || statusConfig.saved;
                  const StatusIcon = status.icon;
                  return (
                    <tr key={inv.id} className={styles.tr}>
                      <td className={styles.td}>
                        <span className={styles.invoiceNumber}>
                          {inv.invoice_number || "—"}
                        </span>
                      </td>
                      <td className={styles.td}>
                        {inv.payload?.clientName || inv.client_email || "—"}
                      </td>
                      <td className={styles.td}>
                        {inv.payload?.clientCompanyName ||
                          inv.sender_company_name ||
                          "—"}
                      </td>
                      <td className={styles.td}>
                        <span className={styles.amount}>
                          {formatAmount(inv.total, inv.currency)}
                        </span>
                      </td>
                      <td className={styles.td}>
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
                      </td>
                      <td className={styles.td}>
                        <span className={styles.date}>
                          {formatDate(inv.created_at)}
                        </span>
                      </td>
                      <td className={styles.td}>
                        <button
                          className={styles.viewButton}
                          onClick={() => openInvoice(inv.id)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
