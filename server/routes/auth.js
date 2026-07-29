import express from "express";
import bcrypt from "bcryptjs";
import { supabase } from "../db.js";

const router = express.Router();

// Supabase/PostgREST reports transport failures ("fetch failed") through the
// same error channel as validation errors. Those are outages, not bad input,
// so they must not be reported to the client as a 400.
function isUpstreamFailure(error) {
  const message = String(error?.message || "");
  return (
    /fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|socket hang up|network/i.test(
      message,
    ) || error?.name === "TypeError"
  );
}

function dbUnavailable(res, error) {
  console.error("Database unavailable", error);
  return res.status(503).json({
    error:
      "The account service is temporarily unavailable. Please try again shortly.",
  });
}

function requireSupabase(res) {
  if (supabase) return true;
  console.error(
    "Supabase client not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
  );
  res.status(503).json({
    error: "The account service is not configured. Please contact support.",
  });
  return false;
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const { name, email, password, phone, role, category, company } = req.body;

  if (!email || !password || !name) {
    return res
      .status(400)
      .json({ error: "name, email and password are required" });
  }

  if (String(password).length < 8) {
    return res
      .status(400)
      .json({ error: "Password must be at least 8 characters" });
  }

  if (!requireSupabase(res)) return;

  const normalizedEmail = String(email).trim();

  try {
    // Check if email already exists
    const { data: existing, error: lookupError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (lookupError) {
      if (isUpstreamFailure(lookupError)) return dbUnavailable(res, lookupError);
      console.error("Registration lookup failed", lookupError);
      return res.status(500).json({ error: lookupError.message });
    }

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
          email: normalizedEmail,
          phone: phone || null,
          role: role || (category === "vendor" ? "buyer" : "public"),
          category: category || "public",
          company: company || null,
          password_hash,
        },
      ])
      .select()
      .single();

    if (error) {
      if (isUpstreamFailure(error)) return dbUnavailable(res, error);
      // 23505 = unique violation (email registered between check and insert)
      if (error.code === "23505") {
        return res
          .status(409)
          .json({ error: "An account with this email already exists" });
      }
      console.error("Registration insert failed", error);
      return res.status(400).json({ error: error.message });
    }

    const { password_hash: _ph, ...safe } = data;
    return res.status(201).json(safe);
  } catch (error) {
    return dbUnavailable(res, error);
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  if (!requireSupabase(res)) return;

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", String(email).trim())
      .maybeSingle();

    // An outage must not be reported as a wrong password.
    if (error) return dbUnavailable(res, error);

    if (!data) {
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
  } catch (error) {
    return dbUnavailable(res, error);
  }
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
