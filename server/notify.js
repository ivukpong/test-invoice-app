/* BACKEND COMMENTED OUT FOR UX WORK
import { supabase } from "./db.js";
import nodemailer from "nodemailer";

const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

export async function notifyProfiles(profileIds, invoiceId, type, message) {
  if (!profileIds?.length) return;

  // Insert in-app notifications
  await supabase.from("notifications").insert(
    profileIds.map((profile_id) => ({
      profile_id,
      invoice_id: invoiceId,
      type,
      message,
      read: false,
      read: false,
    })),
  );

  // Send emails if SMTP configured
  if (!process.env.SMTP_HOST) return;
  const { data: profiles } = await supabase
    .from("profiles")
    .select("email, name")
    .in("id", profileIds);
  for (const p of profiles || []) {
    await mailer.sendMail({
      from: process.env.SMTP_FROM || "invoices@yourdomain.com",
      to: p.email,
      subject: `Upti Invoice  ${type.replace("_", " ")}`,
      text: `Hi ${p.name}\n\n${message}\n\nLog in to view details.`,
    });
  }
}
BACKEND COMMENTED OUT FOR UX WORK */
}
