-- Identity bridge: link a SabiQuot profile to its BuildOS Supplier record.
--
-- 005_auth_categories.sql added `buildos_user_id`, which points at a BuildOS
-- *User* (an ERP staff login). That is the wrong entity for procurement sync —
-- a supplier on the portal corresponds to a BuildOS *Supplier*, not a User.
-- Without this column an inbound RFQ webhook cannot resolve which portal
-- account to deliver to, and a portal signup cannot be reconciled against a
-- supplier that procurement already has on file.
--
-- Named with a date prefix so it orders after 20260715_buildos_integration.sql
-- when the migrations are replayed in filename order on a fresh database.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS buildos_supplier_id TEXT;

-- One portal profile per BuildOS supplier. NULLs are unconstrained in Postgres,
-- so non-supplier profiles are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_buildos_supplier_id_key
  ON public.profiles (buildos_supplier_id);

-- Tracks where the pairing came from and whether procurement has vetted it:
--   'pending'  — pushed to BuildOS, awaiting procurement approval
--   'linked'   — approved and RFQ-eligible
--   'failed'   — push rejected; see buildos_sync_error
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS buildos_sync_status TEXT,
  ADD COLUMN IF NOT EXISTS buildos_sync_error  TEXT,
  ADD COLUMN IF NOT EXISTS buildos_synced_at   TIMESTAMPTZ;
