import React from "react";
import { formatCurrency, calculateLineTotal } from "../utils/calculations";
import NegotiationPanel from "./NegotiationPanel";

export default function InvoicePreview({
  invoice,
  items,
  signature,
  logo,
  profileId,
  invoiceStatus,
}) {
  const total = items.reduce(
    (sum, i) => sum + calculateLineTotal(i.quantity, i.unitPrice),
    0,
  );

  // Determine if the current profile is the invoice owner
  const isOwner =
    profileId &&
    invoice.senderEmail &&
    localStorage.getItem("profileId") === profileId;

  return (
    <div className="invoice-preview">
      {logo && (
        <img
          src={logo}
          alt="Company logo"
          style={{ maxWidth: 120, marginBottom: 12 }}
        />
      )}
      <h2>Invoice {invoice.number}</h2>
      <p>
        <strong>Sender:</strong> {invoice.senderCompanyName || "-"}
      </p>
      <p>
        <strong>Sender Address:</strong> {invoice.senderCompanyAddress || "-"}
      </p>
      <p>
        <strong>Sender Email:</strong> {invoice.senderEmail || "-"}
      </p>
      <p>
        <strong>Client:</strong> {invoice.clientName || "-"} (
        {invoice.clientEmail || "-"})
      </p>
      <p>
        <strong>Receiver Company:</strong> {invoice.clientCompanyName || "-"}
      </p>
      <p>
        <strong>Date:</strong> {invoice.date} <strong>Due:</strong>{" "}
        {invoice.dueDate}
      </p>
      <table className="table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx}>
              <td>{item.description}</td>
              <td>{item.quantity}</td>
              <td>
                {formatCurrency(item.unitPrice, "en-NG", invoice.currency)}
              </td>
              <td>
                {formatCurrency(
                  calculateLineTotal(item.quantity, item.unitPrice),
                  "en-NG",
                  invoice.currency,
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", margin: "24px 0" }}>
        {formatCurrency(total, "en-NG", invoice.currency)}
      </h3>
      
      {invoice.notes && (
        <div className="note-section" style={{ marginBottom: "24px" }}>
          <p className="note-field" style={{ 
            padding: "20px", 
            background: "#f8fafc", 
            border: "1px solid #e2e8f0", 
            borderRadius: "12px",
            margin: 0
          }}>
            <strong style={{ color: "#3b82f6" }}>Notes:</strong> {invoice.notes}
          </p>
        </div>
      )}
      
      {signature && (
        <div className="signature-section" style={{ 
          marginTop: "24px", 
          paddingTop: "24px", 
          borderTop: "2px solid #e2e8f0",
          background: "#eff6ff",
          padding: "24px",
          borderRadius: "12px"
        }}>
          <p style={{ 
            fontSize: "0.875rem", 
            fontWeight: 600, 
            color: "#64748b", 
            textTransform: "uppercase", 
            letterSpacing: "0.05em",
            marginBottom: "12px"
          }}>Signature</p>
          <img 
            src={signature} 
            alt="Signature" 
            style={{ 
              maxWidth: "250px", 
              width: "auto",
              height: "auto",
              display: "block",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              background: "#fff",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
            }} 
          />
          {invoice.signerName && (
            <p className="signer-name" style={{
              marginTop: "12px",
              fontSize: "0.9375rem",
              color: "#0f172a"
            }}>
              <strong style={{ color: "#3b82f6" }}>Signed by:</strong> {invoice.signerName}
            </p>
          )}
        </div>
      )}

      {/* NegotiationPanel integration */}
      {profileId && invoice.invoice_number && invoiceStatus !== "draft" && (
        <NegotiationPanel
          invoiceId={invoice.invoice_number}
          profileId={profileId}
          isOwner={isOwner}
        />
      )}
    </div>
  );
}
