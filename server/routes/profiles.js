/* BACKEND COMMENTED OUT FOR UX WORK
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

export default router;
BACKEND COMMENTED OUT FOR UX WORK */
