import { useState, useRef, useEffect } from "react";
import InvoiceForm from "./components/InvoiceForm";
import InvoiceTable from "./components/InvoiceTable";
import InvoiceSummary from "./components/InvoiceSummary";
import SignaturePad from "./components/SignaturePad";
import InvoicePreview from "./components/InvoicePreview";
import ExportActions from "./components/ExportActions";
import SidebarNav from "./components/SidebarNav";
import Onboarding from "./components/Onboarding";
import Header from "./components/Header";
import {
  peekInvoiceCount,
  recordInvoiceData,
  generateInvoiceNumber,
  generateRandomInvoiceId,
} from "./utils/invoiceGenerator";
import RegisterPage from "./pages/RegisterPage";
import { getMyInvoices, getInvoiceById } from "./utils/invoiceApi";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import InvoicesPage from "./pages/InvoicesPage";
import NegotiationsPage from "./pages/NegotiationsPage";
import RFQPage from "./pages/RFQPage";
import LandingPage from "./pages/LandingPage";
import RequestsPage from "./pages/RequestsPage";
import SettingsPage from "./pages/SettingsPage";
import NegotiationDetailsPage from "./pages/NegotiationDetailsPage";
import Homepage from "./pages/Homepage";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const sanitizeInvoiceData = (data) => {
  if (!data || typeof data !== "object") return data;
  return {
    ...data,
    senderPhone: (data.senderPhone || "").replace(/\D/g, ""),
  };
};

