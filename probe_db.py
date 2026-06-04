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
    params={"category": "eq.touren", "select": "name,sub_type,description,lat,lon,geometry"},
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
        print(f"  ✓ {r['name'][:34]} [{r.get('sub_type')}] lines={n_lines} pts={n_pts} · {(r.get('description') or '')[:50]}")
    else:
        print(f"  ✗ {r['name'][:40]} · geometry=NULL lat={r.get('lat')} lon={r.get('lon')}")

# ── Overpass-Struktur prüfen: was liefert 'out geom' für Touren wirklich? ──
print("\n--- Overpass touren structure ---")
oq = ('[out:json][timeout:40];('
      'nwr["route"="hiking"](47.45,8.65,47.55,8.80);'
      'nwr["route"="bicycle"](47.45,8.65,47.55,8.80);'
      'nwr["route"="foot"](47.45,8.65,47.55,8.80);'
      ');out geom tags 500;')
try:
    o = requests.post("https://overpass-api.de/api/interpreter",
                      data={"data": oq},
                      headers={"User-Agent": "WintiGuide/1.0 (probe)"}, timeout=50)
    els = o.json().get("elements", [])
    named = [e for e in els if e.get("tags", {}).get("name")]
    print(f"overpass status {o.status_code} · elements {len(els)} · named {len(named)}")
    from collections import Counter
    print("types:", dict(Counter(e.get("type") for e in els)))
    e = named[0] if named else (els[0] if els else {})
    print("first named:", e.get("tags", {}).get("name", "")[:40], "type:", e.get("type"))
    print("  keys:", sorted(e.keys()))
    print("  has members:", "members" in e, "has geometry:", "geometry" in e, "has bounds:", "bounds" in e)
    if e.get("members"):
        m = e["members"][0]
        print("  member0:", {k: (len(v) if k == 'geometry' else v) for k, v in m.items() if k in ('type', 'role', 'geometry')})
    if e.get("geometry"):
        print("  own geometry points:", len(e["geometry"]))
except Exception as ex:
    print("overpass ERR:", type(ex).__name__, str(ex)[:140])
print("Fertig.")
