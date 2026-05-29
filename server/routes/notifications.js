import express from "express";
import { supabase } from "../db.js";
const router = express.Router();

router.get("/:profileId", async (req, res) => {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("profile_id", req.params.profileId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

router.patch("/:id/read", async (req, res) => {
  const { data, error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", req.params.id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

export default router;
