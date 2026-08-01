import { supabase } from "./db.js";
import nodemailer from "nodemailer";

const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

/**
 * Which notification preference governs an event type.
 *
 * The Settings toggles were previously decorative — every notification went out
 * regardless of what a user had switched off — because nothing ever read them.
 */
const PREFERENCE_FOR_TYPE = {
  counter_offer: "negotiationAlerts",
  offer_accepted: "negotiationAlerts",
  offer_declined: "negotiationAlerts",
  invoice_reminder: "invoiceReminders",
};

/** Defaults match the Settings UI, where all three start enabled. */
function emailAllowed(settings, type) {
  const prefs = settings && typeof settings === "object" ? settings : {};
  if (prefs.emailNotifications === false) return false;
  const key = PREFERENCE_FOR_TYPE[type];
  return key ? prefs[key] !== false : true;
}

export async function notifyProfiles(profileIds, invoiceId, type, message) {
  if (!profileIds?.length) return;

  // In-app notifications are always recorded: they are the user's record of what
  // happened on their account, and the preferences govern email delivery.
  await supabase.from("notifications").insert(
    profileIds.map((profile_id) => ({
      profile_id,
      invoice_id: invoiceId,
      type,
      message,
      read: false,
    })),
  );

  // Send emails if SMTP configured
  if (!process.env.SMTP_HOST) return;
  const { data: profiles } = await supabase
    .from("profiles")
    .select("email, name, settings")
    .in("id", profileIds);
  for (const p of profiles || []) {
    if (!emailAllowed(p.settings, type)) continue;
    await mailer.sendMail({
      from: process.env.SMTP_FROM || "invoices@yourdomain.com",
      to: p.email,
      subject: `Upti Invoice  ${type.replace("_", " ")}`,
      text: `Hi ${p.name}\n\n${message}\n\nLog in to view details.`,
    });
  }
}
