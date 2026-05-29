import express from "express";
import { supabase } from "../db.js";
import { notifyProfiles } from "../notify.js";
const router = express.Router();

// Supplier submits a counter-offer
router.post("/", async (req, res) => {
  const { invoice_id, sender_profile_id, proposed_total, message } = req.body;

  const { data, error } = await supabase
    .from("negotiations")
    .insert([{ invoice_id, sender_profile_id, proposed_total, message }])
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });

  // Mark invoice as negotiating
  await supabase
    .from("invoices")
    .update({ status: "negotiating" })
    .eq("id", invoice_id);

  // Notify the buyer
  const { data: invoice } = await supabase
    .from("invoices")
    .select("profile_id, invoice_number")
    .eq("id", invoice_id)
    .single();
  if (invoice?.profile_id) {
    try {
      await notifyProfiles(
        [invoice.profile_id],
        invoice_id,
        "counter_offer",
        `New counter-offer on invoice ${invoice.invoice_number}`,
      );
    } catch (notifyErr) {
      console.error("notifyProfiles failed:", notifyErr);
    }
  }

  res.json(data);
});

// Get all negotiation threads for an invoice
router.get("/:invoiceId", async (req, res) => {
  const { data, error } = await supabase
    .from("negotiations")
    .select("*, profiles(name, company, role)")
    .eq("invoice_id", req.params.invoiceId)
    .order("created_at", { ascending: true });
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Accept a negotiation offer
router.patch("/:id/accept", async (req, res) => {
  const { data: neg, error } = await supabase
    .from("negotiations")
    .update({ status: "accepted" })
    .eq("id", req.params.id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });

  await supabase
    .from("invoices")
    .update({ status: "accepted", total: neg.proposed_total })
    .eq("id", neg.invoice_id);

  try {
    await notifyProfiles(
      [neg.sender_profile_id],
      neg.invoice_id,
      "accepted",
      "Your counter-offer was accepted!",
    );
  } catch (notifyErr) {
    console.error("notifyProfiles failed:", notifyErr);
  }
  res.json(neg);
});

// Reject a negotiation offer
router.patch("/:id/reject", async (req, res) => {
  const { data: neg, error } = await supabase
    .from("negotiations")
    .update({ status: "rejected" })
    .eq("id", req.params.id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });

  try {
    await notifyProfiles(
      [neg.sender_profile_id],
      neg.invoice_id,
      "rejected",
      "Your counter-offer was declined.",
    );
  } catch (notifyErr) {
    console.error("notifyProfiles failed:", notifyErr);
  }
  res.json(neg);
});

// GET /api/negotiate/:id/messages — fetch the message thread for a negotiation
router.get("/:id/messages", async (req, res) => {
  const { data, error } = await supabase
    .from("negotiation_messages")
    .select("*, profiles(name, company, role)")
    .eq("negotiation_id", req.params.id)
    .order("created_at", { ascending: true });
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// POST /api/negotiate/:id/messages — send a message in a negotiation thread
router.post("/:id/messages", async (req, res) => {
  const { sender_profile_id, content } = req.body;
  if (!sender_profile_id || !content) {
    return res
      .status(400)
      .json({ error: "sender_profile_id and content are required" });
  }
  const { data, error } = await supabase
    .from("negotiation_messages")
    .insert([{ negotiation_id: req.params.id, sender_profile_id, content }])
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

export default router;
