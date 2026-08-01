-- The vendor ID an established supplier is given in BuildOS Procurement.
--
-- Without it, a vendor who already trades with the company and then registers on
-- SabiQuot gets a *second* supplier record created in Procurement — the sync
-- keys on the SabiQuot profile id, which the ERP-created record does not carry —
-- and their orders end up split across the two. Supplying the id lets the portal
-- account claim the existing supplier instead.
--
-- Distinct from buildos_supplier_id: this is what the vendor *tells us*, that is
-- the link the sync actually established.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS buildos_supplier_ref TEXT;

COMMENT ON COLUMN public.profiles.buildos_supplier_ref IS
  'Existing BuildOS Supplier id supplied by the vendor at registration, used to claim that supplier rather than create a duplicate.';
