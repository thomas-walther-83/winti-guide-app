-- ═══════════════════════════════════════════════════════════════════
-- Winti Guide – Supabase Schema (aktualisiert)
-- Enthält: source, source_id, lat, lon für automatischen Import
-- ═══════════════════════════════════════════════════════════════════

-- ── Einträge (Locations) ─────────────────────────────────────────
create table if not exists public.listings (
  id          uuid primary key default gen_random_uuid(),

  -- Quelle & Deduplizierung
  source      text default 'manual',        -- manual | osm | zuerich_tourismus
  source_id   text unique,                  -- z.B. "osm_123456" – verhindert Duplikate

  -- Kategorie
  category    text not null,                -- restaurants | cafes | bars | hotels |
                                            -- sightseeing | kultur | geschaefte | sport | touren
  sub_type    text default '',              -- z.B. "Schweizer Küche", "Freibad", "Tennis"

  -- Inhalt
  name        text not null,
  address     text default '',
  hours       text default '',
  phone       text default '',
  website     text default '',
  stars       text default '',
  description text default '',

  -- Geodaten (für Kartenansicht)
  lat         double precision,
  lon         double precision,

  -- Flags
  is_premium  boolean default false,        -- bezahlter Premium-Eintrag
  is_active   boolean default true,

  -- Timestamps
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Index für schnelle Suche
create index if not exists idx_listings_category  on public.listings(category);
create index if not exists idx_listings_source    on public.listings(source);
create index if not exists idx_listings_active    on public.listings(is_active);
create index if not exists idx_listings_geo       on public.listings(lat, lon)
  where lat is not null and lon is not null;


-- ── Events / Kalender ────────────────────────────────────────────
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),

  -- Quelle & Deduplizierung
  source      text default 'manual',        -- manual | winterthur_com | myswitzerland | altekaserne
  source_id   text unique,                  -- verhindert Duplikate bei wiederholtem Import

  -- Inhalt
  title       text not null,
  cat         text not null,                -- festival | musik | kultur | markt |
                                            -- theater | tour | kulinarik | sport
  location    text default '',
  event_date  date not null,
  event_time  text default '',
  price       text default '',
  description text default '',
  url         text default '',

  -- Flag
  is_active   boolean default true,

  -- Timestamps
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Index für Kalender-Abfragen
create index if not exists idx_events_date     on public.events(event_date);
create index if not exists idx_events_cat      on public.events(cat);
create index if not exists idx_events_source   on public.events(source);
create index if not exists idx_events_active   on public.events(is_active);


-- ── Werbung / Anzeigen ───────────────────────────────────────────
create table if not exists public.ads (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  subtitle    text default '',
  cta_label   text default 'Mehr erfahren',
  cta_url     text default '',
  position    text default 'banner',        -- banner | inline
  is_active   boolean default true,
  created_at  timestamptz default now()
);


-- ═══════════════════════════════════════════════════════════════════
-- Row Level Security
-- ═══════════════════════════════════════════════════════════════════

alter table public.listings  enable row level security;
alter table public.events    enable row level security;
alter table public.ads       enable row level security;

-- Öffentlich lesen (App-Nutzer)
create policy "Public read listings"
  on public.listings for select using (is_active = true);

create policy "Public read events"
  on public.events for select using (is_active = true);

create policy "Public read ads"
  on public.ads for select using (is_active = true);

-- Nur Service Role darf schreiben (Import-Scripts & Admin-Panel)
create policy "Service write listings"
  on public.listings for all
  using (auth.jwt() ->> 'role' = 'service_role');

create policy "Service write events"
  on public.events for all
  using (auth.jwt() ->> 'role' = 'service_role');

create policy "Service write ads"
  on public.ads for all
  using (auth.jwt() ->> 'role' = 'service_role');


-- ═══════════════════════════════════════════════════════════════════
-- Auto-Update Timestamp
-- ═══════════════════════════════════════════════════════════════════

create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_listings_updated on public.listings;
create trigger trg_listings_updated
  before update on public.listings
  for each row execute function update_updated_at();

drop trigger if exists trg_events_updated on public.events;
create trigger trg_events_updated
  before update on public.events
  for each row execute function update_updated_at();


-- ═══════════════════════════════════════════════════════════════════
-- Nützliche Views für die App
-- ═══════════════════════════════════════════════════════════════════

-- Aktive Listings nach Kategorie zählen (für Category-Badges)
create or replace view public.listings_count_by_category as
select
  category,
  count(*) as total,
  count(*) filter (where is_premium) as premium_count
from public.listings
where is_active = true
group by category
order by category;

-- Kommende Events (ab heute)
create or replace view public.upcoming_events as
select *
from public.events
where is_active = true
  and event_date >= current_date
order by event_date, event_time;

-- Listings mit Koordinaten (für Kartenansicht)
create or replace view public.listings_with_geo as
select id, category, sub_type, name, address, hours, lat, lon, is_premium
from public.listings
where is_active = true
  and lat is not null
  and lon is not null;


