-- Migration 008: allow the 'public' role on profiles
--
-- 001_profiles.sql constrained role to ('buyer','supplier','contractor'), but
-- 005 introduced the General Public account category, which registers with
-- role = 'public'. Every General Public signup therefore failed the CHECK
-- constraint. Widen the constraint to include it.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('buyer', 'supplier', 'contractor', 'public'));
