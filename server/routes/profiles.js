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

router.patch("/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("profiles")
    .update(req.body)
    .eq("id", req.params.id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
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

export default router;
