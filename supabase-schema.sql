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
  source      text default 'manual',        -- manual | winterthur_com | myswitzerland | altekaserne |
                                             --   stadttheater | casinotheater | musikkollegium |
                                             --   fotomuseum | technorama | kunsthalle |
                                             --   stadt_winterthur | eventbrite | opendata_swiss |
                                             --   stadtbibliothek | naturmuseum | gewerbemuseum
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

  ('manual','m_h1','hotels','Luxus','Hotel Wartmann',
   'Rudolfstrasse 15','24h Reception','+41 52 260 07 07','wartmann.ch','4',
   'Elegantes 4-Sterne-Hotel direkt am Hauptbahnhof.'),

  ('manual','m_h2','hotels','Budget','ibis Winterthur City',
   'Brühlbergstrasse 1','24h Reception','+41 52 269 41 41','ibis.com','2',
   'Modernes Budget-Hotel zentral gelegen.'),

  ('manual','m_s1','sport','Schwimmbad','Hallenbad Geiselweid',
   'Geiselweidstrasse 15','Mo–Fr 06:30–21:30','+41 52 267 56 80','stadtwerk.winterthur.ch','',
   'Grosses Hallenbad mit 50m-Becken & Sauna. CHF 8.'),

  ('manual','m_k1','kultur','Museum','Kunstmuseum Winterthur',
   'Museumstrasse 52','Di–So 10:00–17:00','+41 52 267 51 72','kunstmuseum.ch','',
   'Eines der bedeutendsten Kunstmuseen der Schweiz.')
on conflict (source_id) do update
  set sub_type = excluded.sub_type;


-- ── Weitere Restaurants ───────────────────────────────────────────────────────
insert into public.listings
  (source, source_id, category, sub_type, name, address, hours, phone, website, description)
values
  ('manual','m_r3','restaurants','Schweizer Küche','Restaurant Haldenbad',
   'Haldengutstrasse 90','Di–So 11:00–23:00','+41 52 222 12 12','haldenbad.ch',
   'Traditionsrestaurant mit Terrasse und Winterthurer Hausmannskost.'),

  ('manual','m_r4','restaurants','Schweizer Küche','Gasthof Zum Goldenen Kreuz',
   'Marktgasse 49','Mo–Fr 11:30–14:00, 18:00–22:00','+41 52 213 21 21','goldenes-kreuz-winti.ch',
   'Klassische Wirtschaft mit saisonaler Küche und historischem Ambiente.'),

  ('manual','m_r5','restaurants','Italienisch','Pizzeria Da Vinci',
   'Technikumstrasse 10','Mo–Sa 11:30–14:00, 17:30–22:30','+41 52 212 88 90','',
   'Hausgemachte Pasta und knusprige Pizzen aus dem Holzofen.'),

  ('manual','m_r6','restaurants','Italienisch','Trattoria Bella Vista',
   'Tösstalstrasse 2','Di–So 12:00–14:00, 18:00–22:00','+41 52 233 10 10','',
   'Gemütliche Trattoria mit authentischen Rezepten aus der Toskana.'),

  ('manual','m_r7','restaurants','Asiatisch','Asia Garden',
   'Rudolfstrasse 5','Mo–So 11:30–14:30, 17:30–22:30','+41 52 212 55 66','',
   'Grosse Auswahl an chinesischen und asiatischen Spezialitäten.'),

  ('manual','m_r8','restaurants','Asiatisch','Sushi Bar Kyoto',
   'Marktgasse 18','Di–Sa 12:00–14:00, 18:00–22:00','+41 52 212 77 88','',
   'Frisches Sushi und japanische Spezialitäten in modernem Ambiente.'),

  ('manual','m_r9','restaurants','Asiatisch','Thai Garden Winterthur',
   'Technikumstrasse 62','Mo–Sa 11:30–14:30, 18:00–22:00','+41 52 212 99 00','',
   'Authentische Thai-Küche mit vegetarischen und veganen Optionen.'),

  ('manual','m_r10','restaurants','Burger & Grill','Holy Cow Winterthur',
   'Marktgasse 55','Mo–So 11:00–22:30','+41 52 202 10 20','holycow.ch',
   'Preisgekrönte Schweizer Burger-Bar mit frischen Zutaten.'),

  ('manual','m_r11','restaurants','Burger & Grill','Hans im Glück Winterthur',
   'Bahnhofplatz 12','Mo–Do 11:00–23:00, Fr–Sa 11:00–00:00','+41 52 508 20 60','hansimglueck.ch',
   'Burger-Restaurant im Birkenwald-Konzept – nachhaltig und stylish.'),

  ('manual','m_r12','restaurants','Vegetarisch','Café Erde',
   'Rudolfstrasse 8','Mo–Fr 08:00–18:00, Sa 09:00–17:00','+41 52 213 05 05','cafe-erde.ch',
   'Bio-Café mit veganer und vegetarischer Küche, Fair-Trade-Kaffee.'),

  ('manual','m_r13','restaurants','Vegetarisch','Hiltl Winterthur',
   'Steinberggasse 20','Mo–Sa 11:00–22:00','+41 52 212 40 00','hiltl.ch',
   'Vegetarisches und veganes Restaurant der legendären Hiltl-Gruppe.'),

  ('manual','m_r14','restaurants','International','El Sabor',
   'Technikumstrasse 24','Di–Sa 18:00–23:00','+41 52 212 33 44','',
   'Spanische Tapas und Paella in lebhafter Atmosphäre.'),

  ('manual','m_r15','restaurants','International','Mezze Winterthur',
   'Tösstalstrasse 12','Mo–Sa 17:00–23:00','+41 52 233 44 55','',
   'Libanesische und orientalische Spezialitäten zum Teilen.')
