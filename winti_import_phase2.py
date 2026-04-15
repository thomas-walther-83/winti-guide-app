#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════╗
║  Winti Guide – Phase 2 Import Script                            ║
║  Quellen: winterthur.com, myswitzerland.com, altekaserne.ch,    ║
║           stadttheater-winterthur.ch, casinotheater.ch,         ║
║           musikkollegium.ch, fotomuseum.ch, technorama.ch,      ║
║           kunsthallewinterthur.ch, stadt.winterthur.ch,         ║
║           Eventbrite API, opendata.swiss, iCal-Feeds            ║
║  Ziel:    Supabase events-Tabelle                                ║
╚══════════════════════════════════════════════════════════════════╝

Installation:
    pip install requests beautifulsoup4 supabase python-dateutil icalendar

Ausführen:
    python3 winti_import_phase2.py

Automatisierung (wöchentlich, z.B. via cron):
    0 3 * * 1 /usr/bin/python3 /pfad/winti_import_phase2.py >> /var/log/winti_import.log 2>&1
"""

import os
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta, date as date_type
from dateutil import parser as dateparser
import time
import re
import sys
import json
try:
    from icalendar import Calendar as ICalendar
    ICAL_AVAILABLE = True
except ImportError:
    ICAL_AVAILABLE = False

# ── Konfiguration ────────────────────────────────────────────────
# Credentials aus Umgebungsvariablen lesen (für GitHub Actions / CI)
# Lokal: SUPABASE_URL und SUPABASE_KEY als env-Variablen setzen
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")

# Eventbrite API-Key (https://www.eventbrite.com/platform/api)
# Kostenloses Entwickler-Konto reicht für den Import.
EVENTBRITE_TOKEN = os.environ.get("EVENTBRITE_TOKEN", "DEIN-EVENTBRITE-TOKEN")
EVENTBRITE_MAX_PAGES = 5  # Maximale Seitenzahl beim Eventbrite-Import (à 50 Events)

# Öffentliche iCal-Feeds: (URL, source_name, default_location)
# URLs ggf. anpassen oder weitere Feeds ergänzen.
ICAL_FEEDS = [
    ("https://stadtbibliothek.winterthur.ch/events.ics",   "stadtbibliothek",   "Stadtbibliothek Winterthur"),
    ("https://naturmuseum.stadtwinterthur.ch/events.ics",  "naturmuseum",       "Naturmuseum Winterthur"),
    ("https://gewerbemuseum.ch/events.ics",                "gewerbemuseum",     "Gewerbemuseum Winterthur"),
]

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
        "source":      source,
        "source_id":   re.sub(r"[^\w_-]", "_", source_id)[:100],
        "title":       title,
        "cat":         detect_category(title, desc),
        "location":    location,
        "event_date":  event_date,
        "event_time":  "",
        "price":       "",
        "description": desc,
        "url":         url[:300],
        "is_active":   True,
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
        "source":      source,
        "source_id":   re.sub(r"[^\w_-]", "_", source_id)[:100],
        "title":       title[:200],
        "cat":         detect_category(title, desc),
        "location":    location[:200],
        "event_date":  event_date,
        "event_time":  time_str,
        "price":       price,
        "description": re.sub(r"<[^>]+>", "", desc).strip(),
        "url":         url[:300],
        "is_active":   True,
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


# ── Scraper 4: Stadttheater Winterthur ───────────────────────────
def scrape_stadttheater() -> list[dict]:
    """
    Scrapt den Spielplan des Stadttheaters Winterthur.
    Quelle: stadttheater-winterthur.ch/spielplan
    """
    print("  → stadttheater-winterthur.ch scrapen…")
    events = []
    base_url = "https://www.stadttheater-winterthur.ch"
    urls = [f"{base_url}/spielplan", f"{base_url}/programm", base_url]

    for url in urls:
        try:
            res = requests.get(url, headers=HEADERS, timeout=15)
            if res.status_code != 200:
                continue
            soup = BeautifulSoup(res.text, "html.parser")

            # JSON-LD zuerst
            for script in soup.find_all("script", type="application/ld+json"):
                try:
                    data = json.loads(script.string or "")
                    items = data if isinstance(data, list) else [data]
                    for item in items:
                        ev = jsonld_to_event(item, "stadttheater")
                        if ev:
                            ev["location"] = "Stadttheater Winterthur"
                            if not ev.get("cat"):
                                ev["cat"] = "theater"
                            events.append(ev)
                except Exception:
                    pass

            # HTML-Fallback
            if not events:
                for card in soup.select(
                    "article, .event, .spielplan-item, .production, [class*='event'], [class*='vorstellung']"
                )[:40]:
                    ev = parse_event_card(card, "stadttheater", base_url)
                    if ev:
                        ev["location"] = "Stadttheater Winterthur"
                        ev["cat"] = ev.get("cat") or "theater"
                        events.append(ev)

            if events:
                break
            time.sleep(1)

        except requests.exceptions.ConnectionError:
            print("  ⚠️  stadttheater-winterthur.ch nicht erreichbar")
            break
        except Exception as e:
            print(f"  ⚠️  stadttheater: {e}")

    print(f"  ✓ {len(events)} Events vom Stadttheater Winterthur")
    return events


# ── Scraper 5: Casinotheater Winterthur ──────────────────────────
def scrape_casinotheater() -> list[dict]:
    """
    Scrapt das Programm des Casinotheaters Winterthur (Kabarett/Comedy).
    Quelle: casinotheater.ch/programm
    """
    print("  → casinotheater.ch scrapen…")
    events = []
    base_url = "https://www.casinotheater.ch"
    urls = [f"{base_url}/programm", f"{base_url}/spielplan", base_url]

    for url in urls:
        try:
            res = requests.get(url, headers=HEADERS, timeout=15)
            if res.status_code != 200:
                continue
            soup = BeautifulSoup(res.text, "html.parser")

            for script in soup.find_all("script", type="application/ld+json"):
                try:
                    data = json.loads(script.string or "")
                    items = data if isinstance(data, list) else [data]
                    for item in items:
                        ev = jsonld_to_event(item, "casinotheater")
                        if ev:
                            ev["location"] = "Casinotheater Winterthur"
                            ev["cat"] = ev.get("cat") or "theater"
                            events.append(ev)
                except Exception:
                    pass

            if not events:
                for card in soup.select(
                    "article, .event, .programm-item, [class*='event'], [class*='show']"
                )[:40]:
                    ev = parse_event_card(card, "casinotheater", base_url)
                    if ev:
                        ev["location"] = "Casinotheater Winterthur"
                        ev["cat"] = ev.get("cat") or "theater"
                        events.append(ev)

            if events:
                break
            time.sleep(1)

        except requests.exceptions.ConnectionError:
            print("  ⚠️  casinotheater.ch nicht erreichbar")
            break
        except Exception as e:
            print(f"  ⚠️  casinotheater: {e}")

    print(f"  ✓ {len(events)} Events vom Casinotheater Winterthur")
    return events


# ── Scraper 6: Musikkollegium Winterthur ─────────────────────────
def scrape_musikkollegium() -> list[dict]:
    """
    Scrapt Konzerttermine des Musikkollegiums Winterthur.
    Quelle: musikkollegium.ch/konzerte
    """
    print("  → musikkollegium.ch scrapen…")
    events = []
    base_url = "https://www.musikkollegium.ch"
    urls = [f"{base_url}/konzerte", f"{base_url}/programm", f"{base_url}/de/konzerte"]

    for url in urls:
        try:
            res = requests.get(url, headers=HEADERS, timeout=15)
            if res.status_code != 200:
                continue
            soup = BeautifulSoup(res.text, "html.parser")

            for script in soup.find_all("script", type="application/ld+json"):
                try:
                    data = json.loads(script.string or "")
                    items = data if isinstance(data, list) else [data]
                    for item in items:
                        ev = jsonld_to_event(item, "musikkollegium")
                        if ev:
                            ev["location"] = ev.get("location") or "Stadthaus Winterthur"
                            ev["cat"] = "musik"
                            events.append(ev)
                except Exception:
                    pass

            if not events:
                for card in soup.select(
                    "article, .event, .concert, .konzert-item, [class*='event'], [class*='concert']"
                )[:40]:
                    ev = parse_event_card(card, "musikkollegium", base_url)
                    if ev:
                        ev["location"] = ev.get("location") or "Stadthaus Winterthur"
                        ev["cat"] = "musik"
                        events.append(ev)

            if events:
                break
            time.sleep(1)

        except requests.exceptions.ConnectionError:
            print("  ⚠️  musikkollegium.ch nicht erreichbar")
            break
        except Exception as e:
            print(f"  ⚠️  musikkollegium: {e}")

    print(f"  ✓ {len(events)} Events vom Musikkollegium Winterthur")
    return events


# ── Scraper 7: Fotomuseum Winterthur ─────────────────────────────
def scrape_fotomuseum() -> list[dict]:
    """
    Scrapt Veranstaltungen des Fotomuseums Winterthur.
    Quelle: fotomuseum.ch/de/programm
    """
    print("  → fotomuseum.ch scrapen…")
    events = []
    base_url = "https://www.fotomuseum.ch"
    urls = [f"{base_url}/de/programm", f"{base_url}/de/events", base_url]

    for url in urls:
        try:
            res = requests.get(url, headers=HEADERS, timeout=15)
            if res.status_code != 200:
                continue
            soup = BeautifulSoup(res.text, "html.parser")

            for script in soup.find_all("script", type="application/ld+json"):
                try:
                    data = json.loads(script.string or "")
                    items = data if isinstance(data, list) else [data]
                    for item in items:
                        ev = jsonld_to_event(item, "fotomuseum")
                        if ev:
                            ev["location"] = "Fotomuseum Winterthur"
                            ev["cat"] = "kultur"
                            events.append(ev)
                except Exception:
                    pass

            if not events:
                for card in soup.select(
                    "article, .event, .programm-item, [class*='event'], [class*='teaser']"
                )[:30]:
                    ev = parse_event_card(card, "fotomuseum", base_url)
                    if ev:
                        ev["location"] = "Fotomuseum Winterthur"
                        ev["cat"] = "kultur"
                        events.append(ev)

            if events:
                break
            time.sleep(1)

        except requests.exceptions.ConnectionError:
            print("  ⚠️  fotomuseum.ch nicht erreichbar")
            break
        except Exception as e:
            print(f"  ⚠️  fotomuseum: {e}")

    print(f"  ✓ {len(events)} Events vom Fotomuseum Winterthur")
    return events


# ── Scraper 8: Technorama Winterthur ─────────────────────────────
def scrape_technorama() -> list[dict]:
    """
    Scrapt Veranstaltungen des Technorama Winterthur.
    Quelle: technorama.ch/de/veranstaltungen
    """
    print("  → technorama.ch scrapen…")
    events = []
    base_url = "https://www.technorama.ch"
    urls = [f"{base_url}/de/veranstaltungen", f"{base_url}/de/events", base_url]

    for url in urls:
        try:
            res = requests.get(url, headers=HEADERS, timeout=15)
            if res.status_code != 200:
                continue
            soup = BeautifulSoup(res.text, "html.parser")

            for script in soup.find_all("script", type="application/ld+json"):
                try:
                    data = json.loads(script.string or "")
                    items = data if isinstance(data, list) else [data]
                    for item in items:
                        ev = jsonld_to_event(item, "technorama")
                        if ev:
                            ev["location"] = "Technorama Winterthur"
                            ev["cat"] = "kultur"
                            events.append(ev)
                except Exception:
                    pass

            if not events:
                for card in soup.select(
                    "article, .event, [class*='event'], [class*='veranstaltung']"
                )[:30]:
                    ev = parse_event_card(card, "technorama", base_url)
                    if ev:
                        ev["location"] = "Technorama Winterthur"
                        ev["cat"] = "kultur"
                        events.append(ev)

            if events:
                break
            time.sleep(1)

        except requests.exceptions.ConnectionError:
            print("  ⚠️  technorama.ch nicht erreichbar")
            break
        except Exception as e:
            print(f"  ⚠️  technorama: {e}")

    print(f"  ✓ {len(events)} Events vom Technorama Winterthur")
    return events


# ── Scraper 9: Kunsthalle Winterthur ─────────────────────────────
def scrape_kunsthalle() -> list[dict]:
    """
    Scrapt Veranstaltungen der Kunsthalle Winterthur.
    Quelle: kunsthallewinterthur.ch
    """
    print("  → kunsthallewinterthur.ch scrapen…")
    events = []
    base_url = "https://kunsthallewinterthur.ch"
    urls = [
        f"{base_url}/programm",
        f"{base_url}/ausstellungen",
        f"{base_url}/events",
        base_url,
    ]

    for url in urls:
        try:
            res = requests.get(url, headers=HEADERS, timeout=15)
            if res.status_code != 200:
                continue
            soup = BeautifulSoup(res.text, "html.parser")

            for script in soup.find_all("script", type="application/ld+json"):
                try:
                    data = json.loads(script.string or "")
                    items = data if isinstance(data, list) else [data]
                    for item in items:
                        ev = jsonld_to_event(item, "kunsthalle")
                        if ev:
                            ev["location"] = "Kunsthalle Winterthur"
                            ev["cat"] = "kultur"
                            events.append(ev)
                except Exception:
                    pass

            if not events:
                for card in soup.select(
                    "article, .event, [class*='event'], [class*='ausstellung']"
                )[:30]:
                    ev = parse_event_card(card, "kunsthalle", base_url)
                    if ev:
                        ev["location"] = "Kunsthalle Winterthur"
                        ev["cat"] = "kultur"
                        events.append(ev)

            if events:
                break
            time.sleep(1)

        except requests.exceptions.ConnectionError:
            print("  ⚠️  kunsthallewinterthur.ch nicht erreichbar")
            break
        except Exception as e:
            print(f"  ⚠️  kunsthalle: {e}")

    print(f"  ✓ {len(events)} Events von der Kunsthalle Winterthur")
    return events


# ── Scraper 10: Stadt Winterthur Veranstaltungskalender ──────────
def scrape_stadt_winterthur() -> list[dict]:
    """
    Scrapt den offiziellen Veranstaltungskalender der Stadt Winterthur.
    Quelle: stadt.winterthur.ch/themen/veranstaltungen
    Versucht zuerst einen iCal-Export, dann JSON-LD, dann HTML.
    """
    print("  → stadt.winterthur.ch scrapen…")
    events = []
    base_url = "https://stadt.winterthur.ch"

    # Mögliche iCal-Export-URLs
    ical_candidates = [
        f"{base_url}/themen/veranstaltungen/veranstaltungen.ics",
        f"{base_url}/veranstaltungen.ics",
    ]
    for ical_url in ical_candidates:
        ical_events = import_ical(ical_url, "stadt_winterthur", default_location="Winterthur")
        if ical_events:
            events.extend(ical_events)
            break

    if not events:
        urls = [
            f"{base_url}/themen/veranstaltungen",
            f"{base_url}/leben-in-winterthur/freizeit-und-kultur/veranstaltungen",
        ]
        for url in urls:
            try:
                res = requests.get(url, headers=HEADERS, timeout=15)
                if res.status_code != 200:
                    continue
                soup = BeautifulSoup(res.text, "html.parser")

                for script in soup.find_all("script", type="application/ld+json"):
                    try:
                        data = json.loads(script.string or "")
                        items = data if isinstance(data, list) else [data]
                        for item in items:
                            ev = jsonld_to_event(item, "stadt_winterthur")
                            if ev:
                                events.append(ev)
                    except Exception:
                        pass

                if not events:
                    for card in soup.select(
                        "article, .event, [class*='event'], [class*='veranstaltung']"
                    )[:40]:
                        ev = parse_event_card(card, "stadt_winterthur", base_url)
                        if ev:
                            events.append(ev)

                if events:
                    break
                time.sleep(1)

            except requests.exceptions.ConnectionError:
                print("  ⚠️  stadt.winterthur.ch nicht erreichbar")
                break
            except Exception as e:
                print(f"  ⚠️  stadt_winterthur: {e}")

    print(f"  ✓ {len(events)} Events von stadt.winterthur.ch")
    return events


# ── Scraper 11: Eventbrite API ────────────────────────────────────
def scrape_eventbrite() -> list[dict]:
    """
    Lädt Events via Eventbrite API für den Standort Winterthur.
    API-Key: EVENTBRITE_TOKEN (oben konfigurieren).
    Dokumentation: https://www.eventbrite.com/platform/api
    """
    print("  → Eventbrite API abfragen…")
    events = []

    if EVENTBRITE_TOKEN == "DEIN-EVENTBRITE-TOKEN":
        print("  ⚠️  Eventbrite-Token nicht konfiguriert – übersprungen")
        return events

    api_url = "https://www.eventbriteapi.com/v3/events/search/"
    params = {
        "location.address":   "Winterthur, Switzerland",
        "location.within":    "10km",
        "expand":             "venue,ticket_availability",
        "start_date.range_start": datetime.now().strftime("%Y-%m-%dT00:00:00Z"),
        "page_size":          50,
    }
    headers = {
        "Authorization": f"Bearer {EVENTBRITE_TOKEN}",
        "Accept":        "application/json",
    }

    page = 1
    while page <= EVENTBRITE_MAX_PAGES:
        params["page"] = page
        try:
            res = requests.get(api_url, headers=headers, params=params, timeout=20)
            if res.status_code == 401:
                print("  ⚠️  Eventbrite: Ungültiger API-Token")
                break
            if res.status_code != 200:
                print(f"  ⚠️  Eventbrite HTTP {res.status_code}")
                break

            data = res.json()
            eb_events = data.get("events", [])
            if not eb_events:
                break

            for eb in eb_events:
                title = eb.get("name", {}).get("text", "")
                if not title:
                    continue

                start = eb.get("start", {}).get("local", "")
                event_date = parse_date(start)
                if not event_date:
                    continue

                venue = eb.get("venue") or {}
                location = venue.get("name", "") or venue.get("address", {}).get("city", "Winterthur")

                desc_raw = (eb.get("description") or {}).get("text", "")
                desc = desc_raw[:500] if desc_raw else ""

                # Preis
                price = ""
                ticket = eb.get("ticket_availability") or {}
                if ticket.get("is_free"):
                    price = "Gratis"
                else:
                    min_price = ticket.get("minimum_ticket_price") or {}
                    if min_price.get("display"):
                        price = min_price["display"]

                time_str = start[11:16] if len(start) > 10 else ""
                eb_id = eb.get("id", "")
                source_id = f"eventbrite_{eb_id}" if eb_id else None
                if not source_id:
                    source_id = re.sub(r"[^\w_-]", "_", f"eventbrite_{title[:40]}_{event_date}")

                events.append({
                    "source":     "eventbrite",
                    "source_id":  source_id[:100],
                    "title":      title[:200],
                    "cat":        detect_category(title, desc),
                    "location":   str(location)[:200],
                    "event_date": event_date,
                    "event_time": time_str,
                    "price":      price,
                    "description": desc,
                    "url":        eb.get("url", "")[:300],
                    "is_active":  True,
                })

            pagination = data.get("pagination", {})
            if not pagination.get("has_more_items"):
                break
            page += 1
            time.sleep(1)

        except requests.exceptions.ConnectionError:
            print("  ⚠️  Eventbrite API nicht erreichbar")
            break
        except Exception as e:
            print(f"  ⚠️  Eventbrite: {e}")
            break

    print(f"  ✓ {len(events)} Events von Eventbrite")
    return events


# ── Scraper 12: opendata.swiss ────────────────────────────────────
def scrape_opendata_swiss() -> list[dict]:
    """
    Sucht Events im offenen Schweizer Behördendatenportal opendata.swiss.
    REST-CKAN-API, kein Login nötig.
    Dokumentation: https://opendata.swiss/de/dataset
    """
    print("  → opendata.swiss abfragen…")
    events = []

    # Suche nach Event-Datensätzen mit Bezug zu Winterthur
    search_url = "https://ckan.opendata.swiss/api/3/action/package_search"
    params = {
        "q":            "winterthur veranstaltung OR events OR kalender",
        "rows":         10,
        "fq":           'res_format:"JSON" OR res_format:"CSV"',
    }

    try:
        res = requests.get(search_url, params=params, headers=HEADERS, timeout=20)
        res.raise_for_status()
        results = res.json().get("result", {}).get("results", [])

        for pkg in results:
            for resource in pkg.get("resources", []):
                fmt = resource.get("format", "").upper()
                if fmt not in ("JSON", "CSV", "GEOJSON"):
                    continue
                resource_url = resource.get("url", "")
                if not resource_url:
                    continue
                try:
                    r2 = requests.get(resource_url, headers=HEADERS, timeout=20)
                    if r2.status_code != 200:
                        continue
                    if fmt == "JSON":
                        raw = r2.json()
                        items = raw if isinstance(raw, list) else raw.get("features", raw.get("events", []))
                        for item in items[:50]:
                            ev = _opendata_item_to_event(item)
                            if ev:
                                events.append(ev)
                    # CSV parsing omitted – most Event-datasets are JSON
                    time.sleep(0.5)
                except Exception:
                    pass

    except requests.exceptions.ConnectionError:
        print("  ⚠️  opendata.swiss nicht erreichbar")
    except Exception as e:
        print(f"  ⚠️  opendata.swiss: {e}")

    print(f"  ✓ {len(events)} Events von opendata.swiss")
    return events


def _opendata_item_to_event(item: dict) -> dict | None:
    """Konvertiert ein generisches opendata.swiss-Objekt in ein Event-Dict."""
    # Unterstützt flache Dicts und GeoJSON-Features
    props = item.get("properties", item)

    title = props.get("title") or props.get("name") or props.get("bezeichnung") or ""
    if not title:
        return None
    title = str(title).strip()[:200]

    date_raw = (
        props.get("startDate") or props.get("start_date") or
        props.get("datum") or props.get("date") or ""
    )
    event_date = parse_date(str(date_raw))
    if not event_date:
        return None

    location = str(props.get("location") or props.get("ort") or "Winterthur")[:200]
    desc = str(props.get("description") or props.get("beschreibung") or "")[:500]
    url = str(props.get("url") or props.get("link") or "")[:300]

    source_id = re.sub(r"[^\w_-]", "_", f"opendata_{title[:40]}_{event_date}")

    return {
        "source":     "opendata_swiss",
        "source_id":  source_id[:100],
        "title":      title,
        "cat":        detect_category(title, desc),
        "location":   location,
        "event_date": event_date,
        "event_time": "",
        "price":      "",
        "description": desc,
        "url":        url,
        "is_active":  True,
    }


# ── iCal-Importer (generisch) ─────────────────────────────────────
def import_ical(url: str, source_name: str, default_location: str = "Winterthur") -> list[dict]:
    """
    Lädt einen öffentlichen iCal-Feed und konvertiert die Events.

    Verwendungsbeispiel:
        import_ical("https://stadtbibliothek.winterthur.ch/events.ics", "stadtbibliothek")

    Bekannte Feeds in Winterthur:
        - Stadtbibliothek:  https://stadtbibliothek.winterthur.ch  (iCal prüfen)
        - Naturmuseum:      https://naturmuseum.stadtwinterthur.ch  (iCal prüfen)
        - Gewerbemuseum:    https://gewerbemuseum.ch                (iCal prüfen)
    """
    if not ICAL_AVAILABLE:
        print(f"  ⚠️  icalendar-Library fehlt – '{source_name}' übersprungen (pip install icalendar)")
        return []

    events = []
    try:
        res = requests.get(url, headers=HEADERS, timeout=15)
        if res.status_code != 200:
            return []
        cal = ICalendar.from_ical(res.content)
        today = date_type.today()

        for component in cal.walk():
            if component.name != "VEVENT":
                continue
            try:
                title = str(component.get("SUMMARY", "")).strip()
                if not title:
                    continue

                dtstart = component.get("DTSTART")
                if not dtstart:
                    continue
                dt = dtstart.dt
                if isinstance(dt, datetime):
                    event_date_obj = dt.date()
                    time_str = dt.strftime("%H:%M")
                elif isinstance(dt, date_type):
                    event_date_obj = dt
                    time_str = ""
                else:
                    continue

                if event_date_obj < today:
                    continue

                event_date = event_date_obj.strftime("%Y-%m-%d")

                location_raw = str(component.get("LOCATION", "")).strip()
                location = location_raw[:200] if location_raw else default_location

                desc_raw = str(component.get("DESCRIPTION", "")).strip()
                desc = re.sub(r"<[^>]+>", "", desc_raw)[:500]

                url_val = str(component.get("URL", "")).strip()[:300]

                uid = str(component.get("UID", "")).strip()
                source_id = (
                    f"{source_name}_{uid[:60]}"
                    if uid
                    else re.sub(r"[^\w_-]", "_", f"{source_name}_{title[:40]}_{event_date}")
                )

                events.append({
                    "source":     source_name,
                    "source_id":  source_id[:100],
                    "title":      title[:200],
                    "cat":        detect_category(title, desc),
                    "location":   location,
                    "event_date": event_date,
                    "event_time": time_str,
                    "price":      "",
                    "description": desc,
                    "url":        url_val,
                    "is_active":  True,
                })
            except Exception:
                pass

    except requests.exceptions.ConnectionError:
        pass
    except Exception as e:
        print(f"  ⚠️  iCal {source_name}: {e}")

    return events


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

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("\n❌ Bitte SUPABASE_URL und SUPABASE_KEY als Umgebungsvariablen setzen!")
        print("   export SUPABASE_URL=https://<project>.supabase.co")
        print("   export SUPABASE_KEY=<service-role-key>")
        sys.exit(1)

    db = Supabase(SUPABASE_URL, SUPABASE_KEY)
    all_events = []

    print("\n📅 Events scrapen…")
    print("-" * 40)

    # Alle Quellen scrapen
    all_events += scrape_winterthur_com()
    all_events += scrape_myswitzerland()
    all_events += scrape_alte_kaserne()
    all_events += scrape_stadttheater()
    all_events += scrape_casinotheater()
    all_events += scrape_musikkollegium()
    all_events += scrape_fotomuseum()
    all_events += scrape_technorama()
    all_events += scrape_kunsthalle()
    all_events += scrape_stadt_winterthur()
    all_events += scrape_eventbrite()
    all_events += scrape_opendata_swiss()
    for feed_url, feed_source, feed_location in ICAL_FEEDS:
        all_events += import_ical(feed_url, feed_source, default_location=feed_location)

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
