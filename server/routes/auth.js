import express from "express";
import bcrypt from "bcryptjs";
import { supabase } from "../db.js";

const router = express.Router();

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const { name, email, password, phone, role, category, company } = req.body;

  if (!email || !password || !name) {
    return res
      .status(400)
      .json({ error: "name, email and password are required" });
  }

  // Check if email already exists
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    return res
      .status(409)
      .json({ error: "An account with this email already exists" });
  }

  const password_hash = await bcrypt.hash(password, 12);

  const { data, error } = await supabase
    .from("profiles")
    .insert([
      {
        name,
        email,
        phone: phone || null,
        role: role || (category === "vendor" ? "buyer" : "public"),
        category: category || "public",
        company: company || null,
        password_hash,
      },
    ])
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  const { password_hash: _ph, ...safe } = data;
  return res.status(201).json(safe);
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (error || !data) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  if (!data.password_hash) {
    // Legacy profile (no password) — allow login by email only for backward compat
    const { password_hash: _ph, ...safe } = data;
    return res.json(safe);
  }

  const match = await bcrypt.compare(password, data.password_hash);
  if (!match) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const { password_hash: _ph, ...safe } = data;
  return res.json(safe);
});

// POST /api/auth/buildos-link  — link profile to a BuildOS user ID
router.post("/buildos-link", async (req, res) => {
  const { profile_id, buildos_user_id } = req.body;

  if (!profile_id || !buildos_user_id) {
    return res
      .status(400)
      .json({ error: "profile_id and buildos_user_id are required" });
  }

  // If a BuildOS API URL is configured, verify the user ID exists there first
  const buildosApiUrl = process.env.BUILDOS_API_URL;
  if (buildosApiUrl) {
    try {
      const checkRes = await fetch(
        `${buildosApiUrl}/users/${buildos_user_id}`,
        {
          headers: { "Content-Type": "application/json" },
        },
      );
      if (!checkRes.ok) {
        return res.status(400).json({ error: "BuildOS user ID not found" });
      }
    } catch {
      // BuildOS unreachable — skip validation, proceed with linking
    }
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ buildos_user_id })
    .eq("id", profile_id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  const { password_hash: _ph, ...safe } = data;
  return res.json(safe);
});

export default router;
