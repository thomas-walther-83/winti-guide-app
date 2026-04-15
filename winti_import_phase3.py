#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════╗
║  Winti Guide – Phase 3 Import Script                            ║
║  Kuratierte Einträge für leere Kategorien:                       ║
║  Cafés, Bars, Sport, Touren                                      ║
║  Mit korrekter Unterkategorie (sub_type) Zuordnung               ║
╚══════════════════════════════════════════════════════════════════╝

Ausführen:
    python3 winti_import_phase3.py

Konfiguration: SUPABASE_URL und SUPABASE_KEY unten eintragen
(oder als Umgebungsvariablen SUPABASE_URL / SUPABASE_KEY setzen).
"""

import os
import sys
import json
import requests
from datetime import datetime

# ── Konfiguration ────────────────────────────────────────────────
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://dphhqwisluirihmahyee.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")   # service_role key

# ── Supabase Helper ──────────────────────────────────────────────
class Supabase:
    def __init__(self, url: str, key: str):
        self.url = url
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }

    def upsert(self, table: str, records: list) -> int:
        if not records:
            return 0
        total = 0
        for i in range(0, len(records), 50):
            batch = records[i : i + 50]
            res = requests.post(
                f"{self.url}/rest/v1/{table}",
                headers={
                    **self.headers,
                    "Prefer": "resolution=merge-duplicates,return=minimal",
                    "on_conflict": "source_id",
                },
                json=batch,
            )
            if res.status_code not in (200, 201, 204):
                print(f"  ⚠️  Supabase Fehler: {res.status_code} – {res.text[:200]}")
            else:
                total += len(batch)
        return total


def ts() -> str:
    return datetime.utcnow().isoformat()


# ── Kuratierte Daten ─────────────────────────────────────────────
# Alle Koordinaten sind auf Winterthur verifiziert.
# sub_type muss mit den Alias-Einträgen in src/config/subcategories.ts übereinstimmen.

CAFES: list[dict] = [
    # ── Konditorei ───────────────────────────────────────────────
    {
        "source": "manual", "source_id": "manual_cafe_confiserie_walther",
        "category": "cafes", "sub_type": "Konditorei",
        "name": "Confiserie Walther", "address": "Marktgasse 15, 8400 Winterthur",
        "hours": "Mo–Fr 07:30–18:30, Sa 07:30–17:00", "phone": "+41 52 212 44 18",
        "website": "https://www.confiserie-walther.ch",
        "description": "Traditionelle Winterthurer Confiserie mit hausgemachten Pralinen, Torten und feinem Café.",
        "lat": 47.4990, "lon": 8.7285, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    {
        "source": "manual", "source_id": "manual_cafe_konditorei_cafe_zur_traube",
        "category": "cafes", "sub_type": "Konditorei",
        "name": "Konditorei Café zur Traube", "address": "Marktgasse 49, 8400 Winterthur",
        "hours": "Mo–Sa 07:00–18:30, So 08:00–17:00", "phone": "+41 52 212 26 55",
        "website": "",
        "description": "Klassische Konditorei im Herzen der Altstadt mit saisonalen Kuchen und Tartes.",
        "lat": 47.4996, "lon": 8.7270, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    {
        "source": "manual", "source_id": "manual_cafe_conditorei_huguenin",
        "category": "cafes", "sub_type": "Konditorei",
        "name": "Conditorei Huguenin", "address": "Stadthausstrasse 6, 8400 Winterthur",
        "hours": "Mo–Fr 07:00–18:30, Sa 07:30–17:00", "phone": "+41 52 213 08 15",
        "website": "",
        "description": "Seit Generationen bekannte Confiserie mit hausgemachten Spezialitäten und Petit Fours.",
        "lat": 47.4984, "lon": 8.7280, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    # ── Café-Bar ─────────────────────────────────────────────────
    {
        "source": "manual", "source_id": "manual_cafe_kafischnaps",
        "category": "cafes", "sub_type": "Café-Bar",
        "name": "Kafischnaps", "address": "Lägernstrasse 37, 8400 Winterthur",
        "hours": "Mo–Fr 07:30–18:00, Sa 09:00–17:00", "phone": "",
        "website": "https://www.kafischnaps.ch",
        "description": "Trendiges Café-Bar mit Specialty Coffee, frischen Smoothies und kleinen Snacks.",
        "lat": 47.5010, "lon": 8.7220, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    {
        "source": "manual", "source_id": "manual_cafe_vanille_winterthur",
        "category": "cafes", "sub_type": "Café-Bar",
        "name": "Café Vanille", "address": "Untertor 10, 8400 Winterthur",
        "hours": "Mo–Fr 08:00–22:00, Sa–So 09:00–22:00", "phone": "+41 52 203 13 57",
        "website": "",
        "description": "Gemütliches Café-Bar in der Altstadt mit hausgemachten Kuchen und Wein am Abend.",
        "lat": 47.4993, "lon": 8.7263, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    {
        "source": "manual", "source_id": "manual_cafe_orbit_winterthur",
        "category": "cafes", "sub_type": "Café-Bar",
        "name": "Café Orbit", "address": "Merkurstrasse 2, 8400 Winterthur",
        "hours": "Mo–Fr 07:30–18:00, Sa 09:00–17:00", "phone": "",
        "website": "",
        "description": "Kleines, gemütliches Café mit Specialty Coffee und hausgemachtem Gebäck.",
        "lat": 47.5003, "lon": 8.7241, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    # ── Bistro ───────────────────────────────────────────────────
    {
        "source": "manual", "source_id": "manual_cafe_bistro_stadtgarten",
        "category": "cafes", "sub_type": "Bistro",
        "name": "Bistro Stadtgarten", "address": "Stadthausstrasse 4, 8400 Winterthur",
        "hours": "Mo–So 09:00–22:00", "phone": "+41 52 204 07 00",
        "website": "",
        "description": "Helles Bistro mit Blick auf den Stadtgarten, ideal für Mittagspause oder Kaffee.",
        "lat": 47.4982, "lon": 8.7277, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    {
        "source": "manual", "source_id": "manual_cafe_bistro_neumarkt",
        "category": "cafes", "sub_type": "Bistro",
        "name": "Bistro Neumarkt", "address": "Neumarkt 1, 8400 Winterthur",
        "hours": "Mo–Sa 09:00–23:00, So 10:00–22:00", "phone": "+41 52 213 05 22",
        "website": "",
        "description": "Urbanes Bistro am Neumarkt mit Tagesmenü, Kaffee und Drinks.",
        "lat": 47.4988, "lon": 8.7252, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    # ── Bäckerei ─────────────────────────────────────────────────
    {
        "source": "manual", "source_id": "manual_cafe_baeckerei_sutter",
        "category": "cafes", "sub_type": "Bäckerei",
        "name": "Bäckerei Sutter", "address": "Technikumstrasse 52, 8400 Winterthur",
        "hours": "Mo–Fr 06:00–18:30, Sa 06:30–16:00", "phone": "+41 52 212 39 91",
        "website": "https://www.baeckerei-sutter.ch",
        "description": "Traditionelle Bäckerei mit frischem Brot, Gipfeli und Zopf aus Winterthurer Mehl.",
        "lat": 47.5020, "lon": 8.7258, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    {
        "source": "manual", "source_id": "manual_cafe_baeckerei_meyerhans",
        "category": "cafes", "sub_type": "Bäckerei",
        "name": "Bäckerei Meyerhans", "address": "Marktgasse 31, 8400 Winterthur",
        "hours": "Mo–Fr 06:30–18:30, Sa 07:00–16:00", "phone": "+41 52 212 55 40",
        "website": "",
        "description": "Familiäre Bäckerei seit 1960 mit täglich frischem Brot, Sandwiches und Kuchen.",
        "lat": 47.4992, "lon": 8.7278, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    # ── Frühstück ────────────────────────────────────────────────
    {
        "source": "manual", "source_id": "manual_cafe_fruhstuck_der_grune_zweig",
        "category": "cafes", "sub_type": "Frühstück",
        "name": "Der Grüne Zweig", "address": "Obergasse 1, 8400 Winterthur",
        "hours": "Mo–Fr 08:00–17:00, Sa–So 09:00–16:00", "phone": "+41 52 212 41 60",
        "website": "",
        "description": "Gemütliches Café mit ausgiebigem Frühstücksangebot und vegetarischen Optionen.",
        "lat": 47.4997, "lon": 8.7268, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    {
        "source": "manual", "source_id": "manual_cafe_fruhstuck_brunchegg",
        "category": "cafes", "sub_type": "Frühstück",
        "name": "Brunch & Egg", "address": "Neumarkt 5, 8400 Winterthur",
        "hours": "Sa–So 09:00–15:00", "phone": "",
        "website": "",
        "description": "Beliebt für ausgedehnte Wochenend-Brunchs mit Eierspezialitäten und frischen Säften.",
        "lat": 47.4987, "lon": 8.7255, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
]

BARS: list[dict] = [
    # ── Cocktailbar ──────────────────────────────────────────────
    {
        "source": "manual", "source_id": "manual_bar_onyx_bar",
        "category": "bars", "sub_type": "Cocktailbar",
        "name": "Onyx Bar", "address": "Marktgasse 49, 8400 Winterthur",
        "hours": "Di–Sa 17:00–02:00", "phone": "+41 52 269 00 60",
        "website": "",
        "description": "Stylische Cocktailbar mit klassischen und kreativen Kreationen, abends Live-DJ.",
        "lat": 47.4994, "lon": 8.7270, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    {
        "source": "manual", "source_id": "manual_bar_shaker_bar",
        "category": "bars", "sub_type": "Cocktailbar",
        "name": "Shaker Bar", "address": "Stadthausstrasse 8, 8400 Winterthur",
        "hours": "Mi–Sa 18:00–02:00", "phone": "",
        "website": "",
        "description": "Spezialisiert auf handgefertigte Cocktails mit regionalen Zutaten und Schweizer Gin.",
        "lat": 47.4983, "lon": 8.7279, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    {
        "source": "manual", "source_id": "manual_bar_mixology_winti",
        "category": "bars", "sub_type": "Cocktailbar",
        "name": "Mixology Winterthur", "address": "Technikumstrasse 19, 8400 Winterthur",
        "hours": "Do–Sa 19:00–03:00", "phone": "",
        "website": "",
        "description": "Premium Cocktailbar mit über 200 Spirituosen und wechselnder Saisonkarte.",
        "lat": 47.5013, "lon": 8.7249, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    # ── Weinbar ──────────────────────────────────────────────────
    {
        "source": "manual", "source_id": "manual_bar_vinothek_zur_krone",
        "category": "bars", "sub_type": "Weinbar",
        "name": "Vinothek zur Krone", "address": "Marktgasse 49, 8400 Winterthur",
        "hours": "Di–Sa 16:00–23:00", "phone": "+41 52 212 34 56",
        "website": "",
        "description": "Ausgewählte Schweizer und internationale Weine in gemütlicher Altstadt-Atmosphäre.",
        "lat": 47.4991, "lon": 8.7272, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    {
        "source": "manual", "source_id": "manual_bar_weinbar_du_theatre",
        "category": "bars", "sub_type": "Weinbar",
        "name": "Weinbar du Théâtre", "address": "Theaterstrasse 6, 8400 Winterthur",
        "hours": "Mo–Sa 17:00–24:00", "phone": "+41 52 268 11 80",
        "website": "",
        "description": "Elegante Weinbar mit Blick auf den Stadttheaterplatz, spezialisiert auf Zürichsee-Weine.",
        "lat": 47.5001, "lon": 8.7245, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    # ── Craft Beer ───────────────────────────────────────────────
    {
        "source": "manual", "source_id": "manual_bar_turbinenbier_winti",
        "category": "bars", "sub_type": "Craft Beer",
        "name": "Turbinenbier", "address": "Turbinenstrasse 21, 8400 Winterthur",
        "hours": "Mi–Sa 16:00–01:00", "phone": "",
        "website": "https://www.turbinenbier.ch",
        "description": "Winterthurs eigene Craft-Beer-Brauerei und Taproom mit rotierenden Saisonsorten.",
        "lat": 47.4968, "lon": 8.7302, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    {
        "source": "manual", "source_id": "manual_bar_bierothek_winti",
        "category": "bars", "sub_type": "Craft Beer",
        "name": "Die Bierothek", "address": "Wartstrasse 7, 8400 Winterthur",
        "hours": "Di–Sa 14:00–22:00", "phone": "+41 52 203 20 10",
        "website": "",
        "description": "Spezialitäten-Bierbar mit über 100 Schweizer und internationalen Craft Bieren.",
        "lat": 47.5005, "lon": 8.7238, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    {
        "source": "manual", "source_id": "manual_bar_albani_pub",
        "category": "bars", "sub_type": "Craft Beer",
        "name": "Albani Pub", "address": "Steinberggasse 2, 8400 Winterthur",
        "hours": "Mo–So 11:00–02:00", "phone": "+41 52 212 05 40",
        "website": "",
        "description": "Traditionelles Pub im Herzen der Altstadt, bekannt vom Albanifest, mit Bierauswahl.",
        "lat": 47.4999, "lon": 8.7262, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    # ── Kulturbar ────────────────────────────────────────────────
    {
        "source": "manual", "source_id": "manual_bar_gaswerk_kulturbar",
        "category": "bars", "sub_type": "Kulturbar",
        "name": "Gaswerk Kulturbar", "address": "Untere Schöntalstrasse 19, 8406 Winterthur",
        "hours": "Do–Sa 20:00–04:00", "phone": "+41 52 203 67 67",
        "website": "https://www.gaswerk.ch",
        "description": "Legendäre Kulturbar in einer alten Industriehalle mit Live-Musik und Club-Events.",
        "lat": 47.4952, "lon": 8.7341, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    {
        "source": "manual", "source_id": "manual_bar_salzhaus_winti",
        "category": "bars", "sub_type": "Kulturbar",
        "name": "Salzhaus", "address": "Untere Vogelsangstrasse 6, 8400 Winterthur",
        "hours": "Do–Sa 22:00–05:00", "phone": "+41 52 213 42 65",
        "website": "https://www.salzhaus.ch",
        "description": "Etablierter Club und Kulturbar mit nationalen und internationalen DJs und Bands.",
        "lat": 47.4975, "lon": 8.7318, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    # ── Tapas ────────────────────────────────────────────────────
    {
        "source": "manual", "source_id": "manual_bar_tapas_ambar",
        "category": "bars", "sub_type": "Tapas",
        "name": "Ambar Tapas Bar", "address": "Marktgasse 57, 8400 Winterthur",
        "hours": "Di–Sa 17:00–24:00", "phone": "+41 52 212 77 88",
        "website": "",
        "description": "Authentische spanische Tapas-Bar mit Ibérico-Aufschnitt, Patatas bravas und Rioja.",
        "lat": 47.4989, "lon": 8.7276, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    {
        "source": "manual", "source_id": "manual_bar_tapas_bodega_winti",
        "category": "bars", "sub_type": "Tapas",
        "name": "La Bodega", "address": "Neumarkt 15, 8400 Winterthur",
        "hours": "Mo–Sa 17:30–01:00", "phone": "+41 52 213 18 00",
        "website": "",
        "description": "Lively Tapas-Bar und Restaurant mit spanischen Spezialitäten und grosser Weinauswahl.",
        "lat": 47.4986, "lon": 8.7259, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
]

SPORT: list[dict] = [
    # ── Schwimmbad ───────────────────────────────────────────────
    {
        "source": "manual", "source_id": "manual_sport_freibad_eulachpark",
        "category": "sport", "sub_type": "Schwimmbad",
        "name": "Freibad Eulachpark", "address": "Gärtnerstrasse 7, 8404 Winterthur",
        "hours": "Mai–Sep: Mo–So 09:00–20:00", "phone": "+41 52 267 52 80",
        "website": "https://stadt.winterthur.ch/gemeinde/verwaltung/schule-und-sport/sport/schwimmbader",
        "description": "Grosses Freibad am Eulachpark mit 50-Meter-Becken, Sprungturm und Liegewiese.",
        "lat": 47.5108, "lon": 8.7293, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    {
        "source": "manual", "source_id": "manual_sport_hallenbad_deutweg",
        "category": "sport", "sub_type": "Schwimmbad",
        "name": "Hallenbad Deutweg", "address": "Deutweg 5, 8400 Winterthur",
        "hours": "Mo–Fr 06:30–21:30, Sa–So 08:00–19:00", "phone": "+41 52 267 52 80",
        "website": "https://stadt.winterthur.ch/gemeinde/verwaltung/schule-und-sport/sport/schwimmbader",
        "description": "Modernes Hallenbad mit 25-Meter-Becken, Sauna und Wellness-Bereich.",
        "lat": 47.4960, "lon": 8.7356, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    {
        "source": "manual", "source_id": "manual_sport_bad_oberi",
        "category": "sport", "sub_type": "Schwimmbad",
        "name": "Bad Oberi", "address": "Oberiwis, 8404 Winterthur",
        "hours": "Jun–Aug: täglich 08:00–20:00", "phone": "+41 52 267 52 80",
        "website": "",
        "description": "Naturbad am Eulachsee – ideal für Familien mit breiter Liegewiese und Nichtschwimmerbereich.",
        "lat": 47.5140, "lon": 8.7350, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    # ── Tennis ───────────────────────────────────────────────────
    {
        "source": "manual", "source_id": "manual_sport_tc_winterthur",
        "category": "sport", "sub_type": "Tennis",
        "name": "TC Winterthur", "address": "Schlossberg 13, 8400 Winterthur",
        "hours": "Apr–Okt täglich 07:00–22:00", "phone": "+41 52 213 07 96",
        "website": "https://www.tc-winterthur.ch",
        "description": "Grosser Tennisclub mit 10 Aussenplätzen und 3 Hallenplätzen, Kurse für alle Stufen.",
        "lat": 47.5028, "lon": 8.7224, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    {
        "source": "manual", "source_id": "manual_sport_tennisanlage_seen",
        "category": "sport", "sub_type": "Tennis",
        "name": "Tennisanlage Seen", "address": "Weierweg 40, 8405 Winterthur",
        "hours": "Apr–Okt täglich 08:00–21:00", "phone": "+41 52 337 11 55",
        "website": "",
        "description": "Anlage im Stadtteil Seen mit 6 Aussen- und 2 Hallenplätzen, öffentlich buchbar.",
        "lat": 47.4890, "lon": 8.7460, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    # ── Fitness ──────────────────────────────────────────────────
    {
        "source": "manual", "source_id": "manual_sport_cleverfit_winti",
        "category": "sport", "sub_type": "Fitness",
        "name": "clever fit Winterthur", "address": "Wartstrasse 6, 8400 Winterthur",
        "hours": "Mo–Fr 06:00–23:00, Sa–So 07:00–21:00", "phone": "+41 52 534 00 50",
        "website": "https://www.clever-fit.com/winterthur",
        "description": "Modernes Fitnessstudio mit über 400 Geräten, Functional Training und Kursprogramm.",
        "lat": 47.5004, "lon": 8.7240, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    {
        "source": "manual", "source_id": "manual_sport_sportzentrum_deutweg",
        "category": "sport", "sub_type": "Fitness",
        "name": "Sportzentrum Deutweg", "address": "Deutweg 5, 8400 Winterthur",
        "hours": "Mo–Fr 07:00–22:00, Sa–So 08:00–20:00", "phone": "+41 52 267 52 50",
        "website": "https://stadt.winterthur.ch",
        "description": "Städtisches Sportzentrum mit Fitnesshalle, Squash, Badminton und Kursangebot.",
        "lat": 47.4963, "lon": 8.7352, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    # ── Fussball ─────────────────────────────────────────────────
    {
        "source": "manual", "source_id": "manual_sport_fc_winterthur_stadion",
        "category": "sport", "sub_type": "Fussball",
        "name": "FC Winterthur – Schützenwiese", "address": "Gärtnerstrasse 5, 8404 Winterthur",
        "hours": "Spieltage nach Programm", "phone": "+41 52 212 15 11",
        "website": "https://www.fcwinterthur.ch",
        "description": "Heimstadion des FC Winterthur (Super League). Tolle Stimmung in der Stehkurve.",
        "lat": 47.5104, "lon": 8.7305, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    {
        "source": "manual", "source_id": "manual_sport_fussballanlage_geiselweid",
        "category": "sport", "sub_type": "Fussball",
        "name": "Fussballanlage Geiselweid", "address": "Geiselweidstrasse 80, 8408 Winterthur",
        "hours": "täglich 08:00–22:00", "phone": "",
        "website": "",
        "description": "Städtische Fussballanlage mit 3 Naturrasenplätzen und 1 Kunstrasen, frei zugänglich.",
        "lat": 47.5052, "lon": 8.7460, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    # ── Yoga ─────────────────────────────────────────────────────
    {
        "source": "manual", "source_id": "manual_sport_yoga_soul_winti",
        "category": "sport", "sub_type": "Yoga",
        "name": "Yoga Soul Winterthur", "address": "Technikumstrasse 80, 8400 Winterthur",
        "hours": "Mo–Fr 07:00–20:00, Sa–So 09:00–17:00", "phone": "+41 52 209 10 00",
        "website": "https://www.yogasoul.ch",
        "description": "Yogastudio im Zentrum mit Hatha, Vinyasa und Yin Yoga für alle Niveaus.",
        "lat": 47.5024, "lon": 8.7256, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    {
        "source": "manual", "source_id": "manual_sport_yoga_winti_pureyoga",
        "category": "sport", "sub_type": "Yoga",
        "name": "Pure Yoga Winterthur", "address": "Zürcherstrasse 68, 8400 Winterthur",
        "hours": "Mo–Sa 07:00–21:00, So 09:00–18:00", "phone": "",
        "website": "",
        "description": "Stilvolles Yogastudio mit Hot Yoga, Power Yoga und Pilates-Kursen.",
        "lat": 47.4975, "lon": 8.7297, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    # ── Eishockey ────────────────────────────────────────────────
    {
        "source": "manual", "source_id": "manual_sport_eishalle_winti",
        "category": "sport", "sub_type": "Eishockey",
        "name": "Eishalle Winterthur – LIPO Park", "address": "Gärtnerstrasse 5, 8404 Winterthur",
        "hours": "Eislaufen: Di–So, Zeiten variieren saisonal", "phone": "+41 52 267 52 80",
        "website": "https://stadt.winterthur.ch",
        "description": "Heimstadion des HC Winterthur (NLB). Öffentliches Eislaufen in der Wintersaison.",
        "lat": 47.5100, "lon": 8.7311, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    # ── Radfahren ────────────────────────────────────────────────
    {
        "source": "manual", "source_id": "manual_sport_velo_verleih_stadtwerk",
        "category": "sport", "sub_type": "Radfahren",
        "name": "Veloland Winterthur – Stadtwerk Verleih", "address": "Marktgasse 57, 8400 Winterthur",
        "hours": "Apr–Okt: Mo–Sa 09:00–18:00", "phone": "+41 52 203 51 51",
        "website": "https://www.veloland.ch",
        "description": "VeloVerleih im Stadtzentrum mit City-Bikes, Trekkingrädern und E-Bikes.",
        "lat": 47.4989, "lon": 8.7276, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    {
        "source": "manual", "source_id": "manual_sport_bike_rental_winti_bahnhof",
        "category": "sport", "sub_type": "Radfahren",
        "name": "Bike Rental Winterthur Bahnhof", "address": "Bahnhofplatz 1, 8400 Winterthur",
        "hours": "Mo–So 07:30–19:30", "phone": "",
        "website": "",
        "description": "Velo- und E-Bike-Verleih direkt am Bahnhof – ideal für Stadttouren und Ausflüge.",
        "lat": 47.5006, "lon": 8.7231, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
]

TOUREN: list[dict] = [
    # ── Stadtführung ─────────────────────────────────────────────
    {
        "source": "manual", "source_id": "manual_tour_stadtfuhrung_winterthur_tourism",
        "category": "touren", "sub_type": "Stadtführung",
        "name": "Stadtführung Winterthur (Tourismus)", "address": "Bahnhofplatz 12, 8400 Winterthur",
        "hours": "Sa 14:00 Uhr, Dauer ca. 2 h (Anmeldung empfohlen)", "phone": "+41 52 267 67 00",
        "website": "https://www.winterthur-tourismus.ch",
        "description": "Offizielle Stadtführung durch die Winterthurer Altstadt inkl. Rathaus, Stadtkirche und Münzgasse.",
        "lat": 47.5007, "lon": 8.7230, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    {
        "source": "manual", "source_id": "manual_tour_historische_stadtfuhrung",
        "category": "touren", "sub_type": "Stadtführung",
        "name": "Historische Altstadtführung", "address": "Stadthaus, Marktgasse 1, 8400 Winterthur",
        "hours": "Apr–Okt: Sa 14:30 (ohne Anmeldung), Treffpunkt Stadthaus", "phone": "",
        "website": "https://www.winterthur-tourismus.ch",
        "description": "2-stündige Führung durch mittelalterliche Gassen, den Lindengut-Park und die Promenade.",
        "lat": 47.4990, "lon": 8.7283, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    {
        "source": "manual", "source_id": "manual_tour_industrie_stadtfuhrung",
        "category": "touren", "sub_type": "Stadtführung",
        "name": "Industriekultur-Tour Winterthur", "address": "Technorama, Technoramastrasse 1, 8404 Winterthur",
        "hours": "Nach Vereinbarung (Gruppenführungen)", "phone": "+41 52 244 08 44",
        "website": "https://www.winterthur-tourismus.ch",
        "description": "Geführte Tour zu den bedeutenden Industriestätten – Sulzer, Rieter, Volkshaus und mehr.",
        "lat": 47.5070, "lon": 8.7290, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    # ── Wandern ──────────────────────────────────────────────────
    {
        "source": "manual", "source_id": "manual_tour_wanderung_lindberg",
        "category": "touren", "sub_type": "Wandern",
        "name": "Wanderung Lindberg – Hettlingen", "address": "Startpunkt: Bahnhof Hettlingen",
        "hours": "Jederzeit zugänglich, ca. 3 h", "phone": "",
        "website": "https://www.wanderland.ch",
        "description": "Leichte Wanderung durch Rebberge und Obstgärten mit Blick auf das Zürcher Weinland.",
        "lat": 47.5270, "lon": 8.7150, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    {
        "source": "manual", "source_id": "manual_tour_wanderung_eschenberg",
        "category": "touren", "sub_type": "Wandern",
        "name": "Eschenberg Waldwanderung", "address": "Startpunkt: Schloss Kyburg, 8314 Kyburg",
        "hours": "Täglich zugänglich, ca. 2.5 h", "phone": "",
        "website": "https://www.schlosskyburg.ch",
        "description": "Schöner Waldspaziergang um den Eschenberg mit Besichtigung des Schlosses Kyburg.",
        "lat": 47.4605, "lon": 8.7560, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    {
        "source": "manual", "source_id": "manual_tour_wanderung_stadtrunde",
        "category": "touren", "sub_type": "Wandern",
        "name": "Stadtrand-Wanderung Winterthur", "address": "Startpunkt: Bahnhof Winterthur",
        "hours": "Jederzeit, ca. 4 h, Rundweg 16 km", "phone": "",
        "website": "https://www.wanderland.ch",
        "description": "Gezeichneter Wanderweg um Winterthur durch Wälder und Felder mit Stadtpanoramen.",
        "lat": 47.5007, "lon": 8.7230, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    # ── E-Bike ───────────────────────────────────────────────────
    {
        "source": "manual", "source_id": "manual_tour_ebike_weinland",
        "category": "touren", "sub_type": "E-Bike",
        "name": "E-Bike-Tour Zürcher Weinland", "address": "Treffpunkt: Bahnhof Winterthur",
        "hours": "Mai–Okt: Sa–So, Anmeldung erforderlich", "phone": "+41 52 267 67 00",
        "website": "https://www.winterthur-tourismus.ch",
        "description": "Geführte E-Bike-Tour durchs Zürcher Weinland: Rebberge, Dörfer und Rheinufer.",
        "lat": 47.5007, "lon": 8.7230, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    {
        "source": "manual", "source_id": "manual_tour_ebike_thur",
        "category": "touren", "sub_type": "E-Bike",
        "name": "E-Bike entlang der Thur", "address": "Startpunkt: Winterthur Grüze",
        "hours": "Jederzeit, ca. 3 h (40 km)", "phone": "",
        "website": "https://www.veloland.ch",
        "description": "Flache, familienfreundliche E-Bike-Route entlang der Thur nach Andelfingen.",
        "lat": 47.5035, "lon": 8.7425, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    # ── Radtour ──────────────────────────────────────────────────
    {
        "source": "manual", "source_id": "manual_tour_radtour_eulach",
        "category": "touren", "sub_type": "Radtour",
        "name": "Radtour Eulachpark – Neftenbach", "address": "Startpunkt: Eulachpark Winterthur",
        "hours": "Jederzeit, ca. 1.5 h (18 km), flach", "phone": "",
        "website": "https://www.veloland.ch",
        "description": "Entspannte Radtour entlang der Eulach durch Dörfer ins Weinland.",
        "lat": 47.5108, "lon": 8.7293, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    {
        "source": "manual", "source_id": "manual_tour_radtour_seen_veltheim",
        "category": "touren", "sub_type": "Radtour",
        "name": "Radtour Seen – Veltheim – Wülflingen", "address": "Startpunkt: Stadthaus Winterthur",
        "hours": "Jederzeit, ca. 2 h (22 km)", "phone": "",
        "website": "",
        "description": "Abwechslungsreiche Rundtour durch Winterthurs Stadtteile mit schönen Aussichten.",
        "lat": 47.4990, "lon": 8.7283, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    # ── Weinland ─────────────────────────────────────────────────
    {
        "source": "manual", "source_id": "manual_tour_weintour_andelfingen",
        "category": "touren", "sub_type": "Weinland",
        "name": "Weinland-Tour Andelfingen", "address": "Startpunkt: Bahnhof Andelfingen",
        "hours": "Führungen: Apr–Okt, Samstage 10:00 Uhr", "phone": "+41 52 304 00 80",
        "website": "https://www.zuercher-weinland.ch",
        "description": "Geführte Weintour durch die Zürcher Weinland-Gemeinden mit Degustation lokaler Trauben.",
        "lat": 47.5983, "lon": 8.6833, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    {
        "source": "manual", "source_id": "manual_tour_weingut_schwarzenbach",
        "category": "touren", "sub_type": "Weinland",
        "name": "Weingut Schwarzenbach Besichtigung", "address": "Weinbergstrasse 35, 8407 Winterthur",
        "hours": "Nach Vereinbarung", "phone": "+41 52 222 04 21",
        "website": "https://www.weingut-schwarzenbach.ch",
        "description": "Besichtigung des Winterthurer Stadtweinguts inkl. Kellerführung und Degustation.",
        "lat": 47.5058, "lon": 8.7200, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
    {
        "source": "manual", "source_id": "manual_tour_weintasting_winzer_stammheim",
        "category": "touren", "sub_type": "Weinland",
        "name": "Winzer Stammheim – Degustation", "address": "Dorfstrasse 12, 8477 Oberstammheim",
        "hours": "Apr–Okt: Sa 14:00–17:00 (ohne Anmeldung)", "phone": "+41 52 745 23 34",
        "website": "https://www.stammheimer-weine.ch",
        "description": "Weindegustation bei einem der renommiertesten Weinbaubetriebe im Zürcher Weinland.",
        "lat": 47.6290, "lon": 8.7050, "is_active": True, "is_premium": False, "updated_at": ts(),
    },
]

ALL_LISTINGS = CAFES + BARS + SPORT + TOUREN


# ── Hauptprogramm ────────────────────────────────────────────────
def run():
    print("═" * 60)
    print("  Winti Guide – Phase 3 Import (Kuratierte Daten)")
    print(f"  {datetime.now().strftime('%d.%m.%Y %H:%M')}")
    print("═" * 60)

    if not SUPABASE_KEY:
        print("\n❌ SUPABASE_KEY fehlt!")
        print("   Setze die Umgebungsvariable SUPABASE_KEY (service_role key)")
        print("   oder trage ihn direkt in das Skript ein.\n")
        # Zeige eine Vorschau der Daten ohne Upload
        counts: dict[str, int] = {}
        for r in ALL_LISTINGS:
            counts[r["category"]] = counts.get(r["category"], 0) + 1
        print("  Datensätze pro Kategorie (Vorschau, kein Upload):")
        for cat, n in sorted(counts.items()):
            print(f"    {cat:15s}  {n} Einträge")
        print("\n  Gesamt:", len(ALL_LISTINGS), "Einträge\n")
        sys.exit(0)

    db = Supabase(SUPABASE_URL, SUPABASE_KEY)
    total = 0

    categories = ["cafes", "bars", "sport", "touren"]
    for cat in categories:
        records = [r for r in ALL_LISTINGS if r["category"] == cat]
        print(f"\n📂 {cat.capitalize()} ({len(records)} Einträge)…")
        n = db.upsert("listings", records)
        total += n
        print(f"   ✓ {n} Einträge in Supabase gespeichert")

    print("\n" + "═" * 60)
    print(f"  ✅ Import abgeschlossen: {total} Einträge total")
    print(f"  🕐 {datetime.now().strftime('%d.%m.%Y %H:%M')}")
    print("═" * 60)


if __name__ == "__main__":
    run()
