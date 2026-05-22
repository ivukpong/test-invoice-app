import jsPDF from "jspdf";
import { calculateLineTotal } from "./calculations";

// simple invoice number generator using localStorage counter

// Read the current count without incrementing (safe to call on render)
export function peekInvoiceCount() {
  return parseInt(localStorage.getItem("invoiceCount") || "0", 10);
}

/**
 * Generate a random unique invoice ID in the format INV-XXXXXX.
 * Uses a cryptographically random base-36 string for uniqueness.
 */
export function generateRandomInvoiceId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let suffix = "";
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  for (let i = 0; i < 8; i++) {
    suffix += chars[array[i] % chars.length];
  }
  return `INV-${suffix}`;
}

// Increment the counter and return the next invoice number.
// Call this only when the user actually downloads an invoice.
export function generateInvoiceNumber() {
  const count = peekInvoiceCount() + 1;
  localStorage.setItem("invoiceCount", count);
  return `INV-${String(count).padStart(4, "0")}`;
}

/**
 * Record metadata for tracking
 * @param {{email?: string, industry?: string}} data
 */
export function recordInvoiceData(data) {
  if (data.email) {
    const emails = JSON.parse(localStorage.getItem("invoiceEmails") || "[]");
    if (!emails.includes(data.email)) {
      emails.push(data.email);
      localStorage.setItem("invoiceEmails", JSON.stringify(emails));
    }
  }
  if (data.industry) {
    const industries = JSON.parse(
      localStorage.getItem("invoiceIndustries") || "[]",
    );
    if (!industries.includes(data.industry)) {
      industries.push(data.industry);
      localStorage.setItem("invoiceIndustries", JSON.stringify(industries));
    }
  }
}

function getImageFormat(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string") return "PNG";
  if (dataUrl.includes("image/jpeg") || dataUrl.includes("image/jpg"))
    return "JPEG";
  if (dataUrl.includes("image/webp")) return "WEBP";
  return "PNG";
}

function getImageDimensions(doc, image) {
  try {
    const props = doc.getImageProperties(image);
    if (!props?.width || !props?.height) return null;
    return { width: props.width, height: props.height };
  } catch {
    return null;
  }
}

function getContainedImageSize(source, maxWidth, maxHeight) {
  if (!source?.width || !source?.height) {
    return { width: maxWidth, height: maxHeight };
  }

  const ratio = Math.min(maxWidth / source.width, maxHeight / source.height);
  return {
    width: Math.max(8, source.width * ratio),
    height: Math.max(8, source.height * ratio),
  };
}

function drawLogo(doc, image, options = {}) {
  if (!image) return;

  const {
    x,
    y,
    maxWidth = 36,
    maxHeight = 24,
    withCard = false,
    cardPadding = 2,
    cardFill = [255, 255, 255],
    cardBorder = [220, 226, 235],
    radius = 2,
  } = options;

  if (x == null || y == null) return;

  const dimensions = getImageDimensions(doc, image);
  const size = getContainedImageSize(dimensions, maxWidth, maxHeight);
  const dx = x + (maxWidth - size.width) / 2;
  const dy = y + (maxHeight - size.height) / 2;

  if (withCard) {
    const cardX = x - cardPadding;
    const cardY = y - cardPadding;
    const cardW = maxWidth + cardPadding * 2;
    const cardH = maxHeight + cardPadding * 2;
    doc.setFillColor(...cardFill);
    doc.roundedRect(cardX, cardY, cardW, cardH, radius, radius, "F");
    doc.setDrawColor(...cardBorder);
    doc.setLineWidth(0.25);
    doc.roundedRect(cardX, cardY, cardW, cardH, radius, radius, "S");
  }

  addImageIfPresent(doc, image, dx, dy, size.width, size.height);
}

function addImageIfPresent(doc, image, x, y, width, height) {
  if (!image) return;
  doc.addImage(image, getImageFormat(image), x, y, width, height);
}

