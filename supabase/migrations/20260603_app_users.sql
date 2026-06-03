-- ═══════════════════════════════════════════════════════════════════
-- Migration: app_users (Nutzer-Tier free/premium) – idempotent
-- Wird vom App-Code erwartet (useAppTier, AuthContext, Premium-Gate).
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.app_users (
  id                 uuid primary key references auth.users(id) on delete cascade,
  tier               text default 'free',        -- free | premium
  stripe_customer_id text default '',
  stripe_sub_id      text default '',
  purchased_at       timestamptz,
  expires_at         timestamptz,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

create index if not exists idx_app_users_tier on public.app_users(tier);

alter table public.app_users enable row level security;

-- Nutzer liest/schreibt nur die eigene Zeile; service_role darf alles.
drop policy if exists "app_users: own read" on public.app_users;
create policy "app_users: own read"
  on public.app_users for select
  using (auth.uid() = id);

drop policy if exists "app_users: own insert" on public.app_users;
create policy "app_users: own insert"
  on public.app_users for insert
  with check (auth.uid() = id);

drop policy if exists "app_users: own update" on public.app_users;
create policy "app_users: own update"
  on public.app_users for update
  using (auth.uid() = id);

drop policy if exists "app_users: service full" on public.app_users;
create policy "app_users: service full"
  on public.app_users for all
  using (auth.jwt() ->> 'role' = 'service_role');
