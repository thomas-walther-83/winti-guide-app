-- ═══════════════════════════════════════════════════════════════════
-- Migration: Regelbasierte Erst-Befüllung von tags + image_urls
-- (initiale Daten-Inhalte — Admin-Pflege überschreibt das später)
--
-- Idempotent:
--  * Tags werden über `array(select distinct unnest(tags || new))` gemerged
--    – Mehrfach-Ausführen erzeugt keine Duplikate, Admin-Tags bleiben.
--  * image_urls wird NUR geschrieben, wenn das Feld leer ist
--    – Admin-Bilder werden nicht überschrieben.
-- ═══════════════════════════════════════════════════════════════════

-- ── Restaurants — Küchen-Stil ───────────────────────────────────────
update public.listings set tags = array(select distinct unnest(tags || array['Italienisch']))
  where category = 'restaurants' and (
    name ilike '%italien%' or name ilike '%pizza%' or name ilike '%trattoria%'
    or name ilike '%osteria%' or name ilike '%pizzeria%' or name ilike '%ristorante%'
    or sub_type ilike '%italien%'
  );
update public.listings set tags = array(select distinct unnest(tags || array['Pizza']))
  where category = 'restaurants' and (name ilike '%pizza%' or name ilike '%pizzeria%');
update public.listings set tags = array(select distinct unnest(tags || array['Asiatisch']))
  where category = 'restaurants' and (
    name ilike '%asia%' or name ilike '%sushi%' or name ilike '%thai%'
    or name ilike '%chinesisch%' or name ilike '%vietnam%' or name ilike '%korean%'
    or name ilike '%japan%' or sub_type ilike '%asia%' or sub_type ilike '%japan%'
    or sub_type ilike '%chines%' or sub_type ilike '%thai%'
  );
update public.listings set tags = array(select distinct unnest(tags || array['Sushi']))
  where category = 'restaurants' and (name ilike '%sushi%' or sub_type ilike '%sushi%');
update public.listings set tags = array(select distinct unnest(tags || array['Schweizerisch']))
  where category = 'restaurants' and (
    name ilike '%schweizerhof%' or name ilike '%fondue%' or name ilike '%raclette%'
    or sub_type ilike '%schweiz%' or sub_type ilike '%traditionell%'
  );
update public.listings set tags = array(select distinct unnest(tags || array['Burger']))
  where category = 'restaurants' and (name ilike '%burger%' or sub_type ilike '%burger%');
update public.listings set tags = array(select distinct unnest(tags || array['Steak']))
  where category = 'restaurants' and (name ilike '%steak%' or name ilike '%grill%' or sub_type ilike '%steak%');
update public.listings set tags = array(select distinct unnest(tags || array['Indisch']))
  where category = 'restaurants' and (
    name ilike '%indisch%' or name ilike '%indian%' or name ilike '%curry%' or sub_type ilike '%indisch%'
  );
update public.listings set tags = array(select distinct unnest(tags || array['Türkisch']))
  where category = 'restaurants' and (
    name ilike '%türkisch%' or name ilike '%kebab%' or name ilike '%döner%' or name ilike '%doner%'
    or sub_type ilike '%türk%'
  );
update public.listings set tags = array(select distinct unnest(tags || array['Mexikanisch']))
  where category = 'restaurants' and (name ilike '%mexikan%' or name ilike '%taco%' or name ilike '%burrito%');
update public.listings set tags = array(select distinct unnest(tags || array['Mediterran']))
  where category = 'restaurants' and (
    name ilike '%mediterran%' or name ilike '%griechisch%' or name ilike '%spanisch%' or sub_type ilike '%medi%'
  );
update public.listings set tags = array(select distinct unnest(tags || array['Französisch']))
  where category = 'restaurants' and (name ilike '%franzö%' or name ilike '%bistro%' or sub_type ilike '%franz%');

-- ── Vegetarisch / Vegan (kategorieübergreifend, Restaurants + Cafés) ─
update public.listings set tags = array(select distinct unnest(tags || array['Vegetarisch']))
  where category in ('restaurants','cafes') and (
    name ilike '%veggi%' or name ilike '%vegi%' or sub_type ilike '%vegetari%' or sub_type ilike '%vegi%'
  );
