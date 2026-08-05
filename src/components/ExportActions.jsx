import React, { useState } from "react";
import * as XLSX from "xlsx";
import { Download, Eye, Mail, FileSpreadsheet, Save, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { calculateLineTotal } from "../utils/calculations";
import {
  downloadInvoicePdf,
  generateInvoicePdfDataUrl,
  generateInvoiceNumber,
} from "../utils/invoiceGenerator";
import { storeInvoiceAfterDownload, updateInvoice } from "../utils/invoiceApi";
import PdfPreviewModal from "./PdfPreviewModal";
import styles from "./ExportActions.module.css";

export default function ExportActions({
  invoice,
  items,
  signature,
  logo,
  tax = 0,
  profile,
  onSaved,
  onLogin,
  onInvoiceNumberUsed,
  receivedInvoiceId = null,
  existingDraftId = null,
  rfqId = null,
  submitAsQuote = false,
  buildosQuoteId = null,
  onClear,
}) {
  const [template, setTemplate] = useState("template-1");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pdfDataUrl, setPdfDataUrl] = useState(null);
  const [previewSession, setPreviewSession] = useState(0);
  const [savingAfterDownload, setSavingAfterDownload] = useState(false);
  const [savedInvoiceId, setSavedInvoiceId] = useState(null);
  const [emailStatus, setEmailStatus] = useState("idle");
  const [emailError, setEmailError] = useState(null);
  /** Surfaces a PDF/Excel export failure, which was previously console-only. */
  const [exportError, setExportError] = useState(null);

  const buildPdfData = () => {
    const subtotal = items.reduce(
      (sum, item) => sum + calculateLineTotal(item.quantity, item.unitPrice),
      0,
    );
    const taxRate = parseFloat(tax) || 0;
    const taxAmount = subtotal * (taxRate / 100);
    return {
      companyName: invoice.senderCompanyName,
      companyAddress: invoice.senderCompanyAddress,
      companyEmail: invoice.senderEmail,
      clientName: invoice.clientName,
      clientEmail: invoice.clientEmail,
      clientCompanyName: invoice.clientCompanyName,
      invoiceNumber: invoice.number,
      invoiceDate: invoice.date,
      dueDate: invoice.dueDate,
      items,
      subtotal,
      tax: taxAmount,
      total: subtotal + taxAmount,
      notes: invoice.notes,
      signature,
      signerName: invoice.signerName,
      logo,
      currency: invoice.currency,
      companyPhone: invoice.senderPhone,
      companyWebsite: invoice.senderWebsite,
      tagline: invoice.tagline,
      taxRate: parseFloat(tax) || 0,
      industry: invoice.industry,
    };
  };

  const handlePreviewPdf = () => {
    // Rendering can throw on malformed invoice data. Unhandled, the modal never
    // opened and nothing explained why the button appeared to do nothing.
    try {
      const dataUrl = generateInvoicePdfDataUrl(template, buildPdfData());
      setPdfDataUrl(dataUrl);
      setPreviewSession((prev) => prev + 1);
      setPreviewOpen(true);
      setExportError(null);
    } catch (err) {
      console.error("Failed to render the invoice preview", err);
      setExportError(
        "Could not generate the invoice preview. Please check the invoice details and try again.",
      );
    }
  };

  const handleDownloadDirect = () => {
    try {
      downloadInvoicePdf(template, buildPdfData());
      setExportError(null);
    } catch (err) {
      console.error("Failed to download the invoice", err);
      setExportError("Could not generate the invoice PDF. Please try again.");
    }
  };

  const handleConfirmDownload = async ({ privacyPolicyAccepted }) => {
    const newInternalNumber = generateInvoiceNumber();
    onInvoiceNumberUsed?.(newInternalNumber);
    const pdfData = buildPdfData();
    try {
      downloadInvoicePdf(template, pdfData);
      setExportError(null);
    } catch (err) {
      console.error("Failed to download the invoice", err);
      setExportError("Could not generate the invoice PDF. Please try again.");
      return;
    }

    if (!privacyPolicyAccepted) {
      return;
    }

    try {
      setSavingAfterDownload(true);
      const saved = await storeInvoiceAfterDownload({
        invoiceNumber: pdfData.invoiceNumber,
        clientEmail: pdfData.clientEmail,
        senderCompanyName: pdfData.companyName,
        total: pdfData.total,
        currency: pdfData.currency,
        template,
        privacyPolicyAccepted,
        downloadedAt: new Date().toISOString(),
        payload: pdfData,
        profileId: profile?.id || null,
        senderPhone: profile?.phone || invoice.senderPhone || null,
        status: submitAsQuote
          ? "quote_submitted"
          : existingDraftId
            ? "draft"
            : "saved",
        buildosQuoteId: submitAsQuote ? buildosQuoteId : null,
      });

      onSaved?.(saved);
      setSavedInvoiceId(saved.id);
      if (existingDraftId) {
        await updateInvoice(existingDraftId, { status: "saved" });
      }
    } catch (err) {
      console.error("Failed to save invoice after download", err);
    } finally {
      setSavingAfterDownload(false);
    }
  };

  const handleExportExcel = () => {
    const subtotal = items.reduce(
      (sum, item) => sum + calculateLineTotal(item.quantity, item.unitPrice),
      0,
    );
    const taxRate = parseFloat(tax) || 0;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    const data = [
      ["Invoice Number", invoice.number],
      ["Date", invoice.date],
      ["Due Date", invoice.dueDate],
      ["Company", invoice.senderCompanyName],
      ["Client", invoice.clientName],
      ["", ""],
      ["Description", "Quantity", "Unit Price", "Total"],
      ...items.map((item) => [
        item.description,
        item.quantity,
        item.unitPrice,
        calculateLineTotal(item.quantity, item.unitPrice),
      ]),
      ["", "", "Subtotal", subtotal],
      ["", "", `Tax (${taxRate}%)`, taxAmount],
      ["", "", "Total", total],
    ];

    try {
      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Invoice");
      // An invoice number can contain "/" or ":", which are illegal in a
      // filename — the download was rejected by the browser without a word.
      const safeNumber = String(invoice.number || "draft").replace(
        /[\\/:*?"<>|]/g,
        "-",
      );
      XLSX.writeFile(wb, `Invoice-${safeNumber}.xlsx`);
      setExportError(null);
    } catch (err) {
      console.error("Failed to export the invoice to Excel", err);
      setExportError("Could not export to Excel. Please try again.");
    }
  };

  const handleSaveDraft = async () => {
    if (!profile) {
      onLogin?.();
      return;
    }

    try {
      const pdfData = buildPdfData();
      const saved = await storeInvoiceAfterDownload({
        invoiceNumber: pdfData.invoiceNumber,
        clientEmail: pdfData.clientEmail,
        senderCompanyName: pdfData.companyName,
        total: pdfData.total,
        currency: pdfData.currency,
        template,
        privacyPolicyAccepted: false,
        payload: pdfData,
        profileId: profile.id,
        // Responding to a buyer request is a quote submission, not a private
        // draft — keep the BuildOS link so a buyer counter can find it back.
        status: submitAsQuote ? "quote_submitted" : "draft",
        buildosQuoteId: submitAsQuote ? buildosQuoteId : null,
      });

      onSaved?.(saved);
      setSavedInvoiceId(saved.id);
    } catch (err) {
      console.error("Failed to save draft", err);
    }
  };

  const handleEmailPdf = async () => {
    if (!profile) {
      onLogin?.();
      return;
    }

    setEmailStatus("sending");
    setEmailError(null);

    try {
      const dataUrl = generateInvoicePdfDataUrl(template, buildPdfData());
      await fetch(`/api/invoices/${savedInvoiceId || existingDraftId}/email-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdfBase64: dataUrl,
          profileId: profile.id,
        }),
      });

      setEmailStatus("sent");
    } catch (err) {
      setEmailStatus("error");
      setEmailError(err.message);
    }
  };

  const isSigned = signature && signature.trim() !== "";
  const hasRequiredFields = invoice.senderCompanyName && items.length > 0;
  const isGuest = !profile;

  return (
    <>
      <div className={styles.container}>
        <h3 className={styles.title}>Export & Share</h3>
        <p className={styles.subtitle}>
          Download, export, or send your invoice
        </p>

        {isGuest && (
          <>
            {/* Preview Button for Guests */}
            <div className={styles.guestActions}>
              <button
                className={styles.primaryButton}
                onClick={handlePreviewPdf}
                disabled={!hasRequiredFields}
              >
                <Eye size={18} />
                Preview Invoice
              </button>
            </div>

            <div className={styles.guestPrompt}>
              <div className={styles.guestIcon}>🔐</div>
              <h4 className={styles.guestTitle}>Sign in to Save & Export</h4>
              <p className={styles.guestText}>
                Create an account to save your invoices, export to Excel, and access all features.
              </p>
              <div className={styles.guestButtons}>
                <button className={styles.guestPrimary} onClick={onLogin}>
                  Sign In / Sign Up
                </button>
                <button className={styles.guestSecondary} onClick={onClear}>
                  Clear Form
                </button>
              </div>
            </div>
          </>
        )}

        {!isGuest && (
          <>
            {/* Template Selection */}
            <div className={styles.section}>
              <label className={styles.label}>Template</label>
              <select
                className={styles.select}
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
              >
                <option value="template-1">Modern Blue</option>
                <option value="template-2">Classic Professional</option>
                <option value="template-3">Minimal Clean</option>
              </select>
            </div>

            {/* Status Indicators */}
            <div className={styles.statusSection}>
              <div className={styles.statusItem}>
                {hasRequiredFields ? (
                  <CheckCircle2 className={styles.statusIconGood} size={18} />
                ) : (
                  <AlertCircle className={styles.statusIconBad} size={18} />
                )}
                <span>Required Fields</span>
              </div>
              <div className={styles.statusItem}>
                {isSigned ? (
                  <CheckCircle2 className={styles.statusIconGood} size={18} />
                ) : (
                  <AlertCircle className={styles.statusIconBad} size={18} />
                )}
                <span>Signature</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className={styles.actions}>
              <button
                className={styles.primaryButton}
                onClick={handlePreviewPdf}
                disabled={!hasRequiredFields}
              >
                <Eye size={18} />
                Preview & Download
              </button>

              <button
                className={styles.secondaryButton}
                onClick={handleExportExcel}
                disabled={items.length === 0}
              >
                <FileSpreadsheet size={18} />
                Export Excel
              </button>

              <button
                className={styles.secondaryButton}
                onClick={handleSaveDraft}
                disabled={!hasRequiredFields}
              >
                <Save size={18} />
                Save as Draft
              </button>

              {existingDraftId && (
                <button
                  className={styles.secondaryButton}
                  onClick={handleSaveDraft}
                  disabled={!hasRequiredFields}
                >
                  <RefreshCw size={18} />
                  Update Draft
                </button>
              )}

              {savedInvoiceId && (
                <button
                  className={styles.secondaryButton}
                  onClick={handleEmailPdf}
                  disabled={emailStatus === "sending"}
                >
                  {emailStatus === "sending" ? (
                    <Loader2 size={18} className={styles.spinner} />
                  ) : (
                    <Mail size={18} />
                  )}
                  {emailStatus === "sending" ? "Sending..." : "Email Invoice"}
                </button>
              )}
            </div>

            {/* Email Status */}
            {emailStatus === "sent" && (
              <div className={styles.successMessage}>
                <CheckCircle2 size={18} />
                Invoice sent successfully!
              </div>
            )}

            {emailStatus === "error" && (
              <div className={styles.errorMessage}>
                <AlertCircle size={18} />
                {emailError || "Failed to send email"}
              </div>
            )}

            {exportError && (
              <div className={styles.errorMessage}>
                <AlertCircle size={18} />
                {exportError}
              </div>
            )}

            {/* Clear Form */}
            <button className={styles.clearButton} onClick={onClear}>
              Clear Form & Start New
            </button>

            {/* Privacy Policy Notice */}
            <p className={styles.notice}>
              By downloading this invoice, you agree to our privacy policy and terms
              of service.
            </p>
          </>
        )}
      </div>

      {/* Keyed per preview so each one mounts fresh, clearing the privacy
          checkbox from the previous preview. */}
      <PdfPreviewModal
        key={previewSession}
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        pdfDataUrl={pdfDataUrl}
        onConfirm={handleConfirmDownload}
        isSaving={savingAfterDownload}
      />
    </>
  );
}
