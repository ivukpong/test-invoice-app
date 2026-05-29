/**
 * WhatsApp notifications via Twilio
 * Optional — all calls are no-ops when env vars are not set.
 *
 * Required env vars:
 *   TWILIO_ACCOUNT_SID   – Twilio account SID
 *   TWILIO_AUTH_TOKEN    – Twilio auth token
 *   TWILIO_WHATSAPP_FROM – Sender number (default: Twilio sandbox "+14155238886")
 */

/**
 * Send a WhatsApp message to a phone number.
 * @param {string} to    Recipient phone in E.164 format, e.g. "+2348012345678"
 * @param {string} body  Message text
 */
export async function sendWhatsApp(to, body) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return;
  if (!to) return;

  try {
    const { default: Twilio } = await import("twilio");
    const client = new Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
    const from = process.env.TWILIO_WHATSAPP_FROM || "+14155238886";
    await client.messages.create({
      from: `whatsapp:${from}`,
      to: `whatsapp:${to}`,
      body,
    });
  } catch (err) {
    // Non-critical — log and continue
    console.warn("[WhatsApp] Notification failed:", err.message);
  }
}
