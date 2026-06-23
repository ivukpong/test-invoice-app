import React from "react";

export default function InvoiceForm({
  invoice,
  onChange,
  onLogoChange,
  viewOnly,
}) {
  // Controlled inputs for invoice metadata
  const handleInput = (e) => {
    if (viewOnly) return;
    const { name, value } = e.target;
    if (name === "senderPhone") {
      onChange({ ...invoice, [name]: value.replace(/\D/g, "") });
      return;
    }
    onChange({ ...invoice, [name]: value });
  };

  return (
    <div
      className="invoice-form"
      style={viewOnly ? { pointerEvents: "none", opacity: 0.75 } : {}}
    >
      <label>
        Invoice ID
        <input
          name="number"
          value={invoice.number}
          onChange={handleInput}
        />
      </label>
      <label>
        Sender Company Name
        <input
          name="senderCompanyName"
          value={invoice.senderCompanyName}
          onChange={handleInput}
        />
      </label>
      <label>
        Sender Company Address
        <textarea
          name="senderCompanyAddress"
          value={invoice.senderCompanyAddress}
          onChange={handleInput}
        />
      </label>
      <label>
        Sender Email
        <input
          name="senderEmail"
          value={invoice.senderEmail || ""}
          onChange={handleInput}
          type="email"
        />
      </label>
      <label>
        Sender Phone
        <input
          name="senderPhone"
          value={invoice.senderPhone || ""}
          onChange={handleInput}
          type="tel"
          inputMode="numeric"
        />
      </label>
      <label>
        Sender Website
        <input
          name="senderWebsite"
          value={invoice.senderWebsite || ""}
          onChange={handleInput}
        />
      </label>
      <label>
        Client Name
        <input
          name="clientName"
          value={invoice.clientName}
          onChange={handleInput}
        />
      </label>
      <label>
        Client Company Name
        <input
          name="clientCompanyName"
          value={invoice.clientCompanyName}
          onChange={handleInput}
        />
      </label>
      <label>
        Client Email
        <input
          name="clientEmail"
          value={invoice.clientEmail}
          onChange={handleInput}
          type="email"
        />
      </label>
      <label>
        Invoice Date
        <input
          name="date"
          value={invoice.date}
          onChange={handleInput}
          type="date"
        />
      </label>
      <label>
        Due Date
        <input
          name="dueDate"
          value={invoice.dueDate}
          onChange={handleInput}
          type="date"
        />
      </label>
      <label>
        Currency
        <select name="currency" value={invoice.currency} onChange={handleInput}>
          <option value="NGN">NGN (₦)</option>
          <option value="USD">USD ($)</option>
          <option value="EUR">EUR (€)</option>
          <option value="GBP">GBP (£)</option>
        </select>
      </label>
      <label>
        Brand Tagline
        <input
          name="tagline"
          value={invoice.tagline || ""}
          onChange={handleInput}
        />
      </label>
      <label>
        Tax (%)
        <input
          name="tax"
          value={invoice.tax ?? 0}
          onChange={handleInput}
          type="number"
          min="0"
          max="100"
          step="0.01"
        />
      </label>
      <label>
        Industry
        <select name="industry" value={invoice.industry} onChange={handleInput}>
          <option value="">-- select --</option>
          <option>Construction</option>
          <option>Electrical</option>
          <option>Plumbing</option>
          <option>Retail</option>
          <option>Consulting</option>
          <option>Logistics</option>
          <option>Agriculture</option>
          <option>Other</option>
        </select>
      </label>
      <label>
        Company Logo
        <input type="file" accept="image/*" onChange={onLogoChange} />
      </label>
    </div>
  );
}
