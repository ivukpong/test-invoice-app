import express from "express";
import { supabase } from "../db.js";
import { buildosFetch, isBuildosConfigured } from "../buildosClient.js";

const router = express.Router();

// GET /api/requests?profileId=X — list ERP purchase requests for a supplier profile
router.get("/", async (req, res) => {
  const { profileId } = req.query;
  if (!profileId) {
    return res.status(400).json({ error: "profileId query param is required" });
  }

  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  res.json({ requests: data });
});

// GET /api/requests/:id — get a single purchase request by id
router.get("/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
});

// PATCH /api/requests/:id/status — update request status (e.g. accepted, declined)
router.patch("/:id/status", async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: "status is required" });

  const { data, error } = await supabase
    .from("requests")
    .update({ status })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  // Mirror status change to BuildOS ERP. A mirror failure must not fail the
  // supplier's action — the local status change already succeeded.
  if (isBuildosConfigured() && data.buildos_ref) {
    const path =
      data.buildos_event === "rfq.sent"
        ? `/sent-rfqs/${data.buildos_ref}`
        : data.buildos_event === "purchase-order.created"
          ? `/purchase-orders/${data.buildos_ref}`
          : `/purchase-requests/${data.buildos_ref}`;
    try {
      await buildosFetch(path, { method: "PATCH", body: { status } });
    } catch (buildosErr) {
      console.error("BuildOS status mirror failed:", buildosErr.message);
    }
  }

  res.json(data);
});

// POST /api/requests/:id/quote — send the supplier's priced response back to
// BuildOS as a Received Quote. This is the record BuildOS surfaces on its
// "Supplier Submissions" page, so every submission (RFQ, purchase request or
// purchase order) is recorded here to stay visible to the buyer.
router.post("/:id/quote", async (req, res) => {
  const { items, totalValue, notes, validUntil } = req.body || {};

  const { data: request, error: reqErr } = await supabase
    .from("requests")
    .select("*")
    .eq("id", req.params.id)
    .single();
  if (reqErr || !request) {
    return res.status(404).json({ error: "Request not found" });
  }

  if (!isBuildosConfigured()) {
    return res
      .status(503)
      .json({ error: "BuildOS integration is not configured" });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, buildos_supplier_id")
    .eq("id", request.profile_id)
    .single();

  const ref = request.buildos_ref || null;
  const event = request.buildos_event || "";
  const supplierName = profile?.name || request.requester?.name || "Supplier";
  const supplierId = profile?.buildos_supplier_id || null;
  const lines = Array.isArray(items) ? items : [];

  // A Received Quote links back via rfqRef or prRef. A purchase order has
  // neither on this model, so its reference is carried in the note instead.
  const noteParts = [];
  if (event === "purchase-order.created" && ref) noteParts.push(`PO ${ref}`);
  if (notes) noteParts.push(notes);

  try {
    const buildos = await buildosFetch("/received-quotes", {
      method: "POST",
      body: {
        rfqRef: event === "rfq.sent" ? ref : null,
        prRef: event === "purchase-request.created" ? ref : null,
        supplierName,
        supplierId,
        status: "pending_review",
        items: lines,
        totalValue: Number(totalValue) || 0,
        notes: noteParts.join(" — ") || null,
        validUntil: validUntil || null,
      },
    });

    await supabase
      .from("requests")
      .update({ status: "quoted", buildos_quote_id: buildos?.id || null })
      .eq("id", request.id);

    res.json({ ok: true, buildos });
  } catch (err) {
    console.error("BuildOS quote submit failed:", err.message);
    res.status(502).json({ error: `Could not send to BuildOS: ${err.message}` });
  }
});

export default router;
