-- ═══════════════════════════════════════════════════════════════════
-- Migration: Mehrere Sub-Tags und Bildergalerie pro Listing (Phase C + D)
-- Idempotent. Wird vom Workflow .github/workflows/db-migrate.yml ausgeführt.
-- ═══════════════════════════════════════════════════════════════════

-- Mehrere frei-form Tags pro Listing (z. B. „Vegan", „Mit Garten",
-- „Hundefreundlich"). Filterung erfolgt im Frontend über Schnittmenge.
alter table public.listings
  add column if not exists tags text[] not null default '{}';

-- GIN-Index für schnelle Tag-Suchen (`tags @> '{Vegan}'`).
create index if not exists idx_listings_tags on public.listings using gin(tags);

-- Mehrere Bilder pro Listing. Die alte Einzel-Spalte `image_url` bleibt als
-- Fallback bestehen; UI bevorzugt `image_urls[1]` falls vorhanden.
alter table public.listings
  add column if not exists image_urls text[] not null default '{}';
