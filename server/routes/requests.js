import express from "express";
import { supabase } from "../db.js";

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
  res.json(data);
});

export default router;