function App() {
  const [profile, setProfile] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("profile") || "null");
    } catch {
      return null;
    }
  });

  const [page, setPage] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("id") || params.get("request_id") || params.get("rfq"))
      return "main";
    try {
      const savedProfile = JSON.parse(
        localStorage.getItem("profile") || "null",
      );
      if (savedProfile) return "main";
    } catch {
      // ignore parse errors
    }
    return "landing";
  });
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [receivedInvoiceId, setReceivedInvoiceId] = useState(null);
  const [loadedInvoiceStatus, setLoadedInvoiceStatus] = useState(null);
  const [rfqId, setRfqId] = useState(null);
  const [totalInvoices, setTotalInvoices] = useState(null);
  const [profileStats, setProfileStats] = useState({});
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem("onboardingComplete");
  });
  const [showSidebar, setShowSidebar] = useState(true);

  const [invoice, setInvoice] = useState({
    internalNumber: `INV-${String(peekInvoiceCount()).padStart(4, "0")}`,
    number: generateRandomInvoiceId(),
    senderCompanyName: "",
    senderCompanyAddress: "",
    senderEmail: "",
    senderPhone: "",
    senderWebsite: "",
    clientName: "",
    clientCompanyName: "",
    clientEmail: "",
    date: "",
    dueDate: "",
    industry: "",
    currency: "NGN",
    tax: 0,
    notes: "",
    signerName: "",
    tagline: "Create polished invoices in under a minute",
  });

  const [items, setItems] = useState([]);
  const [signature, setSignature] = useState(null);
  const [logo, setLogo] = useState(null);
  const sigRef = useRef();

  const refreshInvoiceCount = () => {
    if (!profile?.id) return;
    getMyInvoices({ limit: 1, profileId: profile.id })
      .then((res) => setTotalInvoices(res.total))
      .catch(() => {});
  };

  useEffect(() => {
    refreshInvoiceCount();
    if (profile?.id) {
      fetch(`${API_BASE_URL}/api/profile/${profile.id}/stats`)
        .then((r) => (r.ok ? r.json() : {}))
        .then((stats) => setProfileStats(stats))
        .catch(() => {});
    }
  }, [profile?.id]);

  useEffect(() => {
    // Check for negotiation details in URL path
    const path = window.location.pathname;
    const negotiationMatch = path.match(/^\/negotiation\/(\d+)$/);
    if (negotiationMatch) {
      setPage("negotiation-details");
      return;
    }

    const hash = window.location.hash;
    if (hash === "#negotiation") {
      setTimeout(() => {
        const element = document.getElementById("negotiation-section");
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 500);
    }
  }, []);

  // Handle URL changes (for back/forward navigation and direct links)
  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const idParam = params.get("id");
      if (!idParam) return;

      getInvoiceById(idParam)
        .then((row) => {
          const p = row?.payload;
          if (!p) return;
          setReceivedInvoiceId(idParam);
          setLoadedInvoiceStatus(row.status || null);
          setInvoice((prev) => ({
            ...prev,
            invoice_number: row.invoice_number || prev.invoice_number,
            number: p.invoiceNumber || prev.number,
            senderCompanyName: p.companyName || prev.senderCompanyName,
            senderCompanyAddress: p.companyAddress || prev.senderCompanyAddress,
            senderEmail: p.companyEmail || prev.senderEmail,
            senderPhone: p.companyPhone || prev.senderPhone,
            senderWebsite: p.companyWebsite || prev.senderWebsite,
            clientName: p.clientName || prev.clientName,
            clientCompanyName: p.clientCompanyName || prev.clientCompanyName,
            clientEmail: p.clientEmail || prev.clientEmail,
            date: p.invoiceDate || prev.date,
            dueDate: p.dueDate || prev.dueDate,
            currency: p.currency || prev.currency,
            notes: p.notes || prev.notes,
            signerName: p.signerName || prev.signerName,
            tagline: p.tagline || prev.tagline,
            tax: p.taxRate != null ? p.taxRate : prev.tax,
            industry: p.industry || prev.industry,
          }));
          if (Array.isArray(p.items)) setItems(p.items);
          if (p.signature) setSignature(p.signature);
          setPage("main");
        })
        .catch((err) => console.error("Failed to load invoice:", err));
    };

    window.addEventListener("popstate", handleUrlChange);
    return () => window.removeEventListener("popstate", handleUrlChange);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rfqParam = params.get("rfq");
    if (rfqParam) {
      setRfqId(rfqParam);
      setPage("rfq");
    }

    // Handle request data from Requests page
    const requestId = params.get("request_id");
    if (requestId) {
      const requestNumber = params.get("request_number");
      const title = params.get("title");
      const requesterName = params.get("requester_name");
      const requesterEmail = params.get("requester_email");
      const poNumber = params.get("po_number");
      const materials = JSON.parse(params.get("materials") || "[]");
      const pricing = JSON.parse(params.get("pricing") || "[]");
      const taxRate = parseFloat(params.get("tax_rate") || "0");

      // Pre-fill invoice form with request data
      setInvoice((prev) => ({
        ...prev,
        clientName: requesterName || prev.clientName,
        clientEmail: requesterEmail || prev.clientEmail,
        notes: title ? `Request: ${title}\nPO: ${poNumber}` : prev.notes,
        tax: taxRate || prev.tax,
      }));

      // Create items from materials with pricing
      const items = materials.map((material) => {
        const priceItem = pricing.find((p) => p.materialId === material.id);
        return {
          id: material.id,
          description: material.name,
          quantity: material.quantity,
          rate: priceItem?.unitPrice || 0,
          amount: material.quantity * (priceItem?.unitPrice || 0),
        };
      });
      setItems(items);
      setPage("main");
      return;
    }

    const idParam = params.get("id");
    if (!idParam) return;
    getInvoiceById(idParam)
      .then((row) => {
        const p = row?.payload;
        if (!p) return;
        setReceivedInvoiceId(idParam);
        setLoadedInvoiceStatus(row.status || null);
        setInvoice((prev) => ({
          ...prev,
          invoice_number: row.invoice_number || prev.invoice_number,
          number: p.invoiceNumber || prev.number,
          senderCompanyName: p.companyName || prev.senderCompanyName,
          senderCompanyAddress: p.companyAddress || prev.senderCompanyAddress,
          senderEmail: p.companyEmail || prev.senderEmail,
          senderPhone: p.companyPhone || prev.senderPhone,
          senderWebsite: p.companyWebsite || prev.senderWebsite,
          clientName: p.clientName || prev.clientName,
          clientCompanyName: p.clientCompanyName || prev.clientCompanyName,
          clientEmail: p.clientEmail || prev.clientEmail,
          date: p.invoiceDate || prev.date,
          dueDate: p.dueDate || prev.dueDate,
          currency: p.currency || prev.currency,
          notes: p.notes || prev.notes,
          signerName: p.signerName || prev.signerName,
          tagline: p.tagline || prev.tagline,
          tax: p.taxRate != null ? p.taxRate : prev.tax,
          industry: p.industry || prev.industry,
        }));
        if (Array.isArray(p.items)) setItems(p.items);
        if (p.signature) setSignature(p.signature);
        // Navigate to main builder page
        setPage("main");
      })
      .catch((err) => console.error("Failed to load invoice:", err));
  }, []);

  useEffect(() => {
    if (invoice.clientEmail || invoice.industry) {
      recordInvoiceData({
        email: invoice.clientEmail,
        industry: invoice.industry,
      });
    }
  }, [invoice.clientEmail, invoice.industry]);

  const handleClearForm = () => {
    const nextNumber = generateInvoiceNumber();
    setInvoice({
      internalNumber: nextNumber,
      number: generateRandomInvoiceId(),
      senderCompanyName: "",
      senderCompanyAddress: "",
      senderEmail: "",
      senderPhone: "",
      senderWebsite: "",
      clientName: "",
      clientCompanyName: "",
      clientEmail: "",
      date: "",
      dueDate: "",
      industry: "",
      currency: "NGN",
      tax: 0,
      notes: "",
      signerName: "",
      tagline: "Create polished invoices in under a minute",
    });
    setItems([]);
    setSignature(null);
    setLogo(null);
    setReceivedInvoiceId(null);
    setLoadedInvoiceStatus(null);
    window.history.replaceState({}, "", "/");
    if (sigRef.current?.clear) sigRef.current.clear();
  };

  function handleLogin(profileObj) {
    localStorage.setItem("profile", JSON.stringify(profileObj));
    setProfile(profileObj);
    setPage("main");
    setShowOnboarding(!localStorage.getItem("onboardingComplete"));
  }

  function handleRegister(profileObj) {
    localStorage.setItem("profile", JSON.stringify(profileObj));
    setProfile(profileObj);
    setPage("main");
    setShowOnboarding(true);
  }

  function handleGuest() {
    setIsGuestMode(true);
    setProfile(null);
    setPage("main");
  }

  function handleCompleteOnboarding() {
    localStorage.setItem("onboardingComplete", "true");
    setShowOnboarding(false);
  }

  function handleLogout() {
    localStorage.removeItem("profile");
    localStorage.removeItem("onboardingComplete");
    setProfile(null);
    setPage("landing");
  }

  function handleNavigate(newPage) {
    setPage(newPage);
    if (newPage === "main") {
      handleClearForm();
    }
  }

  // Show sidebar for logged-in users on app pages (not for guests)
  const showSidebarNav =
    profile && page !== "landing" && page !== "login" && page !== "register";
  const showHeader = !profile && (page === "main" || page === "rfq");

  // Show onboarding overlay (skip for guest mode)
  if (
    showOnboarding &&
    !isGuestMode &&
    (page === "main" ||
      page === "invoices" ||
      page === "requests" ||
      page === "negotiations" ||
      page === "negotiation-details")
  ) {
    return (
      <>
        <Onboarding onComplete={handleCompleteOnboarding} currentPage={page} />
        <div style={{ pointerEvents: "none" }}>{renderContent()}</div>
      </>
    );
  }

  function renderContent() {
    if (page === "landing") {
      return (
        <LandingPage
          onGetStarted={() => {
            setIsGuestMode(true);
            setPage("main");
          }}
          onLogin={() => setPage("login")}
          invoiceCount={totalInvoices}
        />
      );
    }

    if (page === "login") {
      return (
        <LoginPage
          onLogin={handleLogin}
          onRegister={() => setPage("register")}
          onGuest={handleGuest}
        />
      );
    }

    if (page === "register") {
      return (
        <RegisterPage
          onRegister={handleRegister}
          onLogin={() => setPage("login")}
        />
      );
    }

    if (page === "profile") {
      return (
        <ProfilePage
          profile={profile}
          onBack={() => setPage("main")}
          onRetakeTour={() => {
            localStorage.removeItem("onboardingComplete");
            setShowOnboarding(true);
          }}
        />
      );
    }

    if (page === "settings") {
      return (
        <SettingsPage
          profile={profile}
          onBack={() => setPage("main")}
          onRetakeTour={() => {
            localStorage.removeItem("onboardingComplete");
            setShowOnboarding(true);
          }}
          onStartTutorial={() => {
            localStorage.removeItem("onboardingComplete");
            setShowOnboarding(true);
            setPage("main");
          }}
        />
      );
    }

    if (page === "home") {
      return profile ? (
        <Homepage
          profile={profile}
          onCreateInvoice={() => setPage("main")}
          onViewInvoices={() => setPage("invoices")}
          onViewRequests={() => setPage("requests")}
        />
      ) : (
        <LoginPage
          onLogin={handleLogin}
          onRegister={() => setPage("register")}
          onGuest={handleGuest}
        />
      );
    }

    if (page === "invoices") {
      return profile ? (
        <InvoicesPage profile={profile} onNavigate={handleNavigate} />
      ) : (
        <LoginPage
          onLogin={handleLogin}
          onRegister={() => setPage("register")}
          onGuest={handleGuest}
        />
      );
    }

    if (page === "requests") {
      return profile ? (
        <RequestsPage profile={profile} />
      ) : (
        <LoginPage
          onLogin={handleLogin}
          onRegister={() => setPage("register")}
          onGuest={handleGuest}
        />
      );
    }

    if (page === "negotiations") {
      return profile ? (
        <NegotiationsPage profile={profile} />
      ) : (
        <LoginPage
          onLogin={handleLogin}
          onRegister={() => setPage("register")}
          onGuest={handleGuest}
        />
      );
    }

    if (page === "negotiation-details") {
      return profile ? (
        <NegotiationDetailsPage profile={profile} onNavigate={handleNavigate} />
      ) : (
        <LoginPage
          onLogin={handleLogin}
          onRegister={() => setPage("register")}
          onGuest={handleGuest}
        />
      );
    }

    if (page === "rfq") {
      return <RFQPage profile={profile} currentRfqId={rfqId} />;
    }

    // Main builder page
    return (
      <>
        {showHeader && (
          <Header
            profile={profile}
            onLogin={() => setPage("login")}
            onCreateProfile={() => setPage("register")}
            onNavigate={handleNavigate}
            activePage="main"
            invoiceCount={totalInvoices}
            hideNavLinks={true}
          />
        )}
        <div
          className="main-container"
          style={{
            paddingTop: showHeader ? "100px" : "40px",
            gap: "40px",
          }}
        >
          <div className="left-side" style={{ gap: "32px" }}>
            <InvoiceForm
              invoice={invoice}
              onChange={(data) => setInvoice(sanitizeInvoiceData(data))}
              onLogoChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) =>
                  setLogo(event.target?.result || null);
                reader.readAsDataURL(file);
              }}
              viewOnly={!!receivedInvoiceId && loadedInvoiceStatus !== "draft"}
            />
            <InvoiceTable
              items={items}
              onItemsChange={setItems}
              currency={invoice.currency}
              viewOnly={!!receivedInvoiceId && loadedInvoiceStatus !== "draft"}
            />
            <div className="note-field">
              <label>
                Notes
                <textarea
                  value={invoice.notes}
                  onChange={(e) =>
                    setInvoice({ ...invoice, notes: e.target.value })
                  }
                  disabled={
                    !!receivedInvoiceId && loadedInvoiceStatus !== "draft"
                  }
                />
              </label>
            </div>
            <SignaturePad
              ref={sigRef}
              onEnd={() => {
                const dataUrl = sigRef.current?.toDataURL();
                if (dataUrl && dataUrl.length > 100) {
                  setSignature(dataUrl);
                }
              }}
              signerName={invoice.signerName}
              onSignerNameChange={(e) =>
                setInvoice({ ...invoice, signerName: e.target.value })
              }
              viewOnly={!!receivedInvoiceId && loadedInvoiceStatus !== "draft"}
            />
          </div>

          <div className="right-side" style={{ gap: "32px" }}>
            <InvoicePreview
              invoice={invoice}
              items={items}
              signature={signature}
              logo={logo}
              profileId={profile?.id}
              invoiceStatus={loadedInvoiceStatus}
            />
            <InvoiceSummary
              items={items}
              currency={invoice.currency}
              tax={invoice.tax}
            />
            <ExportActions
              invoice={invoice}
              items={items}
              signature={signature}
              logo={logo}
              tax={invoice.tax}
              profile={profile}
              receivedInvoiceId={receivedInvoiceId}
              existingDraftId={
                loadedInvoiceStatus === "draft" ? receivedInvoiceId : null
              }
              rfqId={rfqId}
              onSaved={(saved) => {
                refreshInvoiceCount();
                if (saved?.invoice_number) {
                  setInvoice((prev) => ({
                    ...prev,
                    invoice_number: saved.invoice_number,
                  }));
                }
              }}
              onLogin={() => setPage("login")}
              onInvoiceNumberUsed={(num) =>
                setInvoice((prev) => ({ ...prev, internalNumber: num }))
              }
              onClear={handleClearForm}
            />
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="app-layout">
      {showSidebarNav && (
        <SidebarNav
          currentPage={page}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          profile={profile}
          invoiceCount={totalInvoices || 0}
        />
      )}
      <main
        className={showSidebarNav ? "app-main app-main--sidebar" : "app-main"}
        style={{
          marginLeft: showSidebarNav ? "280px" : "0",
          transition: "margin-left 0.3s",
        }}
      >
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
