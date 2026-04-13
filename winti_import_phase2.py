#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════╗
║  Winti Guide – Phase 2 Import Script                            ║
║  Quellen: winterthur.com + myswitzerland.com (Events-Scraping)  ║
║  Ziel:    Supabase events-Tabelle                                ║
╚══════════════════════════════════════════════════════════════════╝

Installation:
    pip install requests beautifulsoup4 supabase python-dateutil

Ausführen:
    python3 winti_import_phase2.py

Automatisierung (wöchentlich, z.B. via cron):
    0 3 * * 1 /usr/bin/python3 /pfad/winti_import_phase2.py >> /var/log/winti_import.log 2>&1
"""

import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
from dateutil import parser as dateparser
import time
import re
import sys
import json

# ── Konfiguration ────────────────────────────────────────────────
SUPABASE_URL = "https://DEINE-PROJECT-ID.supabase.co"
SUPABASE_KEY = "DEIN-SERVICE-ROLE-KEY"

HEADERS = {
    "User-Agent": "WintiGuide/1.0 (Stadtführer-App Winterthur; kontakt@wintiGuide.ch)",
    "Accept-Language": "de-CH,de;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

# Kategorie-Mapping: Schlüsselwörter → Winti-Guide-Kategorie
CATEGORY_MAP = {
    "konzert":   "musik",   "musik":     "musik",   "band":      "musik",
    "jazz":      "musik",   "rock":      "musik",   "classical": "musik",
    "festival":  "festival","fest":      "festival","albanifest":"festival",
    "theater":   "theater", "kabarett":  "theater", "comedy":    "theater",
    "ausstellung":"kultur", "museum":    "kultur",  "vernissage":"kultur",
    "kunst":     "kultur",  "foto":      "kultur",
    "markt":     "markt",   "flohmarkt": "markt",   "märit":     "markt",
    "sport":     "sport",   "lauf":      "sport",   "triathlon": "sport",
    "turnier":   "sport",   "schwimm":   "sport",   "yoga":      "sport",
    "tour":      "tour",    "führung":   "tour",    "wanderung": "tour",
    "velo":      "tour",    "bike":      "tour",
    "kulinarik": "kulinarik","wein":     "kulinarik","food":     "kulinarik",
    "degustation":"kulinarik",
}

def detect_category(title: str, desc: str = "") -> str:
    text = (title + " " + desc).lower()
    for keyword, cat in CATEGORY_MAP.items():
        if keyword in text:
            return cat
    return "festival"  # Default


# ── Supabase Helper ──────────────────────────────────────────────
class Supabase:
    def __init__(self, url, key):
        self.url  = url
        self.hdrs = {
            "apikey":        key,
            "Authorization": f"Bearer {key}",
            "Content-Type":  "application/json",
        }

    def upsert_events(self, events: list[dict]) -> int:
        if not events:
            return 0
        total = 0
        for i in range(0, len(events), 50):
            batch = events[i:i+50]
            res = requests.post(
                f"{self.url}/rest/v1/events",
                headers={**self.hdrs, "Prefer": "resolution=merge-duplicates,return=minimal"},
                json=batch
            )
            if res.status_code not in (200, 201):
                print(f"  ⚠️  Supabase Fehler {res.status_code}: {res.text[:200]}")
            else:
                total += len(batch)
        return total

    def get_existing_source_ids(self, source: str) -> set:
        res = requests.get(
            f"{self.url}/rest/v1/events?source=eq.{source}&select=source_id",
            headers=self.hdrs
        )
        if res.status_code == 200:
            return {r["source_id"] for r in res.json()}
        return set()


# ── Scraper 1: winterthur.com ────────────────────────────────────
def scrape_winterthur_com() -> list[dict]:
    """
    Scrapt Events von winterthur.com (House of Winterthur).
    Öffentlich zugänglich, kein Login nötig.
    Fairuse: Nur Events, keine personenbezogenen Daten, Quelle wird angegeben.
    """
    print("  → winterthur.com scrapen…")
    events = []

    urls = [
        "https://en.winterthur.com/",
        "https://de.winterthur.com/",
    ]

    for base_url in urls:
        try:
            res = requests.get(base_url, headers=HEADERS, timeout=15)
            res.raise_for_status()
            soup = BeautifulSoup(res.text, "html.parser")

            # Suche nach Event-Elementen (verschiedene CSS-Selektoren probieren)
            selectors = [
                "article.event", ".event-item", ".event-card",
                "[class*='event']", ".teaser", "article"
            ]

            for selector in selectors:
                items = soup.select(selector)
                if len(items) >= 2:
                    print(f"    Gefunden: {len(items)} Items mit '{selector}'")
                    for item in items[:30]:  # Max 30 pro Seite
                        event = parse_event_card(item, "winterthur_com", base_url)
                        if event:
                            events.append(event)
                    break

            time.sleep(2)

        except requests.exceptions.ConnectionError:
            print("  ⚠️  winterthur.com nicht erreichbar")
        except Exception as e:
            print(f"  ⚠️  Fehler: {e}")

    # Fallback: Bekannte Event-Seiten direkt
    event_pages = [
        "https://en.winterthur.com/experiences",
        "https://en.winterthur.com/events",
    ]
    for page_url in event_pages:
        try:
            res = requests.get(page_url, headers=HEADERS, timeout=15)
            if res.status_code == 200:
                soup = BeautifulSoup(res.text, "html.parser")
                # Strukturierte Daten (JSON-LD) suchen
                for script in soup.find_all("script", type="application/ld+json"):
                    try:
                        data = json.loads(script.string)
                        if isinstance(data, list):
                            for d in data:
                                ev = jsonld_to_event(d, "winterthur_com")
                                if ev:
                                    events.append(ev)
                        elif isinstance(data, dict):
                            ev = jsonld_to_event(data, "winterthur_com")
                            if ev:
                                events.append(ev)
                    except:
                        pass
            time.sleep(2)
        except:
            pass

    print(f"  ✓ {len(events)} Events von winterthur.com")
    return events


def parse_event_card(item, source: str, base_url: str) -> dict | None:
    """Extrahiert Event-Daten aus einem HTML-Element."""
    # Titel
    title_el = item.find(["h1","h2","h3","h4"]) or item.find(class_=re.compile("title|heading|name"))
    if not title_el:
        return None
    title = title_el.get_text(strip=True)
    if len(title) < 3 or len(title) > 200:
        return None

    # Datum
    date_str = ""
    date_el = (item.find("time") or
               item.find(class_=re.compile("date|time|when")) or
               item.find(attrs={"datetime": True}))
    if date_el:
        date_str = date_el.get("datetime", "") or date_el.get_text(strip=True)

    event_date = parse_date(date_str)
    if not event_date:
        # Versuche Datum aus Text zu extrahieren
        text = item.get_text()
        event_date = extract_date_from_text(text)
    if not event_date:
        return None

    # Location
    location = ""
    loc_el = item.find(class_=re.compile("location|venue|place|where"))
    if loc_el:
        location = loc_el.get_text(strip=True)[:100]
    if not location:
        location = "Winterthur"

    # Beschreibung
    desc = ""
    desc_el = item.find(class_=re.compile("desc|text|body|summary"))
    if not desc_el:
        desc_el = item.find("p")
    if desc_el:
        desc = desc_el.get_text(strip=True)[:500]

    # URL
    url = ""
    link = item.find("a", href=True)
    if link:
        href = link["href"]
        url = href if href.startswith("http") else base_url.rstrip("/") + "/" + href.lstrip("/")

    source_id = f"{source}_{title[:50]}_{event_date}"

    return {
        "source":     source,
        "source_id":  re.sub(r"[^\w_-]", "_", source_id)[:100],
        "title":      title,
        "cat":        detect_category(title, desc),
        "location":   location,
        "event_date": event_date,
        "event_time": "",
        "price":      "",
        "desc":       desc,
        "url":        url[:300],
        "is_active":  True,
    }


def jsonld_to_event(data: dict, source: str) -> dict | None:
    """Konvertiert JSON-LD Event-Daten in Supabase-Format."""
    dtype = data.get("@type", "")
    if "Event" not in str(dtype) and "event" not in str(dtype).lower():
        return None

    title = data.get("name", "")
    if not title:
        return None

    # Datum
    start = data.get("startDate", "")
    event_date = parse_date(start)
    if not event_date:
        return None

    # Location
    location = "Winterthur"
    loc = data.get("location", {})
    if isinstance(loc, dict):
        location = loc.get("name", "") or loc.get("address", {}).get("addressLocality", "Winterthur")
    elif isinstance(loc, str):
        location = loc

    # Preis
    price = ""
    offers = data.get("offers", {})
    if isinstance(offers, dict):
        price_val = offers.get("price", "")
        currency  = offers.get("priceCurrency", "CHF")
        if price_val == "0" or price_val == 0:
            price = "Gratis"
        elif price_val:
            price = f"{currency} {price_val}"

    desc = data.get("description", "")[:500]
    url  = data.get("url", "")
    time_str = start[11:16] if len(start) > 10 else ""

    source_id = f"{source}_{title[:50]}_{event_date}"

    return {
        "source":     source,
        "source_id":  re.sub(r"[^\w_-]", "_", source_id)[:100],
        "title":      title[:200],
        "cat":        detect_category(title, desc),
        "location":   location[:200],
        "event_date": event_date,
        "event_time": time_str,
        "price":      price,
        "desc":       re.sub(r"<[^>]+>", "", desc).strip(),
        "url":        url[:300],
        "is_active":  True,
    }


# ── Scraper 2: myswitzerland.com ─────────────────────────────────
def scrape_myswitzerland() -> list[dict]:
    """
    Scrapt Events von myswitzerland.com für Winterthur.
    Öffentlich zugänglich. Schweiz Tourismus bietet keine API,
    aber die Event-Seite ist HTML-zugänglich.
    """
    print("  → myswitzerland.com scrapen…")
    events = []

    # Direkte Event-Suche für Winterthur
    url = "https://www.myswitzerland.com/de-ch/erlebnisse/veranstaltungen/veranstaltungen-suche/-/winterthur/"

    try:
        res = requests.get(url, headers=HEADERS, timeout=20)
        res.raise_for_status()
        soup = BeautifulSoup(res.text, "html.parser")

        # JSON-LD Events suchen
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string or "")
                items = data if isinstance(data, list) else [data]
                for item in items:
                    ev = jsonld_to_event(item, "myswitzerland")
                    if ev:
                        events.append(ev)
            except:
                pass

        # HTML-Fallback: Event-Cards parsen
        if not events:
            cards = soup.select(".event, .teaser, article, [class*='event'], [class*='card']")
            for card in cards[:30]:
                ev = parse_event_card(card, "myswitzerland", "https://www.myswitzerland.com")
                if ev:
                    events.append(ev)

        time.sleep(2)

    except requests.exceptions.ConnectionError:
        print("  ⚠️  myswitzerland.com nicht erreichbar")
    except Exception as e:
        print(f"  ⚠️  Fehler: {e}")

    print(f"  ✓ {len(events)} Events von myswitzerland.com")
    return events


# ── Scraper 3: Alte Kaserne (Veranstaltungsort) ──────────────────
def scrape_alte_kaserne() -> list[dict]:
    """
    Scrapt das Programm der Alten Kaserne Winterthur.
    Wichtiger lokaler Kulturort mit eigenem Kalender.
    """
    print("  → altekaserne.ch scrapen…")
    events = []

    try:
        res = requests.get("https://www.altekaserne.ch/programm", headers=HEADERS, timeout=15)
        res.raise_for_status()
        soup = BeautifulSoup(res.text, "html.parser")

        # JSON-LD
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string or "")
                items = data if isinstance(data, list) else [data]
                for item in items:
                    ev = jsonld_to_event(item, "altekaserne")
                    if ev:
                        ev["location"] = "Alte Kaserne Winterthur"
                        events.append(ev)
            except:
                pass

        # HTML Cards
        if not events:
            for card in soup.select("article, .event, .programm-item")[:30]:
                ev = parse_event_card(card, "altekaserne", "https://www.altekaserne.ch")
                if ev:
                    ev["location"] = "Alte Kaserne Winterthur"
                    events.append(ev)

        time.sleep(1)

    except Exception as e:
        print(f"  ⚠️  altekaserne.ch: {e}")

    print(f"  ✓ {len(events)} Events von altekaserne.ch")
    return events


# ── Datum-Parser ─────────────────────────────────────────────────
def parse_date(date_str: str) -> str | None:
    """Parst verschiedene Datumsformate in YYYY-MM-DD."""
    if not date_str:
        return None
    try:
        dt = dateparser.parse(date_str, dayfirst=True)
        if dt and dt.year >= datetime.now().year:
            return dt.strftime("%Y-%m-%d")
    except:
        pass
    return None


def extract_date_from_text(text: str) -> str | None:
    """Extrahiert Datum aus Freitext (DE/EN)."""
    patterns = [
        r"(\d{1,2})[.\s/](\d{1,2})[.\s/](\d{4})",     # 25.06.2026
        r"(\d{4})-(\d{2})-(\d{2})",                      # 2026-06-25
        r"(\d{1,2})\.\s*(Jan|Feb|Mär|Apr|Mai|Jun|Jul|Aug|Sep|Okt|Nov|Dez)\.?\s*(\d{4})",
    ]
    months = {"jan":1,"feb":2,"mär":3,"apr":4,"mai":5,"jun":6,"jul":7,"aug":8,"sep":9,"okt":10,"nov":11,"dez":12}
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            try:
                groups = m.groups()
                if len(groups) == 3:
                    if groups[1].lower() in months:
                        d, mon, y = int(groups[0]), months[groups[1].lower()], int(groups[2])
                    elif len(groups[0]) == 4:
                        y, mon, d = int(groups[0]), int(groups[1]), int(groups[2])
                    else:
                        d, mon, y = int(groups[0]), int(groups[1]), int(groups[2])
                    dt = datetime(y, mon, d)
                    if dt >= datetime.now() - timedelta(days=7):
                        return dt.strftime("%Y-%m-%d")
            except:
                pass
    return None


def deduplicate(events: list[dict]) -> list[dict]:
    """Entfernt doppelte Events anhand Titel + Datum."""
    seen = set()
    unique = []
    for ev in events:
        key = (ev["title"].lower().strip()[:40], ev["event_date"])
        if key not in seen:
            seen.add(key)
            unique.append(ev)
    return unique


# ── Hauptprogramm ────────────────────────────────────────────────
def run():
    print("═" * 60)
    print("  Winti Guide – Phase 2 Import (Events Scraping)")
    print(f"  {datetime.now().strftime('%d.%m.%Y %H:%M')}")
    print("═" * 60)

    if "DEINE" in SUPABASE_URL:
        print("\n❌ Bitte SUPABASE_URL und SUPABASE_KEY konfigurieren!")
        sys.exit(1)

    db = Supabase(SUPABASE_URL, SUPABASE_KEY)
    all_events = []

    print("\n📅 Events scrapen…")
    print("-" * 40)

    # Alle Quellen scrapen
    all_events += scrape_winterthur_com()
    all_events += scrape_myswitzerland()
    all_events += scrape_alte_kaserne()

    print(f"\n  Gesamt roh: {len(all_events)} Events")

    # Bereinigen
    valid = [e for e in all_events if e.get("title") and e.get("event_date")]
    unique = deduplicate(valid)
    print(f"  Nach Bereinigung: {len(unique)} eindeutige Events")

    # In Supabase speichern
    print("\n💾 In Supabase speichern…")
    n = db.upsert_events(unique)

    print("\n" + "═" * 60)
    print(f"  ✅ {n} Events importiert / aktualisiert")
    print(f"  🕐 {datetime.now().strftime('%d.%m.%Y %H:%M')}")
    print("═" * 60)

    # Kurzbericht
    by_source = {}
    for ev in unique:
        s = ev.get("source", "unknown")
        by_source[s] = by_source.get(s, 0) + 1
    if by_source:
        print("\n  Aufschlüsselung nach Quelle:")
        for src, cnt in sorted(by_source.items(), key=lambda x: -x[1]):
            print(f"    {src}: {cnt} Events")

    by_cat = {}
    for ev in unique:
        c = ev.get("cat", "?")
        by_cat[c] = by_cat.get(c, 0) + 1
    if by_cat:
        print("\n  Aufschlüsselung nach Kategorie:")
        for cat, cnt in sorted(by_cat.items(), key=lambda x: -x[1]):
            print(f"    {cat}: {cnt} Events")


if __name__ == "__main__":
    run()
