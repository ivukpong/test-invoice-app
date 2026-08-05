-- Link a SabiQuot invoice (and the request it came from) to the BuildOS
-- Received Quote it was quoted against, so a negotiation on that invoice can
-- update the originating submission in BuildOS instead of vanishing.
ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS buildos_quote_id TEXT;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS buildos_quote_id TEXT;

CREATE INDEX IF NOT EXISTS idx_invoices_buildos_quote_id
  ON public.invoices (buildos_quote_id)
  WHERE buildos_quote_id IS NOT NULL;
