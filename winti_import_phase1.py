#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════╗
║  Winti Guide – Phase 1 Import Script                            ║
║  Quellen: OpenStreetMap (Overpass) + Zürich Tourismus API        ║
║  Ziel:    Supabase Datenbank                                     ║
╚══════════════════════════════════════════════════════════════════╝

Installation:
    pip install requests supabase

Konfiguration:
    SUPABASE_URL und SUPABASE_KEY unten eintragen
    Dann ausführen: python3 winti_import_phase1.py
"""

import requests
import time
import json
import sys
from datetime import datetime

# ── Konfiguration ────────────────────────────────────────────────
SUPABASE_URL = "https://dphhqwisluirihmahyee.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwaGhxd2lzbHVpcmlobWFoeWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc2NzQwMSwiZXhwIjoyMDkwMzQzNDAxfQ.cBNzpQ8iV-xNMJSabHw0F5sHbFlJIrgHcNCo2dxTSTM"   # Settings → API → service_role (nicht anon!)

# Winterthur Bounding Box (SW → NE)
OSM_BBOX = "47.466,8.681,47.538,8.795"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Zürich Tourismus API – Kategorie-IDs
ZT_API = "https://www.zuerich.com/de/api/v2/data"
ZT_CATEGORIES = {
    "restaurants": [165, 102, 192],     # Restaurant, Café/Teeraum, Bistro
    "bars":        [103],               # Bar & Lounge
    "hotels":      [71, 83, 84, 85],    # Hotel, Apartment, B&B, Hostel
    "kultur":      [72, 87, 105, 177],  # Attraktionen, Architektur, Ausstellungen, Kunst
}


# ── Supabase Helper ──────────────────────────────────────────────
class Supabase:
    def __init__(self, url, key):
        self.url = url
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates",  # upsert
        }

    def upsert(self, table, records):
        """Fügt Datensätze ein oder aktualisiert bestehende (anhand 'source_id')."""
        if not records:
            return 0
        total = 0
        for i in range(0, len(records), 50):
            batch = records[i:i+50]
            res = requests.post(
                f"{self.url}/rest/v1/{table}",
                headers={
                    **self.headers,
                    "Prefer": "resolution=merge-duplicates,return=minimal",
                    "on_conflict": "source_id"
                },
                json=batch
            )
            if res.status_code not in (200, 201, 204):
                print(f"  ⚠️  Supabase Fehler: {res.status_code} – {res.text[:200]}")
            else:
                total += len(batch)
        return total

    def delete_by_source(self, table, source):
        """Löscht alle Einträge einer bestimmten Quelle (für Neuimport)."""
        res = requests.delete(
            f"{self.url}/rest/v1/{table}?source=eq.{source}",
            headers=self.headers
        )
        return res.status_code


# ── OSM Overpass ─────────────────────────────────────────────────
def osm_query(amenity_tags: list[str]) -> list:
    """Holt POIs aus OpenStreetMap für Winterthur."""
    tag_filters = "\n".join([f'  nwr[{t}]({OSM_BBOX});' for t in amenity_tags])
    query = f"""
