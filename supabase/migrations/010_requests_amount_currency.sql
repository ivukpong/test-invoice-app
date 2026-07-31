-- Migration 010: add the amount/currency columns the requests flow assumes
--
-- server/routes/buildos.js writes `amount` and `currency` when mirroring a
-- BuildOS purchase request / RFQ, and src/pages/RequestsPage.jsx renders both.
-- Neither column existed (006_requests.sql created only profile_id, title,
-- status, requester, materials, pricing), so every webhook insert failed with
-- PostgREST PGRST204 and the UI had nothing to display.

ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS amount   NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'NGN';
