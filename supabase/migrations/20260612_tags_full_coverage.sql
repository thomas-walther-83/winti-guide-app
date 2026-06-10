-- ═══════════════════════════════════════════════════════════════════
-- Migration: Lückenlose Tag-Abdeckung — jedes Listing ≥ 1 Sub-Tag
--
-- Die Erst-Befüllung (20260608) taggte nur Listings mit Hinweisen im
-- Namen. Diese Migration leitet zusätzlich Tags aus dem OSM-sub_type
-- ab (englische Werte → deutsche Chip-Labels aus subcategories.ts)
-- und vergibt kategorie-spezifische Fallbacks, sodass am Ende KEIN
-- aktives Listing mehr ohne Tag ist.
--
-- Idempotent: Merge via array(select distinct unnest(tags || new)).
-- ═══════════════════════════════════════════════════════════════════

-- ── Restaurants: OSM-cuisine (sub_type) → deutsche Tags ──────────────
update public.listings set tags = array(select distinct unnest(tags || array['Italienisch']))
  where category = 'restaurants' and sub_type ~* '(^|[;,/| ])(italian|italienisch)([;,/| ]|$)';
update public.listings set tags = array(select distinct unnest(tags || array['Pizza']))
  where category = 'restaurants' and sub_type ~* 'pizza';
update public.listings set tags = array(select distinct unnest(tags || array['Asiatisch']))
  where category = 'restaurants' and sub_type ~* '(asian|chinese|thai|vietnamese|korean|indian|asiatisch)';
update public.listings set tags = array(select distinct unnest(tags || array['Sushi']))
  where category = 'restaurants' and sub_type ~* '(sushi|japanese)';
update public.listings set tags = array(select distinct unnest(tags || array['Schweizer Küche']))
  where category = 'restaurants' and sub_type ~* '(swiss|regional|local|schweizer)';
update public.listings set tags = array(select distinct unnest(tags || array['Burger']))
  where category = 'restaurants' and sub_type ~* '(burger|american|grill|barbecue|bbq|steak)';
update public.listings set tags = array(select distinct unnest(tags || array['Vegetarisch']))
  where category = 'restaurants' and sub_type ~* '(vegetarian|vegan|vegetarisch)';
update public.listings set tags = array(select distinct unnest(tags || array['Türkisch']))
  where category = 'restaurants' and sub_type ~* '(kebab|turkish|tuerkisch|türkisch|doner|döner)';
update public.listings set tags = array(select distinct unnest(tags || array['Take-away']))
  where category = 'restaurants' and sub_type ~* '(fast_food|takeaway|take-away)';
update public.listings set tags = array(select distinct unnest(tags || array['Mediterran']))
  where category = 'restaurants' and sub_type ~* '(greek|spanish|portuguese|mediterran|lebanese|oriental)';
update public.listings set tags = array(select distinct unnest(tags || array['Französisch']))
  where category = 'restaurants' and sub_type ~* '(french|franzö)';

-- ── Cafés ────────────────────────────────────────────────────────────
update public.listings set tags = array(select distinct unnest(tags || array['Bäckerei']))
  where category = 'cafes' and sub_type ~* '(bakery|bäckerei|baeckerei)';
update public.listings set tags = array(select distinct unnest(tags || array['Kuchen']))
  where category = 'cafes' and sub_type ~* '(confectionery|pastry|konditorei)';

-- ── Bars ─────────────────────────────────────────────────────────────
update public.listings set tags = array(select distinct unnest(tags || array['Bier']))
  where category = 'bars' and sub_type ~* '(pub|beer|biergarten|brauerei)';
update public.listings set tags = array(select distinct unnest(tags || array['Cocktails']))
  where category = 'bars' and sub_type ~* '(cocktail|lounge|nightclub)';
update public.listings set tags = array(select distinct unnest(tags || array['Wein']))
  where category = 'bars' and sub_type ~* '(wine|wein)';

-- ── Hotels: Klassen-Tags aus sub_type ───────────────────────────────
update public.listings set tags = array(select distinct unnest(tags || array['Hostel']))
  where category = 'hotels' and sub_type ~* 'hostel';
update public.listings set tags = array(select distinct unnest(tags || array['Boutique']))
  where category = 'hotels' and sub_type ~* '(guest_house|boutique|b&b|bed_and_breakfast)';
update public.listings set tags = array(select distinct unnest(tags || array['Budget']))
  where category = 'hotels' and sub_type ~* '(motel|budget)';

