import express from "express";
import { supabase } from "../db.js";
const router = express.Router();

router.post("/", async (req, res) => {
  const { email, name, company, phone, role } = req.body;
  const { data, error } = await supabase
    .from("profiles")
    .insert([{ email, name, company, phone, role }])
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

router.get("/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", req.params.id)
    .single();
  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
});

/**
 * Columns a user may change about themselves.
 *
 * The update used to spread `req.body` straight into Supabase, so a caller could
 * set any column on the row — including `password_hash`, and the
 * `buildos_supplier_id`/`buildos_sync_status` fields the ERP sync owns. Only
 * these are editable; anything else in the body is ignored.
 *
 * `buildos_supplier_ref` IS editable: it is the vendor ID a user supplies to
 * link their portal account to an existing Procurement supplier.
 */
const EDITABLE_PROFILE_FIELDS = new Set([
  "name",
  "phone",
  "company",
  "category",
  "role",
  "buildos_supplier_ref",
  "settings",
]);

router.patch("/:id", async (req, res) => {
  const updates = {};
  for (const [key, value] of Object.entries(req.body ?? {})) {
    if (EDITABLE_PROFILE_FIELDS.has(key)) updates[key] = value;
  }
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No editable fields supplied" });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", req.params.id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  const { password_hash: _ph, ...safe } = data;
  res.json(safe);
});

// GET /api/profile/:id/stats — aggregate invoice counts by status
router.get("/:id/stats", async (req, res) => {
  const { data, error } = await supabase
    .from("invoices")
    .select("status")
    .eq("profile_id", req.params.id);
  if (error) return res.status(400).json({ error: error.message });

  const invoiceCount = data.length;
  const draftCount = data.filter((inv) => inv.status === "draft").length;
  const pendingCount = data.filter(
    (inv) => inv.status === "pending" || inv.status === "quote_submitted",
  ).length;

  res.json({ invoiceCount, draftCount, pendingCount });
});


/**
 * DELETE /api/profile/:id — closes an account.
 *
 * Backs the Settings → Privacy "Delete Account" action, which previously had no
 * handler at all. Invoices are deleted first: they reference the profile, so
 * removing the profile alone would either fail on the foreign key or strand
 * them.
 */
router.delete("/:id", async (req, res) => {
  const id = req.params.id;
  try {
    await supabase.from("invoices").delete().eq("profile_id", id);
    await supabase.from("notifications").delete().eq("profile_id", id);
    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ deleted: true });
  } catch (err) {
    console.error("Account deletion failed", err);
    return res.status(500).json({ error: "Could not delete the account." });
  }
});

export default router;