[out:json][timeout:30];
(
{tag_filters}
);
out center tags 200;
""".strip()

    print(f"  → Overpass API abfragen ({len(amenity_tags)} Tags)…")
    # Try multiple endpoints with retry
    endpoints = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
        "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    ]
    for attempt, endpoint in enumerate(endpoints):
        try:
            if attempt > 0:
                print(f"  → Versuche alternativen Server ({attempt+1}/3)…")
                time.sleep(3)
            res = requests.post(
                endpoint,
                data={"data": query},
                timeout=60
            )
            res.raise_for_status()
            elements = res.json().get("elements", [])
            print(f"  ✓ {len(elements)} Elemente gefunden")
            return elements
        except Exception as e:
            print(f"  ⚠️  Fehler ({endpoint.split('/')[2]}): {str(e)[:60]}")
            continue
    print("  ⚠️  Alle Server nicht erreichbar")
    return []


def osm_to_listing(el: dict, category: str) -> dict:
    """Konvertiert ein OSM-Element in ein Supabase-Listing."""
    tags = el.get("tags", {})
    name = tags.get("name")
    if not name:
        return None

    # Adresse zusammenbauen
    street  = tags.get("addr:street", "")
    housenr = tags.get("addr:housenumber", "")
    city    = tags.get("addr:city", "")
    address = " ".join(filter(None, [street, housenr])) or city or ""

    # Koordinaten
    lat = el.get("lat") or (el.get("center") or {}).get("lat")
    lon = el.get("lon") or (el.get("center") or {}).get("lon")

    return {
        "source":     "osm",
        "source_id":  f"osm_{el['id']}",
        "category":   category,
        "sub_type":   tags.get("cuisine") or tags.get("tourism") or tags.get("amenity") or "",
        "name":       name,
        "address":    address,
        "hours":      tags.get("opening_hours", ""),
        "phone":      tags.get("phone") or tags.get("contact:phone") or "",
        "website":    tags.get("website") or tags.get("contact:website") or "",
        "stars":      tags.get("stars", ""),
        "desc":       tags.get("description") or tags.get("description:de") or "",
        "lat":        lat,
        "lon":        lon,
        "is_active":  True,
        "is_premium": False,
        "updated_at": datetime.utcnow().isoformat(),
    }


# OSM-Abfragen pro Kategorie
OSM_QUERIES = {
    "restaurants": [
        '"amenity"="restaurant"',
        '"amenity"="fast_food"',
    ],
    "cafes": [
        '"amenity"="cafe"',
        '"amenity"="bakery"',
    ],
    "bars": [
        '"amenity"="bar"',
        '"amenity"="pub"',
        '"amenity"="nightclub"',
    ],
    "hotels": [
        '"tourism"="hotel"',
        '"tourism"="hostel"',
        '"tourism"="guest_house"',
        '"tourism"="motel"',
    ],
    "sightseeing": [
        '"tourism"="attraction"',
        '"tourism"="viewpoint"',
        '"historic"="monument"',
        '"historic"="castle"',
        '"historic"="building"',
        '"tourism"="artwork"',
    ],
    "kultur": [
        '"tourism"="museum"',
        '"tourism"="gallery"',
        '"amenity"="theatre"',
        '"amenity"="cinema"',
        '"amenity"="arts_centre"',
    ],
    "geschaefte": [
        '"shop"="books"',
        '"shop"="wine"',
        '"shop"="confectionery"',
        '"shop"="bakery"',
        '"shop"="organic"',
        '"amenity"="marketplace"',
    ],
    "sport": [
        '"leisure"="swimming_pool"',
        '"leisure"="sports_centre"',
        '"leisure"="fitness_centre"',
        '"leisure"="golf_course"',
        '"leisure"="tennis"',
        '"leisure"="ice_rink"',
        '"leisure"="climbing"',
        '"leisure"="pitch"',
        '"amenity"="public_bath"',
    ],
}


# ── Zürich Tourismus API ─────────────────────────────────────────
def fetch_zt_category(cat_id: int) -> list:
    """Holt alle Einträge einer Kategorie von zuerich.com."""
    try:
        res = requests.get(
            f"{ZT_API}?id={cat_id}",
            timeout=20,
            headers={"Accept": "application/json"}
        )
        res.raise_for_status()
        data = res.json()
        # API gibt entweder Liste oder Objekt zurück
        if isinstance(data, list):
            return data
        return data.get("items", [])
    except Exception as e:
        print(f"    ⚠️  ZT API Fehler (cat {cat_id}): {e}")
        return []


def zt_to_listing(item: dict, category: str) -> dict:
    """Konvertiert einen Zürich Tourismus API Eintrag in Supabase-Format."""
    name = None
    if isinstance(item.get("name"), dict):
        name = item["name"].get("de") or item["name"].get("en")
    else:
        name = item.get("name")

    if not name:
        return None

    # Nur Winterthur-Einträge
    address_obj = item.get("address") or {}
    city = ""
    if isinstance(address_obj, dict):
        city = address_obj.get("addressLocality", "") or ""
    if "winterthur" not in city.lower() and "winterthur" not in name.lower():
        # Prüfe auch Beschreibung
        desc_obj = item.get("description") or {}
        desc_text = ""
        if isinstance(desc_obj, dict):
            desc_text = desc_obj.get("de", "") or desc_obj.get("en", "") or ""
        if "winterthur" not in desc_text.lower():
            return None  # Nicht Winterthur → überspringen

    # Adresse
    street  = ""
    housenr = ""
    if isinstance(address_obj, dict):
        street  = address_obj.get("streetAddress", "") or ""
        city    = address_obj.get("addressLocality", "") or ""
    address = f"{street}, {city}".strip(", ") if street else city

    # Öffnungszeiten
    hours = ""
    oh = item.get("openingHours")
    if isinstance(oh, list) and oh:
        hours = " | ".join(oh[:3])  # max 3 Einträge
    elif isinstance(oh, str):
        hours = oh

    # Beschreibung
    desc = ""
    desc_obj = item.get("description") or item.get("textTeaser") or {}
    if isinstance(desc_obj, dict):
        desc = desc_obj.get("de") or desc_obj.get("en") or ""
    elif isinstance(desc_obj, str):
        desc = desc_obj
    # HTML-Tags entfernen
    import re
    desc = re.sub(r"<[^>]+>", "", desc).strip()[:500]

    # Koordinaten
    lat, lon = None, None
    geo = item.get("geo") or {}
    if isinstance(geo, dict):
        lat = geo.get("latitude")
        lon = geo.get("longitude")

    # Website & Telefon
    website = item.get("url", "") or ""
    phone   = item.get("telephone", "") or ""

    # Sterne (Hotels)
    stars = ""
    for prop in (item.get("additionalProperty") or []):
        if isinstance(prop, dict) and "stern" in str(prop.get("name", "")).lower():
            stars = str(prop.get("value", ""))

    source_id = f"zt_{item.get('identifier') or item.get('@id') or name}"

    return {
        "source":     "zuerich_tourismus",
        "source_id":  source_id[:100],
        "category":   category,
        "sub_type":   "",
        "name":       name[:200],
        "address":    address[:300],
        "hours":      hours[:300],
        "phone":      phone[:50],
        "website":    website[:300],
        "stars":      stars,
        "desc":       desc,
        "lat":        lat,
        "lon":        lon,
        "is_active":  True,
        "is_premium": False,
        "updated_at": datetime.utcnow().isoformat(),
    }


# ── Hauptprogramm ────────────────────────────────────────────────
def run():
    print("═" * 60)
    print("  Winti Guide – Phase 1 Import")
    print(f"  {datetime.now().strftime('%d.%m.%Y %H:%M')}")
    print("═" * 60)

    # Supabase-Verbindung prüfen
    if "DEINE" in SUPABASE_URL:
        print("\n❌ Bitte SUPABASE_URL und SUPABASE_KEY konfigurieren!")
        sys.exit(1)

    db = Supabase(SUPABASE_URL, SUPABASE_KEY)
    total_inserted = 0

    # ── Phase 1a: OpenStreetMap ──────────────────────────────────
    print("\n🗺️  Phase 1a: OpenStreetMap")
    print("-" * 40)

    for category, tags in OSM_QUERIES.items():
        print(f"\n📂 Kategorie: {category}")
        elements = osm_query(tags)
        time.sleep(2)  # Rate limiting

        listings = []
        for el in elements:
            rec = osm_to_listing(el, category)
            if rec:
                listings.append(rec)

        # Duplikate entfernen (gleicher Name + Adresse)
        seen = set()
        unique = []
        for l in listings:
            key = (l["name"].lower(), l["address"].lower()[:30])
            if key not in seen:
                seen.add(key)
                unique.append(l)

        print(f"  → {len(unique)} eindeutige Einträge bereit")
        n = db.upsert("listings", unique)
        total_inserted += n
        print(f"  ✓ {n} Einträge in Supabase gespeichert")
        time.sleep(1)

    # ── Phase 1b: Zürich Tourismus API ──────────────────────────
    print("\n\n🏛️  Phase 1b: Zürich Tourismus API")
    print("-" * 40)

    for category, cat_ids in ZT_CATEGORIES.items():
        print(f"\n📂 Kategorie: {category}")
        all_items = []
        for cat_id in cat_ids:
            print(f"  → Kategorie-ID {cat_id} abrufen…")
            items = fetch_zt_category(cat_id)
            all_items.extend(items)
            time.sleep(1)

        listings = []
        for item in all_items:
            rec = zt_to_listing(item, category)
            if rec:
                listings.append(rec)

        # Duplikate entfernen
        seen = set()
        unique = []
        for l in listings:
            if l["source_id"] not in seen:
                seen.add(l["source_id"])
                unique.append(l)

        print(f"  → {len(unique)} Winterthur-Einträge gefunden")
        n = db.upsert("listings", unique)
        total_inserted += n
        print(f"  ✓ {n} Einträge in Supabase gespeichert")
        time.sleep(1)

    # ── Zusammenfassung ──────────────────────────────────────────
    print("\n" + "═" * 60)
    print(f"  ✅ Import abgeschlossen: {total_inserted} Einträge total")
    print(f"  🕐 {datetime.now().strftime('%d.%m.%Y %H:%M')}")
    print("═" * 60)


if __name__ == "__main__":
    run()
