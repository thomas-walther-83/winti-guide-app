#!/usr/bin/env python3
"""DB-Diagnose: prüft, ob Touren-Listings Geometrie haben. Read-only."""
import os
import json
import requests

URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
KEY = os.environ.get("SUPABASE_KEY", "")

if not URL or not KEY:
    print("❌ SUPABASE_URL/KEY fehlen")
    raise SystemExit(1)

headers = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}

# Alle Touren mit Name + Geometrie holen.
res = requests.get(
    f"{URL}/rest/v1/listings",
    headers=headers,
    params={"category": "eq.touren", "select": "name,lat,lon,geometry"},
    timeout=30,
)
print(f"HTTP {res.status_code}")
rows = res.json() if res.status_code == 200 else []
print(f"touren total: {len(rows)}")
with_geom = [r for r in rows if r.get("geometry")]
print(f"touren mit geometry: {len(with_geom)}")
for r in rows[:5]:
    g = r.get("geometry")
    if g:
        coords = g.get("coordinates") or []
        n_lines = len(coords)
        n_pts = sum(len(c) for c in coords) if coords and isinstance(coords[0], list) else 0
        print(f"  ✓ {r['name'][:40]} · type={g.get('type')} lines={n_lines} pts={n_pts}")
    else:
        print(f"  ✗ {r['name'][:40]} · geometry=NULL lat={r.get('lat')} lon={r.get('lon')}")
print("Fertig.")
