/* BACKEND COMMENTED OUT FOR UX WORK
export { supabase };
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const { Pool } = pg;

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const useSupabaseApi = Boolean(supabaseUrl && supabaseKey);

const supabase = useSupabaseApi
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

function parseBoolean(value, fallback = false) {
  if (value == null) return fallback;
  return String(value).toLowerCase() === "true";
}

function buildPoolConfig() {
  const useSsl = parseBoolean(
    process.env.DB_SSL,
    Boolean(process.env.DATABASE_URL),
  );
  const rejectUnauthorized = parseBoolean(
    process.env.DB_SSL_REJECT_UNAUTHORIZED,
    false,
  );

  return {
    connectionString: process.env.DATABASE_URL,
    host: process.env.PGHOST || "localhost",
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
    user: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD || "postgres",
    database: process.env.PGDATABASE || "free_invoice",
    ssl: useSsl ? { rejectUnauthorized } : false,
  };
}

const pool = useSupabaseApi ? null : new Pool(buildPoolConfig());

export function getPersistenceMode() {
  return useSupabaseApi ? "supabase-api" : "postgres";
}

export async function initDb() {
  if (useSupabaseApi) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS invoices (
      id BIGSERIAL PRIMARY KEY,
      invoice_number TEXT NOT NULL,
      client_email TEXT,
      sender_company_name TEXT,
      total NUMERIC(14, 2) DEFAULT 0,
      currency TEXT NOT NULL,
      template TEXT NOT NULL,
      privacy_policy_accepted BOOLEAN NOT NULL DEFAULT FALSE,
      downloaded_at TIMESTAMPTZ,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function saveInvoice(invoiceRecord) {
  if (useSupabaseApi) {
    const { data, error } = await supabase
      .from("invoices")
      .insert({
        invoice_number: invoiceRecord.invoiceNumber,
        client_email: invoiceRecord.clientEmail,
        sender_company_name: invoiceRecord.senderCompanyName,
        total: invoiceRecord.total || 0,
        currency: invoiceRecord.currency,
        template: invoiceRecord.template,
        privacy_policy_accepted: invoiceRecord.privacyPolicyAccepted,
        downloaded_at: invoiceRecord.downloadedAt,
        payload: invoiceRecord.payload,
        profile_id: invoiceRecord.profileId || null,
        status: invoiceRecord.status || "saved",
      })
      .select("id, created_at")
      .single();

    if (error) {
      throw new Error(error.message || "Supabase insert failed.");
    }

    return data;
  }

  const query = `
    INSERT INTO invoices (
      invoice_number,
      client_email,
      sender_company_name,
      total,
      currency,
      template,
      privacy_policy_accepted,
      downloaded_at,
      payload,
      profile_id,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id, invoice_number, created_at
  `;

  const values = [
    invoiceRecord.invoiceNumber,
    invoiceRecord.clientEmail,
    invoiceRecord.senderCompanyName,
    invoiceRecord.total || 0,
    invoiceRecord.currency,
    invoiceRecord.template,
    invoiceRecord.privacyPolicyAccepted,
    invoiceRecord.downloadedAt,
    invoiceRecord.payload,
    invoiceRecord.profileId || null,
    invoiceRecord.status || "saved",
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

export async function getInvoices({ page = 1, limit = 20, profileId } = {}) {
  const offset = (page - 1) * limit;

  if (useSupabaseApi) {
    let query = supabase
      .from("invoices")
      .select(
        "id, invoice_number, client_email, sender_company_name, total, currency, template, privacy_policy_accepted, downloaded_at, created_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (profileId) query = query.eq("profile_id", profileId);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(error.message || "Supabase query failed.");
    }

    return { invoices: data, total: count };
  }

  const [rowsResult, countResult] = await Promise.all([
    pool.query(
      `SELECT id, invoice_number, client_email, sender_company_name, total, currency, template, privacy_policy_accepted, downloaded_at, created_at
       FROM invoices
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    ),
    pool.query(
      profileId
        ? `SELECT COUNT(*)::int AS total FROM invoices WHERE profile_id = $1`
        : `SELECT COUNT(*)::int AS total FROM invoices`,
      profileId ? [profileId] : [],
    ),
  ]);

  return { invoices: rowsResult.rows, total: countResult.rows[0].total };
}
BACKEND COMMENTED OUT FOR UX WORK */
