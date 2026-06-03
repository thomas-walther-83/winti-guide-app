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
import os
import time
import json
import sys
from datetime import datetime
from urllib.parse import urljoin


# ── Bild-Extraktion ──────────────────────────────────────────────
def image_from_field(image, base_url: str = "") -> str:
    """Holt eine Bild-URL aus einem beliebigen Bildfeld.

    Unterstützt String, Liste (erstes brauchbares Element) und Objekt mit
    `url`/`@id`/`contentUrl`. Relative URLs werden gegen base_url absolut
    gemacht. Leerstring wenn nichts gefunden.
    """
    if not image:
        return ""
    if isinstance(image, list):
        for entry in image:
            url = image_from_field(entry, base_url)
            if url:
                return url
        return ""
    if isinstance(image, dict):
        url = image.get("url") or image.get("@id") or image.get("contentUrl") or ""
    elif isinstance(image, str):
        url = image
    else:
        return ""
    url = (url or "").strip()
    if not url:
        return ""
    if url.startswith("//"):
        return "https:" + url
    if base_url and not url.startswith("http"):
        return urljoin(base_url, url)
    return url

# ── Konfiguration ────────────────────────────────────────────────
# Niemals Secrets im Code hardcoden! Der service_role-Key umgeht RLS und gibt
# vollen Zugriff auf die Datenbank. Werte werden als Umgebungsvariablen erwartet:
#   export SUPABASE_URL="https://dein-projekt.supabase.co"
#   export SUPABASE_KEY="<service_role key aus Settings → API>"
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://dphhqwisluirihmahyee.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")   # service_role (nicht anon!)

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
            # on_conflict MUSS als URL-Parameter stehen (nicht als Header), damit
            # PostgREST auf der Unique-Spalte source_id merged statt 409 zu werfen.
            res = self._post_batch(table, batch)
            # Robustheit: Falls die image_url-Spalte in der Live-DB noch fehlt,
            # antwortet PostgREST mit PGRST204. Dann Batch ohne image_url erneut
            # senden, damit nicht der ganze Import scheitert.
            if res.status_code not in (200, 201, 204) and self._is_missing_image_column(res):
                print("  ⚠️  image_url-Spalte fehlt – bitte ALTER TABLE ausführen "
                      "(ALTER TABLE listings ADD COLUMN image_url text). "
                      "Sende Batch ohne image_url erneut.")
                stripped = [{k: v for k, v in r.items() if k != "image_url"} for r in batch]
                res = self._post_batch(table, stripped)
            if res.status_code not in (200, 201, 204):
                print(f"  ⚠️  Supabase Fehler: {res.status_code} – {res.text[:200]}")
            else:
                total += len(batch)
        return total

    def _post_batch(self, table, batch):
        return requests.post(
            f"{self.url}/rest/v1/{table}?on_conflict=source_id",
            headers={
                **self.headers,
                "Prefer": "resolution=merge-duplicates,return=minimal",
            },
            json=batch
        )

    @staticmethod
    def _is_missing_image_column(res) -> bool:
        body = (res.text or "").lower()
        return "image_url" in body and ("pgrst204" in body or "column" in body)

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
    # Overpass verlangt einen aussagekräftigen User-Agent – ohne UA antwortet
    # overpass-api.de mit 406 Not Acceptable. Schweizer Spiegel (osm.ch) zuerst.
    osm_headers = {
        "User-Agent": "WintiGuide/1.0 (Stadtführer Winterthur; kontakt@wintiguide.ch)",
    }
    endpoints = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.osm.ch/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
    ]
    for attempt, endpoint in enumerate(endpoints):
        try:
            if attempt > 0:
                print(f"  → Versuche alternativen Server ({attempt+1}/{len(endpoints)})…")
                time.sleep(3)
            res = requests.post(
                endpoint,
                data={"data": query},
                headers=osm_headers,
                timeout=90
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

    # Bild nur aus vorhandenen OSM-Tags (KEINE zusätzlichen Requests):
    #  - image: meist direkte Bild-URL
    #  - wikimedia_commons: "File:Name.jpg" oder "Category:…" → Commons-Seite
    image_url = (tags.get("image") or "").strip()
    if not image_url:
        commons = (tags.get("wikimedia_commons") or "").strip()
        if commons:
            if commons.startswith("http"):
                image_url = commons
            else:
                image_url = "https://commons.wikimedia.org/wiki/" + commons.replace(" ", "_")

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
        "description": tags.get("description") or tags.get("description:de") or "",
        "lat":        lat,
        "lon":        lon,
        "image_url":  image_url[:500],
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
    # Touren: benannte Wander-/Velorouten aus OSM (geführte Stadtführungen wären
    # kuratierter Partner-Content und kommen nicht aus OSM).
    "touren": [
        '"route"="hiking"',
        '"route"="foot"',
        '"route"="bicycle"',
    ],
}


# ── Zürich Tourismus API ─────────────────────────────────────────
def fetch_zt_category(cat_id: int) -> list:
    """Holt alle Einträge einer Kategorie von zuerich.com."""
    try:
        res = requests.get(
            f"{ZT_API}?id={cat_id}",
            timeout=20,
            headers={
                "Accept": "application/json",
                # zuerich.com blockt ohne Browser-UA mit "Bot not allowed" (403).
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
                ),
            }
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

    # Bild: ZT-API-Items haben oft ein Bildfeld (image / mainImage / photo,
    # je als String, Liste oder Objekt mit url/@id). Defensiv übernehmen.
    image_url = ""
    for key in ("image", "mainImage", "photo", "images", "primaryImage"):
        image_url = image_from_field(item.get(key))
        if image_url:
            break

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
        "description": desc,
        "lat":        lat,
        "lon":        lon,
        "image_url":  image_url[:500],
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
    if not SUPABASE_KEY or "DEINE" in SUPABASE_URL:
        print("\n❌ Bitte SUPABASE_URL und SUPABASE_KEY (service_role) als Umgebungsvariablen setzen!")
        sys.exit(1)

    db = Supabase(SUPABASE_URL, SUPABASE_KEY)
    total_inserted = 0
    total_with_img = 0

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
        total_with_img += sum(1 for l in unique if l.get("image_url"))
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
        total_with_img += sum(1 for l in unique if l.get("image_url"))
        print(f"  ✓ {n} Einträge in Supabase gespeichert")
        time.sleep(1)

    # ── Zusammenfassung ──────────────────────────────────────────
    print("\n" + "═" * 60)
    print(f"  ✅ Import abgeschlossen: {total_inserted} Einträge total")
    if total_inserted:
        pct = round(total_with_img / total_inserted * 100)
        print(f"  🖼️  Mit Bild: {total_with_img}/{total_inserted} Einträge ({pct}%)")
    print(f"  🕐 {datetime.now().strftime('%d.%m.%Y %H:%M')}")
    print("═" * 60)


if __name__ == "__main__":
    run()