on conflict (source_id) do nothing;


-- ── Weitere Cafés ─────────────────────────────────────────────────────────────
insert into public.listings
  (source, source_id, category, sub_type, name, address, hours, phone, website, description)
values
  ('manual','m_c2','cafes','Café-Bar','Café Lotti',
   'Marktgasse 33','Mo–Fr 07:30–19:00, Sa 08:00–18:00','+41 52 212 22 33','cafe-lotti.ch',
   'Beliebtes Stammcafé im Herzen der Altstadt mit hausgemachten Kuchen.'),

  ('manual','m_c3','cafes','Café-Bar','Café Schönfels',
   'Schönfelsstrasse 24','Mo–Fr 07:00–18:30, Sa 08:00–17:00','+41 52 232 10 10','',
   'Gemütliches Quartiercafé mit Garten und frischen Brötchen.'),

  ('manual','m_c4','cafes','Bistro','Café Blum',
   'Rudolfstrasse 28','Mo–Fr 08:00–17:00','+41 52 213 10 20','',
   'Helles Bistro mit hausgemachten Suppen, Sandwiches und Bio-Kaffee.'),

  ('manual','m_c5','cafes','Bäckerei','Bäckerei & Konditorei Reist',
   'Marktgasse 68','Mo–Fr 06:30–18:30, Sa 06:30–17:00','+41 52 212 10 15','baeckerei-reist.ch',
   'Traditionsbäckerei mit frischem Brot, Gipfeln und feinen Patisserie-Stücken.'),

  ('manual','m_c6','cafes','Frühstück','Mr. Pancake Winterthur',
   'Technikumstrasse 8','Sa–So 09:00–15:00','+41 52 508 30 30','',
   'Frühstücks-Hotspot am Wochenende – Pancakes, Eggs Benedict und mehr.'),

  ('manual','m_c7','cafes','Konditorei','Confiserie Wettstein',
   'Steinberggasse 5','Mo–Fr 07:00–18:30, Sa 07:00–16:00','+41 52 212 15 25','',
   'Feine Pralinés, Torten und Saisonsgebäck seit über 60 Jahren.'),

  ('manual','m_c8','cafes','Bistro','Merkur Bistro',
   'Bahnhofplatz 1','Mo–Fr 07:00–20:00, Sa 08:00–18:00','+41 52 267 22 00','',
   'Zentrales Bistro am Hauptbahnhof für einen schnellen Kaffee und Lunch.')
on conflict (source_id) do nothing;


-- ── Weitere Bars ─────────────────────────────────────────────────────────────
insert into public.listings
  (source, source_id, category, sub_type, name, address, hours, phone, website, description)
