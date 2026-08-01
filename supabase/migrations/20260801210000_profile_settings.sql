-- Per-user application settings.
--
-- The Settings module rendered language, currency, timezone and three
-- notification toggles as uncontrolled inputs with `defaultValue`/`defaultChecked`
-- and no save path at all, so nothing a user chose was ever recorded, let alone
-- applied. This is where those choices live.
--
-- JSONB rather than a column per preference: these are user preferences read as a
-- whole, and adding one should not require a migration each time.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.settings IS
  'User preferences: language, currency, timezone and notification toggles.';
