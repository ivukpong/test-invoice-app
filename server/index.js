import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { Resend } from "resend";
import { getPersistenceMode, initDb, saveInvoice, getInvoices } from "./db.js";
import { supabase } from "./db.js";
import profileRoutes from "./routes/profiles.js";
import notificationRoutes from "./routes/notifications.js";
import negotiationRoutes from "./routes/negotiations.js";
import authRoutes from "./routes/auth.js";
import requestRoutes from "./routes/requests.js";
import { sendWhatsApp } from "./whatsapp.js";

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(helmet());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:5173"];
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", persistence: getPersistenceMode() });
});

app.get("/api/invoices", async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

  try {
    const result = await getInvoices({ page, limit });
    return res.json(result);
  } catch (error) {
    console.error("Failed to fetch invoices", error);
    return res.status(500).json({ message: "Failed to fetch invoices." });
  }
});

app.get("/api/invoices/mine", async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const { profileId } = req.query;

  if (!profileId) {
    return res.status(400).json({ message: "profileId is required." });
  }

  try {
    const result = await getInvoices({ page, limit, profileId });
    return res.json(result);
  } catch (error) {
    console.error("Failed to fetch user invoices", error);
    return res.status(500).json({ message: "Failed to fetch invoices." });
  }
});

app.post("/api/invoices", async (req, res) => {
  const {
    invoiceNumber,
    clientEmail,
    senderCompanyName,
    total,
    currency,
    template,
    privacyPolicyAccepted,
    downloadedAt,
    payload,
    status,
  } = req.body || {};

  if (!privacyPolicyAccepted && status !== "draft") {
    return res.status(400).json({
      message: "Privacy policy must be accepted before storing invoice data.",
    });
  }

  if (!invoiceNumber || !currency || !template || !payload) {
    return res
      .status(400)
      .json({ message: "Missing required invoice fields." });
  }

  const { profileId, senderPhone } = req.body || {};

  try {
    const saved = await saveInvoice({
      invoiceNumber,
      clientEmail,
      senderCompanyName,
      total,
      currency,
      template,
      privacyPolicyAccepted,
      downloadedAt,
      payload,
      profileId: profileId || null,
      status: status || "saved",
    });

    // WhatsApp notification to invoice creator (if phone provided)
    if (senderPhone) {
      const appUrl =
        process.env.APP_URL || "https://your-invoice-app.vercel.app";
      const invoiceLink = `${appUrl}?id=${saved.id}`;
      sendWhatsApp(
        senderPhone,
        `Hi! Your invoice ${invoiceNumber} (${currency} ${total}) has been created. View and download it here: ${invoiceLink}`,
      ).catch(() => {});
    }

    return res.status(201).json({
      message: "Invoice saved successfully.",
      id: saved.id,
      invoice_number: saved.invoice_number,
      createdAt: saved.created_at,
    });
  } catch (error) {
    console.error("Failed to save invoice", error);
    return res.status(500).json({ message: "Failed to save invoice." });
  }
});

// ── GET /api/invoices/retrieve — find invoice by email + invoice number ──────
app.get("/api/invoices/retrieve", async (req, res) => {
  const { email, invoice_number } = req.query;
  if (!email || !invoice_number) {
    return res
      .status(400)
      .json({ error: "email and invoice_number are required" });
  }
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("client_email", email)
    .eq("invoice_number", invoice_number)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Invoice not found" });
  return res.json(data);
});

// ── GET /api/invoices/by-profile/:profileId — all invoices for a profile ────
app.get("/api/invoices/by-profile/:profileId", async (req, res) => {
  const { profileId } = req.params;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const { data, error, count } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, client_email, sender_company_name, total, currency, status, created_at, payload",
      { count: "exact" },
    )
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ invoices: data, total: count, page, limit });
});

// ── GET /api/invoices/:id — fetch a single saved invoice by database ID ──────
app.get("/api/invoices/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id || isNaN(id))
    return res.status(400).json({ error: "Invalid invoice ID" });
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Invoice not found" });
  return res.json(data);
});

// ── POST /api/invoices/:id/email-pdf — email a PDF to the profile's email ───
app.post("/api/invoices/:id/email-pdf", async (req, res) => {
  const { id } = req.params;
  const { pdfBase64, profileId } = req.body || {};
  if (!pdfBase64 || !profileId) {
    return res
      .status(400)
      .json({ error: "pdfBase64 and profileId are required" });
  }
  // Fetch profile email
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("email, name")
    .eq("id", profileId)
    .maybeSingle();
  if (pErr || !profile)
    return res.status(404).json({ error: "Profile not found" });

  if (!process.env.RESEND_API_KEY) {
    return res.status(503).json({ error: "Email service not configured" });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL_FROM || "Free Invoice <onboarding@resend.dev>";

  const pdfBuffer = Buffer.from(
    pdfBase64.replace(/^data:application\/pdf;base64,/, ""),
    "base64",
  );

  const { error: sendError } = await resend.emails.send({
    from,
    to: profile.email,
    subject: `Your Invoice — Free Invoice`,
    html: `<p>Hi ${profile.name || "there"},</p><p>Please find your invoice attached.</p><p>Thank you for using Free Invoice!</p>`,
    attachments: [
      {
        filename: `invoice-${id}.pdf`,
        content: pdfBuffer,
      },
    ],
  });

  if (sendError) {
    console.error("Resend error:", sendError);
    return res.status(500).json({ error: sendError.message });
  }

  return res.json({ message: "Invoice emailed successfully" });
});

// ── PATCH /api/invoices/:id — update an existing invoice (e.g., resave draft) ─
app.patch("/api/invoices/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id || isNaN(id))
    return res.status(400).json({ error: "Invalid invoice ID" });

  const {
    invoiceNumber,
    clientEmail,
    senderCompanyName,
    total,
    currency,
    template,
    payload,
    status,
    profileId,
  } = req.body || {};

  const updates = {};
  if (invoiceNumber !== undefined) updates.invoice_number = invoiceNumber;
  if (clientEmail !== undefined) updates.client_email = clientEmail;
  if (senderCompanyName !== undefined)
    updates.sender_company_name = senderCompanyName;
  if (total !== undefined) updates.total = total;
  if (currency !== undefined) updates.currency = currency;
  if (template !== undefined) updates.template = template;
  if (payload !== undefined) updates.payload = payload;
  if (status !== undefined) updates.status = status;

  let query = supabase.from("invoices").update(updates).eq("id", id);
  // Restrict update to the owning profile for security
  if (profileId) query = query.eq("profile_id", profileId);

  const { data, error } = await query.select().single();
  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
});

// ── POST /api/invoices/:id/finalize — lock invoice after quote acceptance ────
app.post("/api/invoices/:id/finalize", async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from("invoices")
    .update({ status: "finalized" })
    .eq("id", id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
});

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/negotiate", negotiationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/requests", requestRoutes);

async function start() {
  await initDb();
  app.listen(port, () => {
    console.log(`Invoice API server running on port ${port}`);
  });
}

// Export the app for Vercel serverless
export default app;

// Only start the HTTP server when executed directly (local dev)
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  start().catch((error) => {
    console.error("Failed to start API server", error);
    process.exit(1);
  });
}
