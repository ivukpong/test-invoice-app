-- Migration 009: widen the invoices.status CHECK constraint
--
-- 002_invoices_update.sql constrained status to
--   ('draft','sent','negotiating','accepted','rejected')
-- but the application writes several values outside that set:
--
--   'saved'           — db.js saveInvoice() default, so EVERY plain
--                       POST /api/invoices violated the constraint
--   'finalized'       — POST /api/invoices/:id/finalize
--   'pending',
--   'quote_submitted' — read back by GET /api/profile/:id/stats
--
-- The practical effect was that a supplier could not submit a quote at all.
-- Widen the constraint to the full set the code actually uses.

ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_status_check;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_status_check
  CHECK (status IN (
    'draft',
    'saved',
    'sent',
    'pending',
    'quote_submitted',
    'negotiating',
    'accepted',
    'rejected',
    'finalized'
  ));
