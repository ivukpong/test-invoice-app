import express from "express";
import bcrypt from "bcryptjs";
import { supabase } from "../db.js";
import { buildosFetch, isBuildosConfigured } from "../buildosClient.js";

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

/**
 * Vendor-side roles that Procurement raises purchase orders against, and which
 * therefore belong in the BuildOS supplier list.
 *
 * This used to require `role === "supplier"` exactly. The registration form
 * offers a vendor three roles — buyer, supplier and contractor — and *defaults
 * the select to "buyer"*, so a vendor who registered as a contractor, or who
 * simply left the role untouched, was silently never synced. That is why vendor
 * accounts created on SabiQuot did not appear in Procurement.
 *
 * "buyer" stays excluded deliberately: that is a procurement-side account, not
 * somebody being purchased from.
 */
const SUPPLYING_ROLES = new Set(["supplier", "contractor"]);

function isSupplierProfile(profile) {
  return (
    profile?.category === "vendor" &&
    SUPPLYING_ROLES.has(String(profile?.role ?? "").trim().toLowerCase())
  );
}

/**
 * Push a supplier profile to BuildOS Procurement so it appears in the
 * Suppliers list, and persist the resulting link. Covers both fresh
 * registrations and pre-existing accounts that predate this sync (they pick
 * up the link the next time they log in). Never throws — a sync failure must
 * not block registration/login, it's recorded on the profile so it can be
 * retried or surfaced to an admin.
 */
async function syncSupplierToBuildos(profile) {
  if (!isBuildosConfigured() || !isSupplierProfile(profile) || profile.buildos_supplier_id) {
    return profile;
  }

  try {
    const supplier = await buildosFetch("/suppliers/sync-from-portal", {
      method: "POST",
      body: {
        sabiquotProfileId: profile.id,
        name: profile.company || profile.name,
        email: profile.email,
        phone: profile.phone,
        contactPerson: profile.name,
      },
    });

    const { data: updated, error } = await supabase
      .from("profiles")
      .update({
        buildos_supplier_id: supplier.id,
        buildos_sync_status: "linked",
        buildos_sync_error: null,
        buildos_synced_at: new Date().toISOString(),
      })
      .eq("id", profile.id)
      .select()
      .single();

    if (error) {
      console.error("Failed to persist BuildOS supplier link:", error.message);
      return profile;
    }
    return updated;
  } catch (err) {
    console.error("BuildOS supplier sync failed:", err.message);
    await supabase
      .from("profiles")
      .update({ buildos_sync_status: "failed", buildos_sync_error: err.message })
      .eq("id", profile.id)
      .then(null, (updateErr) =>
        console.error("Failed to record BuildOS sync failure:", updateErr.message),
      );
    return profile;
  }
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
    const synced = await syncSupplierToBuildos(safe);
    return res.status(201).json(synced);
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
      const synced = await syncSupplierToBuildos(safe);
      return res.json(synced);
    }

    const match = await bcrypt.compare(password, data.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const { password_hash: _ph, ...safe } = data;
    const synced = await syncSupplierToBuildos(safe);
    return res.json(synced);
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

  // Best-effort existence check.
  //
  // This used to GET `${BUILDOS_API_URL}/users/:id` unauthenticated. No such
  // route exists — BuildOS serves users from `/admin/users/:id` behind an admin
  // role — so the check returned 404 for every valid id and rejected every link
  // attempt with "BuildOS user ID not found".
  //
  // That endpoint is intentionally NOT opened to service keys: a supplier portal
  // has no business enumerating ERP staff accounts. So an inconclusive check
  // (unreachable, unauthorised, or not found) no longer blocks the link — it is
  // logged and the pairing proceeds, matching how the unreachable case was
  // already handled.
  //
  // Note this links a BuildOS *User*, i.e. an ERP staff login. Pairing a
  // supplier to its BuildOS Supplier record is a separate concern and uses
  // profiles.buildos_supplier_id.
  if (isBuildosConfigured()) {
    try {
      await buildosFetch(`/admin/users/${encodeURIComponent(buildos_user_id)}`);
    } catch (checkErr) {
      console.warn(
        `Could not verify BuildOS user ${buildos_user_id} (${checkErr.message}) — linking anyway`,
      );
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
