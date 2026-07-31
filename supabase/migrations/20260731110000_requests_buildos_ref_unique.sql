-- Idempotency for inbound BuildOS webhooks.
--
-- server/routes/buildos.js did a plain INSERT keyed on nothing, so any webhook
-- redelivery — which is now expected, since deliveries retry with backoff —
-- created a duplicate request row in the supplier's inbox.
--
-- A plain UNIQUE index (not the partial one from 20260715) is required because
-- PostgREST's `on_conflict=` upsert does not emit a WHERE clause and therefore
-- cannot infer a partial index. Nullable columns permit multiple NULLs in
-- Postgres, so supplier-originated requests with no buildos_ref are unaffected.

ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS buildos_ref   TEXT,
  ADD COLUMN IF NOT EXISTS buildos_event TEXT;

-- Replaced by the unique index below.
DROP INDEX IF EXISTS public.idx_requests_buildos_ref;

CREATE UNIQUE INDEX IF NOT EXISTS requests_buildos_ref_key
  ON public.requests (buildos_ref);