-- ── Sightseeing ──────────────────────────────────────────────────────
update public.listings set tags = array(select distinct unnest(tags || array['Kirche']))
  where category = 'sightseeing' and sub_type ~* '(church|place_of_worship|kirche|kloster)';
update public.listings set tags = array(select distinct unnest(tags || array['Aussicht']))
  where category = 'sightseeing' and sub_type ~* 'viewpoint';
update public.listings set tags = array(select distinct unnest(tags || array['Historisch']))
  where category = 'sightseeing' and sub_type ~* '(monument|castle|historic|ruins|memorial)';

-- ── Sport ────────────────────────────────────────────────────────────
update public.listings set tags = array(select distinct unnest(tags || array['Schwimmen']))
  where category = 'sport' and sub_type ~* '(swimming|public_bath|water_park)';
update public.listings set tags = array(select distinct unnest(tags || array['Fitness']))
  where category = 'sport' and sub_type ~* '(fitness|gym|sports_centre)';
update public.listings set tags = array(select distinct unnest(tags || array['Tennis']))
  where category = 'sport' and sub_type ~* 'tennis';
update public.listings set tags = array(select distinct unnest(tags || array['Fußball']))
  where category = 'sport' and sub_type ~* '(soccer|football|pitch)';
update public.listings set tags = array(select distinct unnest(tags || array['Eishockey']))
  where category = 'sport' and sub_type ~* '(ice_rink|ice_hockey)';
update public.listings set tags = array(select distinct unnest(tags || array['Yoga']))
  where category = 'sport' and sub_type ~* 'yoga';
update public.listings set tags = array(select distinct unnest(tags || array['Radfahren']))
  where category = 'sport' and sub_type ~* '(cycling|bicycle)';

-- ── Geschäfte ────────────────────────────────────────────────────────
update public.listings set tags = array(select distinct unnest(tags || array['Mode']))
  where category = 'geschaefte' and sub_type ~* '(clothes|fashion|mode|shoes)';
update public.listings set tags = array(select distinct unnest(tags || array['Bücher']))
  where category = 'geschaefte' and sub_type ~* '(books|buch)';
update public.listings set tags = array(select distinct unnest(tags || array['Lebensmittel']))
  where category = 'geschaefte' and sub_type ~* '(supermarket|organic|marketplace|food|deli)';
update public.listings set tags = array(select distinct unnest(tags || array['Elektronik']))
  where category = 'geschaefte' and sub_type ~* '(electronics|computer|mobile_phone)';
update public.listings set tags = array(select distinct unnest(tags || array['Geschenke']))
  where category = 'geschaefte' and sub_type ~* '(gift|souvenir)';

-- ── Kultur ───────────────────────────────────────────────────────────
update public.listings set tags = array(select distinct unnest(tags || array['Museum']))
  where category = 'kultur' and sub_type ~* 'museum';
update public.listings set tags = array(select distinct unnest(tags || array['Galerie']))
  where category = 'kultur' and sub_type ~* '(gallery|galerie|arts_centre)';
update public.listings set tags = array(select distinct unnest(tags || array['Kino']))
  where category = 'kultur' and sub_type ~* 'cinema';
update public.listings set tags = array(select distinct unnest(tags || array['Theater']))
  where category = 'kultur' and sub_type ~* '(theatre|theater)';

-- ── Fallbacks: danach noch tag-lose Listings ─────────────────────────
-- Restaurants ohne jeden Küchen-Hinweis → 'International' (existierender
-- Chip in subcategories.ts, ehrlicher Sammelbegriff).
update public.listings set tags = array['International']
  where category = 'restaurants' and (tags = '{}' or tags is null);
-- Cafés ohne Tags → 'Frühstück' (Default der Erst-Befüllung, hier zur
-- Sicherheit für seither importierte Zeilen).
update public.listings set tags = array['Frühstück']
  where category = 'cafes' and (tags = '{}' or tags is null);
update public.listings set tags = array['Bier']
  where category = 'bars' and (tags = '{}' or tags is null);
update public.listings set tags = array['Mittelklasse']
  where category = 'hotels' and (tags = '{}' or tags is null);
update public.listings set tags = array['Historisch']
  where category = 'sightseeing' and (tags = '{}' or tags is null);
update public.listings set tags = array['Kulturzentrum']
  where category = 'kultur' and (tags = '{}' or tags is null);
update public.listings set tags = array['Geschenke']
  where category = 'geschaefte' and (tags = '{}' or tags is null);
update public.listings set tags = array['Fitness']
  where category = 'sport' and (tags = '{}' or tags is null);
update public.listings set tags = array['Stadtführung', 'Geführt']
  where category = 'touren' and (tags = '{}' or tags is null);
