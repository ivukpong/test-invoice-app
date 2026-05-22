create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  company text,
  phone text,
  role text not null check (role in ('buyer','supplier','contractor')),
  created_at timestamptz not null default now()
);
