import { ArrowLeft } from "lucide-react";

const LINKS = [
  { slug: "terms", label: "Terms & Conditions" },
  { slug: "privacy", label: "Privacy Policy" },
  { slug: "kyc", label: "KYC Policy" },
  { slug: "commission", label: "Commission Policy" },
];

const CONTENT = {
  terms: {
    title: "Terms & Conditions",
    subtitle:
      "The terms governing your access to and use of the Sabiquot platform and related services.",
    updated: "Effective 1 June 2026 · Last updated 31 May 2026",
    sections: [
      {
        heading: "Introduction",
        body: [
          "Welcome to Sabiquot. These Terms and Conditions (\u201cTerms\u201d) govern your access to and use of our website, applications, dashboards, and related services. By accessing or using Sabiquot, you acknowledge that you have read, understood, and agreed to be bound by these Terms. If you do not agree with any part of these Terms, you should discontinue use of our services immediately.",
          "Sabiquot provides invoicing, quoting, and business transaction tools. Sabiquot does not guarantee financial outcomes, provide financial advice, or act as a bank or licensed investment fund.",
        ],
      },
      {
        heading: "Disclaimer",
        body: [
          "While Sabiquot strives to keep all information accurate and up to date, we do not warrant the completeness, accuracy, or reliability of any content. The platform is provided on an \u201cas is\u201d and \u201cas available\u201d basis, and we disclaim all implied warranties of merchantability, fitness for a particular purpose, and non-infringement to the fullest extent permitted by law.",
        ],
      },
      {
        heading: "Registration",
        body: [
          "To use certain features, you must be at least eighteen (18) years old and provide accurate, complete, and current information. You are responsible for keeping your account details current and for activity under your account. By registering, you consent to service-related communications; you may opt out of non-essential marketing at any time.",
        ],
      },
      {
        heading: "Acceptable Use",
        body: [
          "You agree to use Sabiquot only for lawful purposes. You may not misuse the platform, attempt unauthorized access, reverse engineer the software, or use it to infringe the rights of others. Sabiquot may suspend or terminate accounts for misconduct or policy violations.",
        ],
      },
      {
        heading: "Electronic Acceptance",
        body: [
          "By clicking \u201cI Agree,\u201d \u201cAccept,\u201d \u201cContinue,\u201d or similar, you provide a legally binding acceptance of these Terms and the Privacy Policy. Electronic signatures and records have the same legal effect as physically signed documents under applicable law.",
        ],
      },
      {
        heading: "Limitation of Liability",
        body: [
          "To the fullest extent permitted by law, Sabiquot is not liable for indirect, incidental, or consequential losses arising from use of the platform. Total aggregate liability shall not exceed fees paid for the relevant service. Nothing excludes liability for fraud or willful misconduct.",
        ],
      },
      {
        heading: "Governing Law",
        body: [
          "These Terms are governed by the laws of the Federal Republic of Nigeria, with disputes resolved by negotiation, then arbitration in Lagos under the Arbitration and Mediation Act 2023.",
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    subtitle:
      "How Sabiquot collects, uses, stores, and protects your personal information.",
    updated: "",
    sections: [
      {
        heading: "1. Introduction",
        body: [
          "Sabiquot is committed to protecting the privacy and security of personal information collected through our website, application, and services. This Policy explains how we collect, use, store, disclose, and protect information. By using Sabiquot, you agree to this Policy.",
        ],
      },
      {
        heading: "2. Information We Collect",
        body: [
          "We collect name, email, company name, industry, purchase details, account credentials, and transaction history. We also collect technical and usage data such as IP address, device and browser information, login activity, and cookies, as well as support communications.",
        ],
      },
      {
        heading: "3. How We Use Information",
        bullets: [
          "Creating and managing accounts.",
          "Processing invoices, quotes, and transactions.",
          "Providing functionality and customer support.",
          "Improving performance, security, and user experience.",
          "Detecting fraud and complying with legal obligations.",
        ],
      },
      {
        heading: "4. Sharing & Disclosure",
        body: [
          "We may share information with payment processors, compliance providers, legal authorities where required, and technology and cloud providers. Sabiquot does not sell personal information to third parties.",
        ],
      },
      {
        heading: "5. Data Security",
        body: [
          "We use encrypted storage, role-based access control, and secure gateways. No internet platform is completely secure; users acknowledge inherent transmission risks.",
        ],
      },
      {
        heading: "6. Your Rights",
        bullets: [
          "Access your personal information.",
          "Correct inaccurate or incomplete information.",
          "Request deletion where legally permissible.",
          "Withdraw consent where processing relies on consent.",
        ],
      },
      {
        heading: "7. Contact",
        body: [
          "For questions or requests, contact Sabiquot through the official support channels on the platform.",
        ],
      },
    ],
  },
  kyc: {
    title: "KYC Policy",
    subtitle:
      "Identity verification, required documentation, and compliance requirements.",
    updated: "",
    sections: [
      {
        heading: "1. Purpose",
        body: [
          "Sabiquot maintains a secure and compliant environment. This Know Your Customer (\u201cKYC\u201d) Policy verifies user identity, prevents fraud, and ensures compliance with applicable laws and risk management procedures.",
        ],
      },
      {
        heading: "2. Required Documentation",
        bullets: [
          "Valid government-issued ID (passport, national ID, driver's license, or voter's card).",
          "Proof of address where applicable.",
          "Verified phone number and email address.",
          "Bank or payment information where applicable.",
        ],
      },
      {
        heading: "3. Verification & Monitoring",
        body: [
          "Submitted information is reviewed and verified. Sabiquot may request additional documents, restrict accounts with suspicious information, monitor activity, and report suspicious conduct to relevant authorities.",
        ],
      },
      {
        heading: "4. Failure to Comply",
        body: [
          "Failure to satisfy KYC requirements may result in restricted access, transaction delays, or account termination. Sabiquot is not liable for losses from a user's failure to comply.",
        ],
      },
    ],
  },
  commission: {
    title: "Commission Policy",
    subtitle:
      "Eligibility, allocation, and payment of commissions for authorized partners and agents.",
    updated: "",
    sections: [
      {
        heading: "Eligibility",
        body: [
          "Commissions become payable only where a transaction completes through official channels, payment is verified, and the transaction is finalized. No commission is payable for unpaid, cancelled, fraudulent, or non-compliant transactions.",
        ],
      },
      {
        heading: "Calculation",
        bullets: [
          "Commission rates are defined per agreement.",
          "Commission is calculated on actual funds received.",
          "Partial payments generate proportional commission.",
        ],
      },
      {
        heading: "Clawback",
        body: [
          "Sabiquot may withhold or recover commissions paid where a payment is reversed, a transaction is fraudulent, or amounts were paid in error. Recipients must promptly refund invalid commissions on demand.",
        ],
      },
      {
        heading: "Disputes",
        body: [
          "Commission disputes must be submitted in writing within seven (7) days of payout notification. Failure to do so constitutes acceptance, except for manifest error or fraud.",
        ],
      },
    ],
  },
};

export default function LegalPage({ slug, onBack, onNavigate }) {
  const doc = CONTENT[slug] || CONTENT.terms;

  return (
    <div style={s.page}>
      <div style={s.inner}>
        <button style={s.back} onClick={onBack}>
          <ArrowLeft size={18} /> Back
        </button>
        <h1 style={s.title}>{doc.title}</h1>
        {doc.subtitle && <p style={s.subtitle}>{doc.subtitle}</p>}
        {doc.updated && <p style={s.updated}>{doc.updated}</p>}

        <div style={s.sections}>
          {doc.sections.map((sec, i) => (
            <section key={i}>
              <h2 style={s.heading}>{sec.heading}</h2>
              {sec.body?.map((p, j) => (
                <p key={j} style={s.body}>
                  {p}
                </p>
              ))}
              {sec.bullets && (
                <ul style={s.list}>
                  {sec.bullets.map((b, k) => (
                    <li key={k} style={s.li}>
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <div style={s.related}>
          <p style={s.relatedLabel}>Related policies</p>
          <div style={s.relatedLinks}>
            {LINKS.filter((l) => l.slug !== slug).map((l) => (
              <button
                key={l.slug}
                style={s.relatedBtn}
                onClick={() => onNavigate(l.slug)}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    padding: "40px 16px 80px",
  },
  inner: { maxWidth: 820, margin: "0 auto" },
  back: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "transparent",
    border: "none",
    color: "#4f46e5",
    fontSize: 14,
    cursor: "pointer",
    marginBottom: 24,
  },
  title: { fontSize: 34, fontWeight: 700, color: "#0f172a", margin: 0 },
  subtitle: { color: "#475569", fontSize: 17, marginTop: 12, lineHeight: 1.6 },
  updated: { color: "#94a3b8", fontSize: 13, marginTop: 8 },
  sections: {
    marginTop: 32,
    display: "flex",
    flexDirection: "column",
    gap: 28,
  },
  heading: {
    fontSize: 20,
    fontWeight: 600,
    color: "#1e293b",
    marginBottom: 10,
  },
  body: { color: "#475569", lineHeight: 1.7, marginBottom: 10 },
  list: { paddingLeft: 22, color: "#475569", lineHeight: 1.7 },
  li: { marginBottom: 6 },
  related: { marginTop: 48, paddingTop: 24, borderTop: "1px solid #e2e8f0" },
  relatedLabel: { fontSize: 13, color: "#64748b", marginBottom: 12 },
  relatedLinks: { display: "flex", flexWrap: "wrap", gap: 10 },
  relatedBtn: {
    padding: "8px 16px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#1e293b",
    fontSize: 14,
    cursor: "pointer",
  },
};
