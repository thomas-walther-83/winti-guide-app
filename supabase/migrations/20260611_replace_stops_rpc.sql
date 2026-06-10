-- ═══════════════════════════════════════════════════════════════════
-- Migration: Atomarer Stops-Replace für öffentliche Touren
--
-- Bisher machte der Client delete-then-insert in zwei Requests: schlug
-- der Insert fehl (Netz, Validierung), waren die Stops der Tour weg.
-- Diese Funktion macht beides in EINER Transaktion (Funktionsaufrufe
-- laufen implizit transaktional).
--
-- SECURITY INVOKER: Die RLS-Policies auf public_tour_stops (Admin-only
-- für Schreibzugriffe) gelten unverändert für den Aufrufer.
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.replace_public_tour_stops(
  p_tour_id uuid,
  p_stops jsonb
) returns void
  language plpgsql
  security invoker
as $$
begin
  delete from public.public_tour_stops where tour_id = p_tour_id;
  insert into public.public_tour_stops (tour_id, position, lat, lon, name, listing_id)
  select
    p_tour_id,
    coalesce((s->>'position')::int, ord::int),
    (s->>'lat')::double precision,
    (s->>'lon')::double precision,
    coalesce(s->>'name', ''),
    nullif(s->>'listing_id', '')::uuid
  from jsonb_array_elements(p_stops) with ordinality as t(s, ord);
end;
$$;
