import express from "express";
import { createHmac, timingSafeEqual } from "crypto";
import { supabase } from "../db.js";

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
  if (!supplierId) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("buildos_supplier_id", supplierId)
    .maybeSingle();

  if (error) {
    console.error("Supplier → profile lookup failed:", error.message);
    return null;
  }
  return profile?.id ?? null;
}

const HANDLED_EVENTS = new Set(["purchase-request.created", "rfq.sent"]);

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
  const { data: saved, error } = await supabase
    .from("requests")
    .upsert([row], { onConflict: "buildos_ref" })
    .select("id")
    .single();

  if (error) {
    // A 5xx asks BuildOS to retry. A malformed payload would only fail again,
    // but that case is already filtered out above.
    console.error(`Failed to store BuildOS ${event} ${data.id}:`, error.message);
    return res.status(500).json({ error: error.message });
  }

  res.json({
    received: true,
    event,
    requestId: saved?.id,
    assigned: Boolean(profileId),
  });
});

export default router;
