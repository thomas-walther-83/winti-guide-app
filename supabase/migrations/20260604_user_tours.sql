-- ═══════════════════════════════════════════════════════════════════
-- Migration: Eigene Touren (Phase B) – user_tours + tour_stops
-- Idempotent. Wird vom Workflow .github/workflows/db-migrate.yml ausgeführt.
-- ═══════════════════════════════════════════════════════════════════

-- ── Eigene Tour (pro Nutzer) ─────────────────────────────────────────
create table if not exists public.user_tours (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null default 'Meine Tour',
  description text default '',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists idx_user_tours_user on public.user_tours(user_id);

-- ── Stops einer Tour (geordnete Orte) ────────────────────────────────
create table if not exists public.tour_stops (
  id          uuid primary key default gen_random_uuid(),
  tour_id     uuid not null references public.user_tours(id) on delete cascade,
  listing_id  uuid not null references public.listings(id) on delete cascade,
  position    int  not null default 0,
  note        text default '',
  created_at  timestamptz default now()
);
create index if not exists idx_tour_stops_tour on public.tour_stops(tour_id);

alter table public.user_tours enable row level security;
alter table public.tour_stops enable row level security;

-- ── RLS: user_tours – nur eigene Zeilen ──────────────────────────────
drop policy if exists user_tours_select_own on public.user_tours;
create policy user_tours_select_own on public.user_tours
  for select using (auth.uid() = user_id);

drop policy if exists user_tours_insert_own on public.user_tours;
create policy user_tours_insert_own on public.user_tours
  for insert with check (auth.uid() = user_id);

drop policy if exists user_tours_update_own on public.user_tours;
create policy user_tours_update_own on public.user_tours
  for update using (auth.uid() = user_id);

drop policy if exists user_tours_delete_own on public.user_tours;
create policy user_tours_delete_own on public.user_tours
  for delete using (auth.uid() = user_id);

-- ── RLS: tour_stops – nur Stops eigener Touren ───────────────────────
drop policy if exists tour_stops_select_own on public.tour_stops;
create policy tour_stops_select_own on public.tour_stops
  for select using (
    exists (select 1 from public.user_tours t where t.id = tour_id and t.user_id = auth.uid())
  );

drop policy if exists tour_stops_insert_own on public.tour_stops;
create policy tour_stops_insert_own on public.tour_stops
  for insert with check (
    exists (select 1 from public.user_tours t where t.id = tour_id and t.user_id = auth.uid())
  );

drop policy if exists tour_stops_update_own on public.tour_stops;
create policy tour_stops_update_own on public.tour_stops
  for update using (
    exists (select 1 from public.user_tours t where t.id = tour_id and t.user_id = auth.uid())
  );

drop policy if exists tour_stops_delete_own on public.tour_stops;
create policy tour_stops_delete_own on public.tour_stops
  for delete using (
    exists (select 1 from public.user_tours t where t.id = tour_id and t.user_id = auth.uid())
  );