-- ═══════════════════════════════════════════════════════════════════
-- Beispieldaten
-- ═══════════════════════════════════════════════════════════════════

insert into public.listings
  (source, source_id, category, sub_type, name, address, hours, phone, website, stars, description)
values
  ('manual','m_r1','restaurants','Schweizer Küche','Restaurant Neumarkt',
   'Neumarktgasse 1','Di–So 11:30–22:00','+41 52 212 21 21','restaurant-neumarkt.ch','',
   'Gehobene Schweizer Küche in der historischen Altstadt.'),

  ('manual','m_r2','restaurants','Italienisch','Ristorante Il Castello',
   'Steinberggasse 12','Mo–Sa 11:30–23:00','+41 52 212 44 55','ilcastello-winti.ch','',
   'Authentische neapolitanische Küche.'),

  ('manual','m_c1','cafes','Konditorei','Confiserie Lüthy',
   'Bahnhofplatz 7','Mo–Fr 07:30–19:00','+41 52 212 33 11','confiserie-luethy.ch','',
   'Traditionsgeschäft seit 1888.'),

  ('manual','m_b1','bars','Kulturbar','Kraftfeld Bar',
   'Wartstrasse 39','Mi–Sa 19:00–01:00','+41 52 202 02 88','kraftfeld.net','',
   'Kultbar mit Live-Musik – Indie, Jazz & Konzerte.'),

  ('manual','m_h1','hotels','','Hotel Wartmann',
   'Rudolfstrasse 15','24h Reception','+41 52 260 07 07','wartmann.ch','4',
   'Elegantes 4-Sterne-Hotel direkt am Hauptbahnhof.'),

  ('manual','m_h2','hotels','','ibis Winterthur City',
   'Brühlbergstrasse 1','24h Reception','+41 52 269 41 41','ibis.com','2',
   'Modernes Budget-Hotel zentral gelegen.'),

  ('manual','m_s1','sport','Schwimmbad','Hallenbad Geiselweid',
   'Geiselweidstrasse 15','Mo–Fr 06:30–21:30','+41 52 267 56 80','stadtwerk.winterthur.ch','',
   'Grosses Hallenbad mit 50m-Becken & Sauna. CHF 8.'),

  ('manual','m_k1','kultur','Museum','Kunstmuseum Winterthur',
   'Museumstrasse 52','Di–So 10:00–17:00','+41 52 267 51 72','kunstmuseum.ch','',
   'Eines der bedeutendsten Kunstmuseen der Schweiz.')
on conflict (source_id) do nothing;


insert into public.events
  (source, source_id, title, cat, location, event_date, event_time, price, description)
values
  ('manual','m_e1','Festival Classical Nuevo','musik',
   'Alte Kaserne','2026-03-27','19:00','CHF 25','Internationales Klassikfestival.'),

  ('manual','m_e2','Albanifest – Eröffnung','festival',
   'Stadtpark','2026-06-25','14:00','Gratis','Das grösste Stadtfest Winterthurs.'),

  ('manual','m_e3','Winterthur Stadtlauf','sport',
   'Stadthaus','2026-04-05','10:00','CHF 25','Jährlicher Stadtlauf durch die Altstadt.'),

  ('manual','m_e4','Velotour Weinland','tour',
   'Hauptbahnhof','2026-04-25','09:00','CHF 65','E-Bike-Tour durchs Zürcher Weinland.'),

  ('manual','m_e5','Wochenmarkt Winterthur','markt',
   'Marktgasse','2026-05-01','07:00','Gratis','Frische Regionalprodukte & Streetfood.')
on conflict (source_id) do nothing;


insert into public.ads (title, subtitle, cta_label, cta_url, position)
values
  ('Hotel Wartmann ⭐⭐⭐⭐',
   'Frühbucherrabatt 10% – direkt buchen!',
   'Buchen →', 'https://wartmann.ch', 'banner'),

  ('Banana City Hotel',
   'Design & Komfort ab CHF 149/Nacht',
   'Mehr erfahren', 'https://bananacity.ch', 'inline')
on conflict do nothing;


-- ═══════════════════════════════════════════════════════════════════
-- Migration: Falls Tabellen bereits existieren (alte Version)
-- Führe diese Befehle aus wenn das Schema schon installiert war:
-- ═══════════════════════════════════════════════════════════════════
/*
alter table public.listings
  add column if not exists source     text default 'manual',
  add column if not exists source_id  text,
  add column if not exists lat        double precision,
  add column if not exists lon        double precision;

alter table public.events
  add column if not exists source     text default 'manual',
  add column if not exists source_id  text,
  add column if not exists url        text default '';

-- Eindeutiger Index für source_id (nach dem Befüllen)
create unique index if not exists idx_listings_source_id on public.listings(source_id)
  where source_id is not null;

create unique index if not exists idx_events_source_id on public.events(source_id)
  where source_id is not null;
*/
