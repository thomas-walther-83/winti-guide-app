-- ═══════════════════════════════════════════════════════════════════
-- Migration: Gespeicherte (manuell angepasste) Route einer eigenen Tour.
-- Speichert die geordnete Wegpunkt-Liste (Stops + gezogene Zwischenpunkte)
-- als JSON: [{ "lat": …, "lon": …, "stop": true|false }, …]. Idempotent.
-- ═══════════════════════════════════════════════════════════════════

alter table public.user_tours add column if not exists route_waypoints jsonb;