update public.listings set tags = array(select distinct unnest(tags || array['Vegan']))
  where category in ('restaurants','cafes') and (name ilike '%vegan%' or sub_type ilike '%vegan%');

-- ── Cafés ───────────────────────────────────────────────────────────
-- Default: jedes Café bekommt „Frühstück" (statistisch fast immer passend)
update public.listings set tags = array(select distinct unnest(tags || array['Frühstück']))
  where category = 'cafes';
update public.listings set tags = array(select distinct unnest(tags || array['Brunch']))
  where category = 'cafes' and (name ilike '%brunch%' or sub_type ilike '%brunch%');
update public.listings set tags = array(select distinct unnest(tags || array['Kuchen']))
  where category = 'cafes' and (
    sub_type ilike '%konditorei%' or sub_type ilike '%bäcker%' or sub_type ilike '%backer%'
    or name ilike '%konditorei%' or name ilike '%bäckerei%' or name ilike '%baeckerei%'
  );
update public.listings set tags = array(select distinct unnest(tags || array['Take-away']))
  where category = 'cafes' and (sub_type ilike '%take%' or name ilike '%coffee%' or name ilike '%starbucks%');

-- ── Bars ────────────────────────────────────────────────────────────
update public.listings set tags = array(select distinct unnest(tags || array['Cocktails']))
  where category = 'bars' and (sub_type ilike '%cocktail%' or name ilike '%cocktail%' or sub_type ilike '%lounge%');
update public.listings set tags = array(select distinct unnest(tags || array['Wein']))
  where category = 'bars' and (sub_type ilike '%wein%' or name ilike '%wein%' or name ilike '%vinotek%' or name ilike '%vinothek%');
update public.listings set tags = array(select distinct unnest(tags || array['Bier']))
  where category = 'bars' and (
    sub_type ilike '%bier%' or sub_type ilike '%brauerei%' or name ilike '%brauerei%' or name ilike '%pub%'
  );
update public.listings set tags = array(select distinct unnest(tags || array['Live-Musik']))
  where category = 'bars' and (sub_type ilike '%live%' or sub_type ilike '%musik%' or name ilike '%albani%');

-- ── Hotels — Sterne aus Spalte `stars` ─────────────────────────────
update public.listings set tags = array(select distinct unnest(tags || array[stars || '-Sterne']))
  where category = 'hotels' and stars is not null and stars <> '' and stars ~ '^[0-9]+$';
-- Business / Familie / Wellness anhand Name/Sub-Type
update public.listings set tags = array(select distinct unnest(tags || array['Business']))
  where category = 'hotels' and (sub_type ilike '%business%' or name ilike '%business%');
update public.listings set tags = array(select distinct unnest(tags || array['Wellness']))
  where category = 'hotels' and (sub_type ilike '%wellness%' or sub_type ilike '%spa%' or name ilike '%spa%');

-- ── Kultur ──────────────────────────────────────────────────────────
update public.listings set tags = array(select distinct unnest(tags || array['Museum']))
  where category = 'kultur' and (sub_type ilike '%museum%' or name ilike '%museum%');
update public.listings set tags = array(select distinct unnest(tags || array['Theater']))
  where category = 'kultur' and (
    sub_type ilike '%theater%' or name ilike '%theater%' or name ilike '%casinotheater%'
  );
update public.listings set tags = array(select distinct unnest(tags || array['Konzert']))
  where category = 'kultur' and (
    sub_type ilike '%konzert%' or sub_type ilike '%musik%' or name ilike '%musikkollegium%'
  );
update public.listings set tags = array(select distinct unnest(tags || array['Galerie']))
  where category = 'kultur' and (
    sub_type ilike '%galerie%' or sub_type ilike '%kunst%'
    or name ilike '%kunsthalle%' or name ilike '%kunst museum%' or name ilike '%fotomuseum%'
  );

