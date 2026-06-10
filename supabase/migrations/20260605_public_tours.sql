-- ═══════════════════════════════════════════════════════════════════
-- Migration: Öffentliche (redaktionelle) Touren – public_tours + public_tour_stops
-- Idempotent. Wird vom Workflow .github/workflows/db-migrate.yml ausgeführt.
--
-- Schreibrechte sind auf Admin-Mails beschränkt (Allowlist in Postgres).
-- Frontend gated zusätzlich via src/config/admins.ts / useIsAdmin().
-- ═══════════════════════════════════════════════════════════════════

-- ── Admin-Allowlist (zentral, in Postgres) ──────────────────────────
-- EINZIGE Quelle der Allowlist: Der Client fragt den Status via
-- supabase.rpc('is_admin') ab (src/hooks/useIsAdmin.ts) — bei neuen
-- Admins nur hier ergänzen. (Aktuelle Fassung: 20260610_harden_is_admin)
create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = public, auth as $$
  select coalesce(
    (auth.jwt() ->> 'email')::text = any(array[
      'twwinterthur@gmail.com'
    ]),
    false
  );
$$;

-- ── Öffentliche Tour ─────────────────────────────────────────────────
create table if not exists public.public_tours (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  description text default '',
  emoji       text default '',
  sort_order  int  not null default 0,
  published   boolean not null default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists idx_public_tours_published_order
  on public.public_tours(published, sort_order);

-- ── Stops einer öffentlichen Tour (geordnet, jeweils lat/lon) ───────
create table if not exists public.public_tour_stops (
  id          uuid primary key default gen_random_uuid(),
  tour_id     uuid not null references public.public_tours(id) on delete cascade,
  position    int  not null default 0,
  lat         double precision not null,
  lon         double precision not null,
  name        text not null,
  -- Optionaler Verweis auf ein Listing; bleibt NULL für freie Koordinaten.
  listing_id  uuid references public.listings(id) on delete set null,
  created_at  timestamptz default now()
);
create index if not exists idx_public_tour_stops_tour
  on public.public_tour_stops(tour_id, position);

alter table public.public_tours      enable row level security;
alter table public.public_tour_stops enable row level security;

-- ── RLS: Lesen für alle (auch anonym), nur veröffentlichte Touren ────
drop policy if exists public_tours_select_all on public.public_tours;
create policy public_tours_select_all on public.public_tours
  for select using (published = true);

drop policy if exists public_tour_stops_select_all on public.public_tour_stops;
create policy public_tour_stops_select_all on public.public_tour_stops
  for select using (
    exists (select 1 from public.public_tours t
            where t.id = tour_id and t.published = true)
  );

-- ── RLS: Schreiben/Update/Delete nur für Admins ──────────────────────
drop policy if exists public_tours_admin_insert on public.public_tours;
create policy public_tours_admin_insert on public.public_tours
  for insert with check (public.is_admin());

drop policy if exists public_tours_admin_update on public.public_tours;
create policy public_tours_admin_update on public.public_tours
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists public_tours_admin_delete on public.public_tours;
create policy public_tours_admin_delete on public.public_tours
  for delete using (public.is_admin());

drop policy if exists public_tour_stops_admin_insert on public.public_tour_stops;
create policy public_tour_stops_admin_insert on public.public_tour_stops
  for insert with check (public.is_admin());

drop policy if exists public_tour_stops_admin_update on public.public_tour_stops;
create policy public_tour_stops_admin_update on public.public_tour_stops
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists public_tour_stops_admin_delete on public.public_tour_stops;
create policy public_tour_stops_admin_delete on public.public_tour_stops
  for delete using (public.is_admin());

-- ── Admin: auch eigene unveröffentlichte Touren sehen ───────────────
drop policy if exists public_tours_admin_select_all on public.public_tours;
create policy public_tours_admin_select_all on public.public_tours
  for select using (public.is_admin());

drop policy if exists public_tour_stops_admin_select_all on public.public_tour_stops;
create policy public_tour_stops_admin_select_all on public.public_tour_stops
  for select using (public.is_admin());

-- ── Seed: aktuelle statische curatedTours (Best-Effort-Koordinaten) ──
-- Nur einfügen, wenn slug noch nicht existiert (idempotent).
insert into public.public_tours (slug, name, description, emoji, sort_order, published)
values
  ('altstadt', 'Altstadt-Rundgang', 'Die schönsten Ecken der Winterthurer Altstadt – ca. 1,5 km', '🏛️', 10, true),
  ('museen',   'Museen & Kunst',     'Winterthur als Museumsstadt – von der Kunst bis zur Fotografie', '🎨', 20, true),
  ('parks',    'Parks & Aussicht',   'Grünes Winterthur – Parks, Natur und ein Aussichtspunkt',       '🌳', 30, true)
on conflict (slug) do nothing;

-- Stops nur einfügen, wenn die Tour gerade frisch angelegt wurde
-- (also keine eigenen Stops hat). Lässt vom Admin händisch editierte
-- Stops unangetastet.
with t as (
  select id from public.public_tours where slug = 'altstadt'
)
insert into public.public_tour_stops (tour_id, position, lat, lon, name)
select t.id, x.position, x.lat, x.lon, x.name from t,
  (values
    (1, 47.5005::double precision, 8.7237::double precision, 'Hauptbahnhof Winterthur'),
    (2, 47.5004, 8.7290, 'Marktgasse'),
    (3, 47.5009, 8.7297, 'Stadtkirche'),
    (4, 47.5006, 8.7285, 'Rathaus'),
    (5, 47.5009, 8.7301, 'Gewerbemuseum'),
    (6, 47.5025, 8.7310, 'Stadtpark')
  ) as x(position, lat, lon, name)
where not exists (
  select 1 from public.public_tour_stops s where s.tour_id = t.id
);

with t as (
  select id from public.public_tours where slug = 'museen'
)
insert into public.public_tour_stops (tour_id, position, lat, lon, name)
select t.id, x.position, x.lat, x.lon, x.name from t,
  (values
    (1, 47.5025::double precision, 8.7312::double precision, 'Kunst Museum Winterthur'),
    (2, 47.4985, 8.7345, 'Lindengut-Museum'),
    (3, 47.5009, 8.7301, 'Gewerbemuseum'),
    (4, 47.4970, 8.7295, 'Villa Flora'),
    (5, 47.4882, 8.7285, 'Fotomuseum Winterthur')
  ) as x(position, lat, lon, name)
where not exists (
  select 1 from public.public_tour_stops s where s.tour_id = t.id
);

with t as (
  select id from public.public_tours where slug = 'parks'
)
insert into public.public_tour_stops (tour_id, position, lat, lon, name)
select t.id, x.position, x.lat, x.lon, x.name from t,
  (values
    (1, 47.5025::double precision, 8.7310::double precision, 'Stadtpark'),
    (2, 47.4985, 8.7345, 'Lindengut-Park'),
    (3, 47.4955, 8.7090, 'Goldenberg (Aussicht)'),
    (4, 47.5045, 8.7610, 'Eulachpark')
  ) as x(position, lat, lon, name)
where not exists (
  select 1 from public.public_tour_stops s where s.tour_id = t.id
);
