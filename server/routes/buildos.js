import express from "express";
import { createHmac, timingSafeEqual } from "crypto";
import { supabase } from "../db.js";
import { notifyProfiles } from "../notify.js";

const router = express.Router();

/** Reject deliveries older than this to bound the replay window. */
const MAX_SIGNATURE_AGE_MS = 5 * 60 * 1000;

/**
 * Verify the HMAC-SHA256 signature BuildOS sends over `<timestamp>.<rawBody>`.
 *
 * The previous implementation signed `JSON.stringify(req.body)` — a re-encoding
 * of the parsed body, which is not byte-identical to what was signed — and
 * compared it against a header BuildOS never sent (BuildOS was sending the
 * shared secret in plaintext in `X-Webhook-Secret` instead). Every delivery
 * therefore failed, and after five failures BuildOS deactivated the webhook.
 *
 * Returns null when valid, or a string describing why it was rejected.
 */
function verifySignature(req) {
  const secret = process.env.BUILDOS_WEBHOOK_SECRET;
  if (!secret) return "Webhook secret not configured";

  const header = req.headers["x-buildos-signature"];
  const timestamp = req.headers["x-buildos-timestamp"];
  if (!header || !timestamp) return "Missing signature headers";

  const age = Date.now() - Date.parse(String(timestamp));
  if (!Number.isFinite(age)) return "Invalid signature timestamp";
  if (Math.abs(age) > MAX_SIGNATURE_AGE_MS) return "Signature timestamp outside tolerance";

  if (!req.rawBody) return "Raw body unavailable";

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${req.rawBody.toString("utf8")}`)
    .digest("hex");

  // Strip the "sha256=" prefix, then compare fixed-width hex buffers so
  // timingSafeEqual cannot throw on a length mismatch.
  const provided = String(header).replace(/^sha256=/, "");
  if (provided.length !== expected.length) return "Signature mismatch";

  const ok = timingSafeEqual(
    Buffer.from(provided, "hex"),
    Buffer.from(expected, "hex"),
  );
  return ok ? null : "Signature mismatch";
}

/**
 * Resolve the BuildOS supplier on the payload to a SabiQuot profile.
 *
 * BuildOS supplier ids are cuids while profiles.id is a uuid, so the two can
 * only be matched through the buildos_supplier_id bridge column — the old code
 * assigned `data.supplierId` straight to `profile_id`, which could never match
 * and violated the column's uuid type. A request that cannot be matched is
 * still stored, with a null profile_id, so it surfaces for reconciliation
 * rather than being dropped.
 */
async function resolveProfileId(data) {
  const supplierId = data.supplierId || data.vendorId;

  // Primary: match by the stable BuildOS supplier id bridge column.
  if (supplierId) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("buildos_supplier_id", supplierId)
      .maybeSingle();

    if (error) {
      console.error("Supplier → profile lookup (by id) failed:", error.message);
    } else if (profile?.id) {
      return profile.id;
    }
  }

  // Fallback: match by supplier email so requests appear before the profile
  // has been formally linked via the Profile page.
  const supplierEmail =
    data.supplier?.email ||
    data.supplierEmail ||
    data.vendorEmail;

  if (supplierEmail) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", supplierEmail)
      .maybeSingle();

    if (error) {
      console.error("Supplier → profile lookup (by email) failed:", error.message);
    } else if (profile?.id) {
      return profile.id;
    }
  }

  return null;
}

const HANDLED_EVENTS = new Set(["purchase-request.created", "rfq.sent", "purchase-order.created"]);

/** PostgREST codes that will never succeed on retry, however many times BuildOS resends. */
const PERMANENT_STORAGE_CODES = new Set([
  "PGRST204", // column not found in the schema cache
  "PGRST100", // unparseable request
  "42703", // undefined_column
  "42P01", // undefined_table
  "23502", // not_null_violation
  "23503", // foreign_key_violation
]);

function isPermanentStorageError(error) {
  return PERMANENT_STORAGE_CODES.has(String(error?.code ?? ""));
}

/** Specifically "this deployment has not run a migration that adds column X". */
function isMissingColumnError(error) {
  const code = String(error?.code ?? "");
  return code === "PGRST204" || code === "42703";
}

/** The column name out of a PostgREST/Postgres missing-column message, if present. */
function missingColumnName(error) {
  const match = /'([^']+)' column/.exec(String(error?.message ?? ""));
  return match?.[1] ?? null;
}

/** One upsert attempt, keyed on the BuildOS id for idempotency. */
function storeRequest(row) {
  return supabase
    .from("requests")
    .upsert([row], { onConflict: "buildos_ref" })
    .select("id")
    .single();
}

// POST /api/buildos-webhook — receives events from BuildOS ERP
router.post("/", async (req, res) => {
  const rejection = verifySignature(req);
  if (rejection) {
    console.warn(`Rejected BuildOS webhook: ${rejection}`);
    return res.status(401).json({ error: "Invalid signature" });
  }

  const { event, data } = req.body || {};
  if (!event || !data) {
    return res.status(400).json({ error: "event and data are required" });
  }

  // Acknowledge unhandled events. Returning an error would make BuildOS retry
  // them to exhaustion and then deactivate the endpoint for every event.
  if (!HANDLED_EVENTS.has(event)) {
    return res.json({ received: true, event, ignored: true });
  }

  if (!data.id) {
    return res
      .status(400)
      .json({ error: "data.id is required as the idempotency key" });
  }

  const profileId = await resolveProfileId(data);
  if (!profileId) {
    console.warn(
      `BuildOS ${event} ${data.id}: no profile linked to supplier ${
        data.supplierId || data.vendorId || "(none supplied)"
      } — storing unassigned`,
    );
  }

  const row = {
    profile_id: profileId,
    title:
      data.description || data.rfqRef || data.prRef || data.title || "ERP Request",
    amount: data.totalAmount ?? data.budgetAmount ?? data.totalValue ?? null,
    currency: data.currency || "NGN",
    status: "received",
    materials: Array.isArray(data.items) ? data.items : [],
    buildos_ref: String(data.id),
    buildos_event: event,
  };

  // Upsert rather than insert: deliveries now retry with backoff, so the same
  // event can legitimately arrive more than once.
  let { data: saved, error } = await storeRequest(row);

  // A column this deployment has not migrated yet (PGRST204) is permanent: the
  // same delivery will fail identically forever. Dropping the optional display
  // columns and retrying keeps the supplier's request visible — without an
  // amount, rather than not at all — instead of failing the delivery.
  if (error && isMissingColumnError(error)) {
    const missing = missingColumnName(error);
    console.warn(
      `requests.${missing ?? "(unknown column)"} is missing — storing BuildOS ` +
        `${event} ${data.id} without amount/currency. Apply supabase/migrations/` +
        `010_requests_amount_currency.sql to record them.`,
    );
    const core = { ...row };
    delete core.amount;
    delete core.currency;
    ({ data: saved, error } = await storeRequest(core));
  }

  if (error) {
    console.error(`Failed to store BuildOS ${event} ${data.id}:`, error.message);
    // 4xx for anything that cannot succeed on retry. BuildOS counts every
    // failed delivery toward `maxRetries` and deactivates the endpoint when it
    // runs out, so returning 5xx for a permanent fault burns the retry budget
    // and takes the whole integration down — which is how the previous endpoint
    // died. 5xx stays reserved for genuinely transient faults, where a retry is
    // the right thing to ask for.
    return res.status(isPermanentStorageError(error) ? 422 : 500).json({
      error: error.message,
    });
  }

  res.json({
    received: true,
    event,
    requestId: saved?.id,
    assigned: Boolean(profileId),
  });

  // Notify the supplier in-app (and by email if SMTP is configured).
  if (profileId) {
    const label =
      event === "rfq.sent" ? "RFQ" :
      event === "purchase-order.created" ? "Purchase Order" :
      "Purchase Request";
    notifyProfiles(
      [profileId],
      null,
      "erp_request",
      `New ${label} from your buyer — ref: ${data.rfqRef || data.poNumber || data.prRef || data.id}`,
    ).catch((err) => console.error("Failed to notify supplier:", err.message));
  }
});

export default router;