values
  ('manual','m_b2','bars','Kulturbar','Albani Winterthur',
   'Steinberggasse 10','Do–Sa 20:00–03:00','+41 52 202 02 80','albani.ch',
   'Legendärer Musikclub mit nationalen und internationalen Konzerten.'),

  ('manual','m_b3','bars','Cocktailbar','Barfly Winterthur',
   'Marktgasse 60','Di–Sa 18:00–02:00','+41 52 212 60 60','',
   'Stylische Cocktailbar mit kreativen Eigenkreationen und Klassikern.'),

  ('manual','m_b4','bars','Cocktailbar','Hemingways Bar',
   'Rudolfstrasse 22','Mo–Sa 17:00–01:00','+41 52 212 70 70','',
   'Elegante Bar im Retro-Stil mit umfangreicher Spirituosenkarte.'),

  ('manual','m_b5','bars','Weinbar','Weinbar Vino',
   'Technikumstrasse 15','Di–Sa 17:00–00:00','+41 52 213 80 80','',
   'Kuratierte Schweizer und internationale Weine, Käse- und Charcuterie-Platten.'),

  ('manual','m_b6','bars','Weinbar','Weinhandlung & Bar Osterwalder',
   'Marktgasse 72','Mo–Fr 10:00–19:00, Sa 10:00–17:00','+41 52 212 90 90','',
   'Traditioneller Weinhandel mit angeschlossener Weinbar und Degustationen.'),

  ('manual','m_b7','bars','Craft Beer','Hopfenland',
   'Wartstrasse 50','Mi–Sa 17:00–00:00','+41 52 202 50 50','hopfenland.ch',
   'Craft-Beer-Bar mit über 20 Bieren vom Fass aus lokalen und internationalen Brauereien.'),

  ('manual','m_b8','bars','Tapas','Bar El Toro',
   'Tösstalstrasse 8','Di–Sa 18:00–01:00','+41 52 233 55 55','',
   'Spanische Tapas-Bar mit lebhafter Atmosphäre und gutem Wein.')
on conflict (source_id) do nothing;


-- ── Weitere Hotels ────────────────────────────────────────────────────────────
insert into public.listings
  (source, source_id, category, sub_type, name, address, hours, phone, website, stars, description)
values
  ('manual','m_h3','hotels','Mittelklasse','Banana City Hotel',
   'Brühlbergstrasse 10','24h Reception','+41 52 260 55 55','bananacity.ch','3',
   'Design-Boutique-Hotel mit modernen Zimmern, zentral in der Innenstadt.'),

  ('manual','m_h4','hotels','Hostel','Jugendherberge Winterthur',
   'Schaffhauserstrasse 27','07:00–23:00','+41 52 212 57 27','youthhostel.ch','',
   'Günstige Unterkunft für Reisende, Schlafsaal und Privatzimmer verfügbar.'),

  ('manual','m_h5','hotels','Mittelklasse','Hotel Krone Winterthur',
   'Marktgasse 49','24h Reception','+41 52 208 18 18','hotelkrone-winterthur.ch','3',
   'Familiäres 3-Sterne-Hotel direkt in der Fussgängerzone der Altstadt.'),

  ('manual','m_h6','hotels','Boutique','Garten-Hotel Winterthur',
   'Stadthausstrasse 4','24h Reception','+41 52 267 46 46','gartenhotel.ch','4',
   'Ruhiges Boutique-Hotel mit Garten, eleganten Zimmern und persönlichem Service.')
on conflict (source_id) do nothing;


-- ── Sightseeing ───────────────────────────────────────────────────────────────
insert into public.listings
  (source, source_id, category, sub_type, name, address, hours, phone, website, description)
