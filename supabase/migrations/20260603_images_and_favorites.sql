-- ═══════════════════════════════════════════════════════════════════
-- Migration: Bilder-Spalten + Favoriten (Cloud-Sync)
-- Idempotent – kann gefahrlos mehrfach angewendet werden.
-- Wird vom Workflow .github/workflows/db-migrate.yml via psql ausgeführt.
-- ═══════════════════════════════════════════════════════════════════

-- ── Bilder: image_url auf Listings & Events ──────────────────────────
alter table public.listings add column if not exists image_url text default '';
alter table public.events   add column if not exists image_url text default '';

-- ── Favoriten (pro Nutzer, mit Row-Level-Security) ───────────────────
create table if not exists public.favorites (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  listing_id  uuid not null references public.listings(id) on delete cascade,
  created_at  timestamptz default now(),
  unique (user_id, listing_id)
);

create index if not exists idx_favorites_user on public.favorites(user_id);

alter table public.favorites enable row level security;

drop policy if exists favorites_select_own on public.favorites;
create policy favorites_select_own on public.favorites
  for select using (auth.uid() = user_id);

drop policy if exists favorites_insert_own on public.favorites;
create policy favorites_insert_own on public.favorites
  for insert with check (auth.uid() = user_id);

drop policy if exists favorites_delete_own on public.favorites;
create policy favorites_delete_own on public.favorites
  for delete using (auth.uid() = user_id);
