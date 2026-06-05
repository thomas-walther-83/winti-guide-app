-- ═══════════════════════════════════════════════════════════════════
-- Migration: picsum.photos-Platzhalter aus Listings entfernen
--
-- Die zufälligen Picsum-Stockfotos (Naturbilder etc.) hatten nichts mit
-- den Locations zu tun und wirkten irreführend. Wir entfernen sie aus
-- `image_urls` und `image_url`. Wo danach gar kein Bild übrig bleibt,
-- zeigt das Frontend den farbigen Kategorie-Block (sauberer Fallback).
--
-- Idempotent: filtert Picsum-Einträge per Array-Subquery; mehrfaches
-- Ausführen ändert nach dem ersten Lauf nichts mehr.
-- ═══════════════════════════════════════════════════════════════════

-- ── image_urls: Picsum-Einträge aus dem Array filtern ───────────────
update public.listings
   set image_urls = coalesce(
     (select array_agg(u) from unnest(image_urls) as u
       where u not like '%picsum.photos%'),
     '{}'
   )
 where exists (
   select 1 from unnest(image_urls) as u where u like '%picsum.photos%'
 );

-- ── image_url: leeren, falls es ein Picsum-Link ist ─────────────────
update public.listings
   set image_url = ''
 where image_url like '%picsum.photos%';
