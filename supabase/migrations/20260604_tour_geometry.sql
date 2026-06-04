-- ═══════════════════════════════════════════════════════════════════
-- Migration: Touren-Geometrie (Phase A der Touren-Funktion)
-- Idempotent – kann gefahrlos mehrfach angewendet werden.
-- Wird vom Workflow .github/workflows/db-migrate.yml via psql ausgeführt.
-- ═══════════════════════════════════════════════════════════════════

-- Speichert die Linien-Geometrie einer Tour als GeoJSON (MultiLineString,
-- Koordinaten in [lon, lat]). Für punktuelle Listings bleibt die Spalte NULL.
alter table public.listings add column if not exists geometry jsonb;