function buildRows(items, currency) {
  return items.map((item) => ({
    description: item.description || "-",
    quantity: Number(item.quantity) || 0,
    unitPrice: Number(item.unitPrice) || 0,
    total: calculateLineTotal(item.quantity, item.unitPrice),
    currency,
  }));
}

// PDF-safe formatter — avoids Unicode currency symbols (e.g. ₦) that jsPDF cannot render
function formatPdfCurrency(value, currency = "NGN") {
  const num = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${currency} ${num}`;
}

// TEMPLATE 1: Corporate Premium
function drawTemplateOne(doc, data) {
  const rows = buildRows(data.items, data.currency);
  const subtotal = rows.reduce((s, r) => s + r.total, 0);
  const tax = data.tax || 0;
  const total = subtotal + tax;

  // White background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 297, "F");

  // Header band — deep navy
  doc.setFillColor(30, 53, 99);
  doc.rect(0, 0, 210, 50, "F");
  // Bright accent stripe at bottom of header
  doc.setFillColor(74, 105, 189);
  doc.rect(0, 47, 210, 3, "F");

  // Logo
  drawLogo(doc, data.logo, {
    x: 14,
    y: 10,
    maxWidth: 34,
    maxHeight: 24,
    withCard: true,
    cardPadding: 2,
    cardFill: [255, 255, 255],
    cardBorder: [218, 226, 240],
  });

  // INVOICE title (white)
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text("INVOICE", 52, 32);

  // Invoice meta — top right in header
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(data.invoiceNumber || "INV-001", 196, 16, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 200, 240);
  doc.text(`Issued: ${data.invoiceDate || "-"}`, 196, 26, { align: "right" });
  doc.text(`Due: ${data.dueDate || "-"}`, 196, 36, { align: "right" });

  // FROM section
  doc.setTextColor(100, 120, 150);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("FROM", 14, 64);
  doc.setTextColor(28, 28, 30);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(data.companyName || "-", 14, 72);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(80, 85, 95);
  const addrLines = doc.splitTextToSize(data.companyAddress || "-", 80);
  doc.text(addrLines, 14, 79);
  const afterAddr = 79 + addrLines.length * 4.5;
  doc.text(data.companyEmail || "-", 14, afterAddr + 3);
  if (data.companyPhone) doc.text(data.companyPhone, 14, afterAddr + 9);

  // BILL TO section
  doc.setTextColor(100, 120, 150);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO", 120, 64);
  doc.setTextColor(28, 28, 30);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(data.clientName || "-", 120, 72);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(80, 85, 95);
  doc.text(data.clientCompanyName || "-", 120, 79);
  doc.text(data.clientEmail || "-", 120, 85);

  // Section divider
  doc.setDrawColor(220, 226, 235);
  doc.setLineWidth(0.3);
  doc.line(14, 99, 196, 99);

  // Table header bar
  doc.setFillColor(30, 53, 99);
  doc.rect(14, 103, 182, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("DESCRIPTION", 18, 110);
  doc.text("UNIT PRICE", 130, 110, { align: "right" });
  doc.text("QTY", 152, 110, { align: "right" });
  doc.text("TOTAL", 194, 110, { align: "right" });

  // Table rows with alternating stripes
  let curY = 120;
  doc.setFontSize(8.5);
  rows.forEach((row, idx) => {
    const lines = doc.splitTextToSize(row.description, 68);
    const rh = Math.max(9, lines.length * 4.5 + 3);
    if (idx % 2 === 0) {
      doc.setFillColor(247, 249, 252);
      doc.rect(14, curY - 6, 182, rh, "F");
    }
    doc.setTextColor(30, 30, 35);
    doc.setFont("helvetica", "normal");
    doc.text(lines, 18, curY);
    doc.text(formatPdfCurrency(row.unitPrice, row.currency), 130, curY, {
      align: "right",
    });
    doc.text(String(row.quantity), 152, curY, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(formatPdfCurrency(row.total, row.currency), 194, curY, {
      align: "right",
    });
    curY += rh;
  });

  // Table bottom border
  doc.setDrawColor(220, 226, 235);
  doc.setLineWidth(0.5);
  doc.line(14, curY + 2, 196, curY + 2);

  // Summary box (right-aligned)
  const sy = curY + 12;
  doc.setFillColor(247, 249, 252);
  doc.roundedRect(118, sy, 78, 42, 4, 4, "F");
  doc.setDrawColor(220, 226, 235);
  doc.setLineWidth(0.3);
  doc.roundedRect(118, sy, 78, 42, 4, 4, "S");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 110, 130);
  doc.text("Subtotal", 124, sy + 11);
  doc.text(formatPdfCurrency(subtotal, data.currency), 194, sy + 11, {
    align: "right",
  });
  doc.text("Tax", 124, sy + 21);
  doc.text(formatPdfCurrency(tax, data.currency), 194, sy + 21, {
    align: "right",
  });
  doc.setDrawColor(200, 210, 225);
  doc.line(124, sy + 26, 194, sy + 26);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 53, 99);
  doc.text("TOTAL DUE", 124, sy + 36);
  doc.text(formatPdfCurrency(total, data.currency), 194, sy + 36, {
    align: "right",
  });

  // Signature
  const sigY = 240;
  if (data.signature)
    addImageIfPresent(doc, data.signature, 14, sigY - 18, 42, 18);
  doc.setDrawColor(180, 190, 205);
  doc.setLineWidth(0.3);
  doc.line(14, sigY, 64, sigY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 130, 145);
  doc.text(data.signerName || "Authorized Signature", 14, sigY + 5);

  // Footer band
  doc.setFillColor(30, 53, 99);
  doc.rect(0, 260, 210, 37, "F");
  doc.setFillColor(74, 105, 189);
  doc.rect(0, 260, 210, 3, "F");
  doc.setTextColor(160, 185, 225);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("NOTES & TERMS", 14, 272);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(210, 220, 240);
  doc.text(
    doc.splitTextToSize(
      data.notes ||
        "Thank you for your business. Payment due within the stated period.",
      84,
    ),
    14,
    278,
  );
  doc.setTextColor(160, 185, 225);
  doc.setFont("helvetica", "bold");
  doc.text("GET IN TOUCH", 128, 272);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(210, 220, 240);
  if (data.companyEmail) doc.text(data.companyEmail, 128, 278);
  if (data.companyPhone) doc.text(data.companyPhone, 128, 284);
  if (data.companyWebsite) doc.text(data.companyWebsite, 128, 290);
}

// TEMPLATE 2: Minimalist Monochrome
function drawTemplateTwo(doc, data) {
  const rows = buildRows(data.items, data.currency);
  const subtotal = rows.reduce((s, r) => s + r.total, 0);
  const tax = data.tax || 0;
  const total = subtotal + tax;

  // White background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 297, "F");

  // Top accent bar (black)
  doc.setFillColor(18, 18, 18);
  doc.rect(0, 0, 210, 2, "F");
  // Left sidebar accent
  doc.setFillColor(18, 18, 18);
  doc.rect(0, 0, 4, 297, "F");

  // Logo card
  drawLogo(doc, data.logo, {
    x: 14,
    y: 11,
    maxWidth: 40,
    maxHeight: 24,
    withCard: true,
    cardPadding: 2,
    cardFill: [255, 255, 255],
    cardBorder: [228, 228, 228],
  });

  // Big INVOICE word — top right
  doc.setTextColor(18, 18, 18);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(38);
  doc.text("INVOICE", 196, 30, { align: "right" });

  // Invoice number below title
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(data.invoiceNumber || "INV-001", 196, 40, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(`Issued: ${data.invoiceDate || "-"}`, 196, 48, { align: "right" });
  doc.text(`Due: ${data.dueDate || "-"}`, 196, 55, { align: "right" });

  // FROM — left side
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(130, 130, 130);
  doc.text("FROM", 14, 44);
  doc.setTextColor(18, 18, 18);
  doc.setFontSize(12);
  doc.text(data.companyName || "-", 14, 54);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  doc.text(doc.splitTextToSize(data.companyAddress || "-", 74), 14, 62);
  doc.text(data.companyEmail || "-", 14, 77);
  if (data.companyPhone) doc.text(data.companyPhone, 14, 83);

  // Full-width divider
  doc.setDrawColor(18, 18, 18);
  doc.setLineWidth(0.8);
  doc.line(14, 90, 196, 90);

  // BILL TO box
  doc.setFillColor(245, 245, 245);
  doc.rect(14, 96, 90, 32, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(130, 130, 130);
  doc.text("BILL TO", 20, 106);
  doc.setTextColor(18, 18, 18);
  doc.setFontSize(10);
  doc.text(data.clientName || "-", 20, 115);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  doc.text(data.clientCompanyName || "-", 20, 122);
  doc.text(data.clientEmail || "-", 20, 128);

  // Invoice details box
  doc.setFillColor(245, 245, 245);
  doc.rect(114, 96, 82, 32, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(130, 130, 130);
  doc.text("INVOICE DETAILS", 120, 106);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(50, 50, 50);
  doc.text(`Invoice #: ${data.invoiceNumber || "-"}`, 120, 115);
  doc.text(`Date: ${data.invoiceDate || "-"}`, 120, 122);
  doc.text(`Due: ${data.dueDate || "-"}`, 120, 129);

  // Table
  const tStart = 138;
  doc.setFillColor(18, 18, 18);
  doc.rect(14, tStart, 182, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("DESCRIPTION", 18, tStart + 7);
  doc.text("UNIT PRICE", 130, tStart + 7, { align: "right" });
  doc.text("QTY", 152, tStart + 7, { align: "right" });
  doc.text("TOTAL", 194, tStart + 7, { align: "right" });

  let curY = tStart + 17;
  doc.setFontSize(8.5);
  rows.forEach((row, idx) => {
    const lines = doc.splitTextToSize(row.description, 68);
    const rh = Math.max(9, lines.length * 4.5 + 3);
    if (idx % 2 !== 0) {
      doc.setFillColor(245, 245, 245);
      doc.rect(14, curY - 6, 182, rh, "F");
    }
    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "normal");
    doc.text(lines, 18, curY);
    doc.text(formatPdfCurrency(row.unitPrice, row.currency), 130, curY, {
      align: "right",
    });
    doc.text(String(row.quantity), 152, curY, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(formatPdfCurrency(row.total, row.currency), 194, curY, {
      align: "right",
    });
    curY += rh;
  });

  // Table bottom border
  doc.setDrawColor(18, 18, 18);
  doc.setLineWidth(0.8);
  doc.line(14, curY + 3, 196, curY + 3);

  // Summary (right-aligned)
  const sy = curY + 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 100);
  doc.text("Subtotal", 152, sy, { align: "right" });
  doc.setTextColor(30, 30, 30);
  doc.text(formatPdfCurrency(subtotal, data.currency), 194, sy, {
    align: "right",
  });
  doc.setTextColor(100, 100, 100);
  doc.text("Tax", 152, sy + 9, { align: "right" });
  doc.setTextColor(30, 30, 30);
  doc.text(formatPdfCurrency(tax, data.currency), 194, sy + 9, {
    align: "right",
  });
  doc.setDrawColor(18, 18, 18);
  doc.setLineWidth(0.8);
  doc.line(120, sy + 13, 196, sy + 13);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(18, 18, 18);
  doc.text("TOTAL", 152, sy + 23, { align: "right" });
  doc.text(formatPdfCurrency(total, data.currency), 194, sy + 23, {
    align: "right",
  });

  // Signature
  const sigY = 240;
  if (data.signature)
    addImageIfPresent(doc, data.signature, 14, sigY - 16, 42, 16);
  doc.setDrawColor(18, 18, 18);
  doc.setLineWidth(0.5);
  doc.line(14, sigY, 64, sigY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(data.signerName || "Authorized Signature", 14, sigY + 5);

  // Notes
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text("Notes", 14, 263);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(110, 110, 110);
  doc.text(
    doc.splitTextToSize(data.notes || "Thank you for your business.", 100),
    14,
    269,
  );

  // Bottom bar
  doc.setFillColor(18, 18, 18);
  doc.rect(0, 291, 210, 6, "F");
}

// TEMPLATE 3: Bold Creative
function drawTemplateThree(doc, data) {
  const rows = buildRows(data.items, data.currency);
  const subtotal = rows.reduce((s, r) => s + r.total, 0);
  const tax = data.tax || 0;
  const total = subtotal + tax;

  // Warm parchment background
  doc.setFillColor(250, 247, 239);
  doc.rect(0, 0, 210, 297, "F");

  // Ribbon-style top bars
  doc.setFillColor(223, 91, 67);
  doc.rect(0, 0, 210, 26, "F");
  doc.setFillColor(35, 76, 120);
  doc.rect(0, 26, 210, 12, "F");
  doc.setFillColor(244, 197, 89);
  doc.rect(0, 38, 210, 3, "F");

  // Decorative corner motif
  doc.setFillColor(35, 76, 120);
  doc.triangle(0, 0, 38, 0, 0, 38, "F");
  doc.setFillColor(244, 197, 89);
  doc.triangle(0, 0, 22, 0, 0, 22, "F");

  // Logo
  drawLogo(doc, data.logo, {
    x: 14,
    y: 6,
    maxWidth: 46,
    maxHeight: 28,
    withCard: true,
    cardPadding: 2,
    cardFill: [255, 255, 255],
    cardBorder: [233, 215, 184],
  });

  // INVOICE title
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("INVOICE", 196, 18, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(data.invoiceNumber || "INV-001", 196, 30, { align: "right" });

  // Company contact line
  doc.setTextColor(60, 65, 75);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(data.companyName || "-", 14, 54);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(80, 90, 110);
  doc.text(data.companyAddress || "-", 14, 61);
  doc.text(data.companyEmail || "-", 14, 68);
  doc.text(data.companyPhone || "-", 84, 68);
  doc.text(data.companyWebsite || "-", 138, 68);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(80, 90, 110);
  doc.text(`Issued: ${data.invoiceDate || "-"}`, 196, 54, { align: "right" });
  doc.text(`Due: ${data.dueDate || "-"}`, 196, 61, { align: "right" });

  // Bill To card
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, 82, 88, 40, 5, 5, "F");
  doc.setDrawColor(231, 214, 182);
  doc.setLineWidth(0.4);
  doc.roundedRect(14, 82, 88, 40, 5, 5, "S");
  // card header bar
  doc.setFillColor(35, 76, 120);
  doc.roundedRect(14, 82, 88, 11, 5, 5, "F");
  doc.rect(14, 87, 88, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("BILL TO", 20, 90);
  doc.setTextColor(28, 28, 30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(data.clientName || "-", 20, 102);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(80, 85, 100);
  doc.text(data.clientCompanyName || "-", 20, 109);
  doc.text(data.clientEmail || "-", 20, 116);

  // Invoice details card
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(110, 82, 86, 40, 5, 5, "F");
  doc.setDrawColor(231, 214, 182);
  doc.roundedRect(110, 82, 86, 40, 5, 5, "S");
  doc.setFillColor(223, 91, 67);
  doc.roundedRect(110, 82, 86, 11, 5, 5, "F");
  doc.rect(110, 87, 86, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("INVOICE DETAILS", 116, 90);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(60, 65, 80);
  doc.text(`Invoice #:  ${data.invoiceNumber || "-"}`, 116, 102);
  doc.text(`Date:         ${data.invoiceDate || "-"}`, 116, 109);
  doc.text(`Due:           ${data.dueDate || "-"}`, 116, 116);

  // Table card (white rounded rectangle)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, 130, 182, 90, 6, 6, "F");
  doc.setDrawColor(231, 214, 182);
  doc.roundedRect(14, 130, 182, 90, 6, 6, "S");

  // Table header
  doc.setFillColor(35, 76, 120);
  doc.roundedRect(14, 130, 182, 12, 6, 6, "F");
  doc.rect(14, 136, 182, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("DESCRIPTION", 20, 138);
  doc.text("UNIT PRICE", 130, 138, { align: "right" });
  doc.text("QTY", 152, 138, { align: "right" });
  doc.text("TOTAL", 192, 138, { align: "right" });

  let curY = 149;
  doc.setFontSize(8.5);
  rows.forEach((row, idx) => {
    const lines = doc.splitTextToSize(row.description, 66);
    const rh = Math.max(9, lines.length * 4.5 + 3);
    if (idx % 2 === 0) {
      doc.setFillColor(252, 247, 237);
      doc.rect(14, curY - 6, 182, rh, "F");
    }
    doc.setTextColor(46, 49, 57);
    doc.setFont("helvetica", "normal");
    doc.text(lines, 20, curY);
    doc.text(formatPdfCurrency(row.unitPrice, row.currency), 130, curY, {
      align: "right",
    });
    doc.text(String(row.quantity), 152, curY, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(formatPdfCurrency(row.total, row.currency), 192, curY, {
      align: "right",
    });
    curY += rh;
  });

  // Summary box (navy pill)
  const sy = curY + 10;
  doc.setFillColor(35, 76, 120);
  doc.roundedRect(108, sy, 88, 38, 6, 6, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(194, 221, 245);
  doc.text("Subtotal", 114, sy + 11);
  doc.setTextColor(255, 255, 255);
  doc.text(formatPdfCurrency(subtotal, data.currency), 192, sy + 11, {
    align: "right",
  });
  doc.setTextColor(194, 221, 245);
  doc.text("Tax", 114, sy + 21);
  doc.setTextColor(255, 255, 255);
  doc.text(formatPdfCurrency(tax, data.currency), 192, sy + 21, {
    align: "right",
  });
  doc.setDrawColor(244, 197, 89);
  doc.setLineWidth(0.4);
  doc.line(114, sy + 25, 192, sy + 25);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(252, 226, 167);
  doc.text("TOTAL DUE", 114, sy + 34);
  doc.setTextColor(255, 255, 255);
  doc.text(formatPdfCurrency(total, data.currency), 192, sy + 34, {
    align: "right",
  });

  // Signature
  const sigY = 242;
  if (data.signature)
    addImageIfPresent(doc, data.signature, 14, sigY - 18, 42, 18);
  doc.setDrawColor(214, 196, 166);
  doc.setLineWidth(0.3);
  doc.line(14, sigY, 64, sigY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 109, 88);
  doc.text(data.signerName || "Authorized Signature", 14, sigY + 5);

  // Notes
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(88, 79, 62);
  doc.text("Notes", 14, 262);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 109, 88);
  doc.text(
    doc.splitTextToSize(
      data.notes ||
        "Thank you for your business. We look forward to working with you again.",
      100,
    ),
    14,
    268,
  );

  // Decorative footer bars
  doc.setFillColor(223, 91, 67);
  doc.rect(0, 291, 210, 3, "F");
  doc.setFillColor(35, 76, 120);
  doc.rect(0, 294, 210, 3, "F");
}

function buildDoc(template, data) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  if (template === "template-2") drawTemplateTwo(doc, data);
  else if (template === "template-3") drawTemplateThree(doc, data);
  else drawTemplateOne(doc, data);
  return doc;
}

export function generateInvoicePdfDataUrl(template, data) {
  return buildDoc(template, data).output("datauristring");
}

export function downloadInvoicePdf(template, data) {
  buildDoc(template, data).save(`${data.invoiceNumber || "invoice-draft"}.pdf`);
}
