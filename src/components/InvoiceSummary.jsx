import React from "react";
import { calculateGrandTotal, formatCurrency } from "../utils/calculations";

export default function InvoiceSummary({ items, currency = "NGN", tax = 0 }) {
  const subtotal = calculateGrandTotal(items);
  const taxRate = parseFloat(tax) || 0;
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  return (
    <div className="invoice-summary">
      <p>
        <span>Subtotal: </span>
        <span>{formatCurrency(subtotal, "en-NG", currency)}</span>
      </p>
      <p>
        <span>Tax ({taxRate}%): </span>
        <span>{formatCurrency(taxAmount, "en-NG", currency)}</span>
      </p>
      <h3>
        <span>Total: </span>
        <span>{formatCurrency(total, "en-NG", currency)}</span>
      </h3>
    </div>
  );
}