values
  ('manual','m_si1','sightseeing','Historisch','Altes Stadthaus Winterthur',
   'Marktgasse 1','Aussenbereich jederzeit zugänglich','','winterthur.ch',
   'Das historische Rathaus aus dem 17. Jahrhundert prägt das Stadtbild der Altstadt.'),

  ('manual','m_si2','sightseeing','Kirchen','Stadtkirche Winterthur',
   'Kirchplatz 5','Mo–Sa 09:00–17:00','+41 52 267 51 00','stadtkirche-winterthur.ch',
   'Imposante Kirche mit romanischen Ursprüngen, Wahrzeichen der Stadt.'),

  ('manual','m_si3','sightseeing','Kirchen','Klosterkirche Töss',
   'Klosterhofstrasse 12','Mo–So 10:00–17:00','','',
   'Mittelalterliche Klosterkirche des einstigen Dominikanerinnenklosters Töss.'),

  ('manual','m_si4','sightseeing','Altstadt','Marktgasse Winterthur',
   'Marktgasse','jederzeit zugänglich','','winterthur.ch',
   'Die belebte Fussgängerzone der Altstadt mit historischen Laubengängen und Boutiquen.'),

  ('manual','m_si5','sightseeing','Altstadt','Steinberggasse',
   'Steinberggasse','jederzeit zugänglich','','',
   'Malerische Gasse mit alten Zunfthäusern, Cafés und Galerien.'),

  ('manual','m_si6','sightseeing','Aussichtspunkte','Aussichtspunkt Lindberg',
   'Lindbergstrasse','jederzeit zugänglich','','',
   'Herrlicher Panoramablick über die Stadt und die umliegenden Hügel.'),

  ('manual','m_si7','sightseeing','Aussichtspunkte','Brühlberg Aussichtspunkt',
   'Brühlbergstrasse','jederzeit zugänglich','','',
   'Naherholungsgebiet mit Aussichtspunkt und Waldwegen direkt über der Stadt.'),

  ('manual','m_si8','sightseeing','Historisch','Schloss Hegi',
   'Hegifeldstrasse 125','Mi–So 14:00–17:00','+41 52 232 09 31','schloss-hegi.ch',
   'Spätmittelalterliches Wasserschloss aus dem 15. Jahrhundert mit Führungen.'),

  ('manual','m_si9','sightseeing','Historisch','Villa Flora',
   'Technikumstrasse 44','Di–So 11:00–17:00','+41 52 267 51 65','villaflora.ch',
   'Historische Villa mit bedeutender Impressionisten-Sammlung und Garten.')
on conflict (source_id) do nothing;


-- ── Weitere Kultur ────────────────────────────────────────────────────────────
insert into public.listings
  (source, source_id, category, sub_type, name, address, hours, phone, website, description)
values
  ('manual','m_k2','kultur','Museum','Technorama Winterthur',
   'Technoramastrasse 1','Di–So 10:00–17:00','+41 52 244 08 44','technorama.ch',
   'Schweizer Science Center – interaktive Experimente für Gross und Klein.'),

  ('manual','m_k3','kultur','Museum','Fotomuseum Winterthur',
   'Grüzenstrasse 44','Di–So 11:00–18:00','+41 52 234 10 60','fotomuseum.ch',
   'Internationales Museum für Fotografie und Fotokunst.'),

  ('manual','m_k4','kultur','Museum','Naturmuseum Winterthur',
   'Museumstrasse 52','Di–So 10:00–17:00','+41 52 267 51 62','naturmuseum.ch',
   'Natur- und Heimatmuseum mit Mineralogie, Zoologie und regionaler Geologie.'),

  ('manual','m_k5','kultur','Museum','Gewerbemuseum Winterthur',
   'Kirchplatz 14','Di–So 10:00–17:00','+41 52 267 51 36','gewerbemuseum.ch',
   'Museum für Design, Kunsthandwerk und angewandte Kunst.'),

  ('manual','m_k6','kultur','Theater','Stadttheater Winterthur',
   'Theaterstrasse 6','nach Spielplan','+41 52 267 80 80','stadttheater.winterthur.ch',
   'Grosses Stadttheater mit Oper, Schauspiel, Tanz und Konzerten.'),

  ('manual','m_k7','kultur','Theater','Casinotheater Winterthur',
   'Stadthausstrasse 119','nach Spielplan','+41 52 418 00 00','casinotheater.ch',
   'Bekanntes Theater für Comedy, Kabarett, Musicals und Gastspiele.'),

  ('manual','m_k8','kultur','Kulturzentrum','Alte Kaserne Winterthur',
   'Technikumstrasse 8','Mo–So 09:00–23:00','+41 52 203 34 34','altekaserne.ch',
   'Kulturzentrum mit Konzerten, Theater, Ausstellungen und Restaurant.'),

  ('manual','m_k9','kultur','Konzert','Musikkollegium Winterthur',
   'Stadthaus, Stadthausstrasse 6','nach Spielplan','+41 52 267 56 66','musikkollegium.ch',
   'Renommiertes Sinfonieorchester mit Konzertsaison im historischen Stadthaus.'),

  ('manual','m_k10','kultur','Galerie','Kunsthalle Winterthur',
   'Marktgasse 25','Di–So 12:00–18:00','+41 52 267 51 32','kunsthallewinterthur.ch',
   'Zeitgenössische Kunstausstellungen in der Innenstadt.')
