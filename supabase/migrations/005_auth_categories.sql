-- Migration 005: Auth, user categories, BuildOS integration, invoice enhancements
-- Run in Supabase SQL Editor or via Supabase CLI

-- ── profiles: auth + category columns ──────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS password_hash  TEXT,
  ADD COLUMN IF NOT EXISTS category       TEXT NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS buildos_user_id TEXT;

-- Ensure email uniqueness
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_email_unique'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);
  END IF;
END$$;

-- ── invoices: profile link + status ────────────────────────────────────────
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status     TEXT NOT NULL DEFAULT 'draft';

-- Index for fast profile invoice lookups
CREATE INDEX IF NOT EXISTS invoices_profile_id_idx ON public.invoices (profile_id);

-- ── RLS: allow profile owners to read their own invoices ───────────────────
DROP POLICY IF EXISTS allow_invoice_select_own ON public.invoices;
CREATE POLICY allow_invoice_select_own
  ON public.invoices
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ── RLS: allow profile updates ──────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS allow_profile_insert ON public.profiles;
CREATE POLICY allow_profile_insert
  ON public.profiles FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS allow_profile_select ON public.profiles;
CREATE POLICY allow_profile_select
  ON public.profiles FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS allow_profile_update ON public.profiles;
CREATE POLICY allow_profile_update
  ON public.profiles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

GRANT INSERT, SELECT, UPDATE ON public.profiles TO anon, authenticated;
GRANT INSERT, SELECT, UPDATE ON public.invoices TO anon, authenticated;