-- ── Sightseeing ─────────────────────────────────────────────────────
update public.listings set tags = array(select distinct unnest(tags || array['Historisch']))
  where category = 'sightseeing' and (
    sub_type ilike '%historisch%' or sub_type ilike '%altstadt%'
    or name ilike '%stadthaus%' or name ilike '%rathaus%' or name ilike '%stadtkirche%'
    or name ilike '%kirche%' or name ilike '%kloster%'
  );
update public.listings set tags = array(select distinct unnest(tags || array['Park']))
  where category = 'sightseeing' and (
    sub_type ilike '%park%' or name ilike '%park%' or name ilike '%garten%' or name ilike '%eulach%'
  );
update public.listings set tags = array(select distinct unnest(tags || array['Aussicht']))
  where category = 'sightseeing' and (
    name ilike '%goldenberg%' or name ilike '%bürgli%' or name ilike '%aussicht%'
    or sub_type ilike '%aussicht%'
  );
update public.listings set tags = array(select distinct unnest(tags || array['Architektur']))
  where category = 'sightseeing' and (sub_type ilike '%architekt%' or name ilike '%villa%');

-- ── Sport ───────────────────────────────────────────────────────────
update public.listings set tags = array(select distinct unnest(tags || array['Schwimmen']))
  where category = 'sport' and (
    sub_type ilike '%schwimm%' or sub_type ilike '%bad%'
    or name ilike '% bad %' or name ilike '%freibad%' or name ilike '%hallenbad%'
  );
update public.listings set tags = array(select distinct unnest(tags || array['Fitness']))
  where category = 'sport' and (sub_type ilike '%fitness%' or sub_type ilike '%gym%');
update public.listings set tags = array(select distinct unnest(tags || array['Outdoor']))
  where category = 'sport' and (
    sub_type ilike '%outdoor%' or sub_type ilike '%wandern%' or sub_type ilike '%velo%'
    or sub_type ilike '%bike%' or sub_type ilike '%minigolf%'
  );
update public.listings set tags = array(select distinct unnest(tags || array['Eishockey']))
  where category = 'sport' and (name ilike '%ehc%' or name ilike '%eishalle%' or sub_type ilike '%eishockey%');
update public.listings set tags = array(select distinct unnest(tags || array['Fußball']))
  where category = 'sport' and (sub_type ilike '%fussball%' or sub_type ilike '%fußball%' or name ilike '%fcw%');

-- ── Geschäfte ───────────────────────────────────────────────────────
update public.listings set tags = array(select distinct unnest(tags || array['Mode']))
  where category = 'geschaefte' and (sub_type ilike '%mode%' or sub_type ilike '%kleid%');
update public.listings set tags = array(select distinct unnest(tags || array['Lebensmittel']))
  where category = 'geschaefte' and (
    sub_type ilike '%lebensmittel%' or name ilike '%coop%' or name ilike '%migros%' or name ilike '%lidl%'
  );
update public.listings set tags = array(select distinct unnest(tags || array['Bücher']))
  where category = 'geschaefte' and (sub_type ilike '%buch%' or sub_type ilike '%book%' or name ilike '%buch%');
update public.listings set tags = array(select distinct unnest(tags || array['Geschenke']))
  where category = 'geschaefte' and (sub_type ilike '%geschenk%' or name ilike '%manor%' or name ilike '%globus%');

-- ── Touren ──────────────────────────────────────────────────────────
update public.listings set tags = array(select distinct unnest(tags || array['Stadtführung']))
  where category = 'touren' and (sub_type ilike '%stadt%' or name ilike '%stadt%');
update public.listings set tags = array(select distinct unnest(tags || array['Geführt']))
  where category = 'touren';

-- ═══════════════════════════════════════════════════════════════════
-- Bilder: (ENTFERNT)
--
-- Dieser Block hat ursprünglich picsum.photos-Platzhalter gesetzt. Die
-- zufälligen Stockfotos wirkten irreführend (Naturbilder, die nichts mit
-- der Location zu tun haben). Picsum wird daher nicht mehr gesät; die
-- Migration 20260609 entfernt vorhandene Picsum-URLs wieder. Listings
-- ohne echtes Bild zeigen im Frontend den farbigen Kategorie-Block.
-- ═══════════════════════════════════════════════════════════════════