on conflict (source_id) do nothing;


-- ── Geschäfte ─────────────────────────────────────────────────────────────────
insert into public.listings
  (source, source_id, category, sub_type, name, address, hours, phone, website, description)
values
  ('manual','m_g1','geschaefte','Mode','Manor Winterthur',
   'Bahnhofplatz 10','Mo–Fr 09:00–19:00, Sa 09:00–18:00','+41 52 260 25 00','manor.ch',
   'Grosses Warenhaus mit Mode, Haushalt, Kosmetik und Lebensmittelabteilung.'),

  ('manual','m_g2','geschaefte','Mode','H&M Winterthur',
   'Marktgasse 14','Mo–Sa 09:00–19:00','+41 52 269 33 20','hm.com',
   'Modische Kleidung und Accessoires für die ganze Familie.'),

  ('manual','m_g3','geschaefte','Bücher','Ex Libris Winterthur',
   'Marktgasse 60','Mo–Fr 09:00–18:30, Sa 09:00–17:00','+41 52 212 50 60','exlibris.ch',
   'Grosse Buchhandlung mit Büchern, CDs, DVDs und Spielen.'),

  ('manual','m_g4','geschaefte','Bücher','Osiander Winterthur',
   'Steinberggasse 8','Mo–Fr 09:00–18:30, Sa 09:00–17:00','+41 52 213 10 40','',
   'Unabhängige Buchhandlung mit sorgfältig kuratiertem Sortiment.'),

  ('manual','m_g5','geschaefte','Lebensmittel','Wochenmarkt Marktgasse',
   'Marktgasse','Di & Fr 07:00–12:00','','winterthur.ch',
   'Zweimal wöchentlich: frisches Gemüse, Obst, Käse und Blumen aus der Region.'),

  ('manual','m_g6','geschaefte','Lebensmittel','Migros Winterthur City',
   'Bahnhofplatz 8','Mo–Sa 07:00–20:00','+41 52 261 70 00','migros.ch',
   'Vollsortiment-Supermarkt direkt am Hauptbahnhof.'),

  ('manual','m_g7','geschaefte','Souvenirs','Winterthur Souvenir Shop',
   'Marktgasse 45','Mo–Sa 09:00–18:30','','',
   'Andenken, Postkarten und regionale Produkte aus Winterthur und der Schweiz.'),

  ('manual','m_g8','geschaefte','Elektronik','Media Markt Winterthur',
   'Neumarkt 3','Mo–Sa 09:00–19:00','+41 52 508 40 00','mediamarkt.ch',
   'Grosses Angebot an Elektronik, IT, Foto und Haushaltsgräten.')
on conflict (source_id) do nothing;


-- ── Weitere Sport ─────────────────────────────────────────────────────────────
insert into public.listings
  (source, source_id, category, sub_type, name, address, hours, phone, website, description)
values
  ('manual','m_s2','sport','Schwimmbad','Freibad Geiselweid',
   'Geiselweidstrasse 15','Mai–Sep 09:00–20:00','+41 52 267 56 80','stadtwerk.winterthur.ch',
   'Beliebtes Freibad mit 50m-Becken, Sprungturm und Liegewiese. CHF 6.'),

  ('manual','m_s3','sport','Schwimmbad','Freibad Wolfensberg',
   'Wolfensbergstrasse 50','Mai–Sep 09:00–20:00','+41 52 267 56 80','stadtwerk.winterthur.ch',
   'Familienbad mit Planschbecken, Wasserspielplatz und Restaurant.'),

  ('manual','m_s4','sport','Tennis','TC Winterthur',
   'Geiselweidstrasse 30','Mo–So 08:00–22:00','+41 52 267 10 10','tcwinterthur.ch',
   'Tennisclub mit Innen- und Aussenplätzen, Kursangebot für alle Stufen.'),

  ('manual','m_s5','sport','Tennis','TC Töss',
   'Tösstalstrasse 77','Mo–So 08:00–21:00','+41 52 233 20 20','',
   'Freundlicher Quartiertennis-Club mit 6 Sandplätzen.'),

  ('manual','m_s6','sport','Fitness','Fit4Life Winterthur',
   'Marktgasse 64','Mo–Fr 06:00–23:00, Sa–So 08:00–21:00','+41 52 212 80 80','fit4life.ch',
   'Modernes Fitnessstudio mit Geräten, Kursraum, Sauna und Duschen.'),

  ('manual','m_s7','sport','Fitness','John Reed Winterthur',
   'Rudolfstrasse 40','Mo–Fr 06:00–23:00, Sa–So 08:00–22:00','+41 52 202 90 90','johnreed.ch',
   'Urban Fitness mit DJ-Sound, einzigartiger Atmosphäre und breitem Kursangebot.'),

  ('manual','m_s8','sport','Eishockey','OXER Eishalle Winterthur',
   'Grüzefeldstrasse 82','nach Spielplan','+41 52 234 70 00','eishalle.ch',
   'Heimstadion des HC Winterthur – Eislaufen, Curling und Hockeyspiele.'),

  ('manual','m_s9','sport','Yoga','Yoga-Zone Winterthur',
   'Technikumstrasse 30','Mo–Sa 07:00–21:00','+41 52 213 90 90','yoga-zone.ch',
   'Yogaschule mit Hatha, Vinyasa und Yin Yoga für alle Stufen.'),

  ('manual','m_s10','sport','Fussball','Schützenwiese Sportanlage',
   'Schützenstrasse 25','nach Spielplan','+41 52 267 30 00','fcwinterthur.ch',
   'Heimstadion des FC Winterthur – Fussballspiele und öffentliches Training.'),

  ('manual','m_s11','sport','Radfahren','Velostation Winterthur',
   'Rudolfstrasse 1','Mo–Fr 06:00–22:00, Sa–So 08:00–20:00','+41 52 267 80 00','velostation-winterthur.ch',
   'Veloabstellplatz, -reparatur und -verleih direkt am Hauptbahnhof.')
on conflict (source_id) do nothing;


-- ── Touren ────────────────────────────────────────────────────────────────────
insert into public.listings
  (source, source_id, category, sub_type, name, address, hours, phone, website, description)
values
  ('manual','m_t1','touren','Stadtführung','Historische Stadtführung Winterthur',
   'Stadthaus, Stadthausstrasse 6','auf Anfrage','+41 52 267 67 00','winterthur-tourismus.ch',
   'Geführter Rundgang durch die mittelalterliche Altstadt mit Expertenführer. CHF 15.'),

  ('manual','m_t2','touren','Stadtführung','Winterthur bei Nacht – Geisterstunde',
   'Stadthaus, Stadthausstrasse 6','Fr 20:00 (Apr–Okt)','','winterthur-tourismus.ch',
   'Abendliche Stadtführung mit spannenden Geschichten und Legenden. CHF 20.'),

  ('manual','m_t3','touren','E-Bike','E-Bike Tour Thur-Route',
   'Hauptbahnhof Winterthur','täglich nach Anmeldung','+41 52 267 67 00','winterthur-tourismus.ch',
   'Geführte E-Bike-Tour entlang der Thur durch idyllische Dörfer und Natur. CHF 65.'),

  ('manual','m_t4','touren','Wandern','Wanderweg Eschenberg',
   'Parkplatz Eschenberg','jederzeit zugänglich','','',
   'Naturlehrpfad durch den Stadtwald Eschenberg mit Wildgehege und Aussichten.'),

  ('manual','m_t5','touren','Wandern','Wanderung Brühlberg – Lindberg',
   'Brühlbergstrasse Trampelpfad','jederzeit zugänglich','','',
   'Halbstündige Wanderung mit Panoramablick über Winterthur bis zu den Alpen.'),

  ('manual','m_t6','touren','Radtour','Velotour Altstadt & Seen',
   'Hauptbahnhof Winterthur','Sa 10:00 (Apr–Okt)','+41 52 267 67 00','winterthur-tourismus.ch',
   'Geführte Radtour durch die Altstadt und zu den Badeseen der Umgebung. CHF 35.'),

  ('manual','m_t7','touren','Weinland','Weinland Rundtour',
   'Hauptbahnhof Winterthur','So 09:00 (Mai–Sep)','','weinland.ch',
   'Tagesausflug ins Zürcher Weinland – Rebberge, Winzer und Degustation.'),

  ('manual','m_t8','touren','Radtour','Veloroute Eulachpark',
   'Eulachpark Eingang','jederzeit zugänglich','','',
   'Selbstgeführte Radtour durch den Eulachpark und das Grüngebiet Neftenbach.')
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
