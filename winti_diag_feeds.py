#!/usr/bin/env python3
"""Temporäres Diagnose-Tool für strukturierte Event-/Daten-Feeds.

Läuft auf dem GitHub-Runner. Prüft, welche iCal-Feeds tatsächlich gültige
Kalender liefern, und durchsucht opendata.swiss (CKAN) nach echten
Winterthur-Event-Datensätzen. Schreibt nur ins Log, ändert nichts.
Wird nach der Auswertung wieder entfernt.
"""

import json
import requests

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)
H = {"User-Agent": UA}

ICAL_CANDIDATES = [
    "https://stadtbibliothek.winterthur.ch/events.ics",
    "https://naturmuseum.stadtwinterthur.ch/events.ics",
    "https://gewerbemuseum.ch/events.ics",
    "https://stadt.winterthur.ch/events.ics",
    "https://www.winterthur.com/events.ics",
    "https://www.altekaserne.ch/programm.ics",
]


def check_ical():
    print("\n==================== iCal-Feeds ====================")
    for url in ICAL_CANDIDATES:
        try:
            r = requests.get(url, headers=H, timeout=20)
            body = r.text[:60].replace("\n", " ").replace("\r", " ")
            is_cal = "BEGIN:VCALENDAR" in r.text[:200]
            n_events = r.text.count("BEGIN:VEVENT")
            print(f"  [{r.status_code}] {url}")
            print(f"       ical={is_cal} vevents={n_events} ct={r.headers.get('content-type','?')[:40]}")
            if not is_cal:
                print(f"       head='{body}'")
        except Exception as e:  # noqa: BLE001
            print(f"  [ERR] {url} -> {type(e).__name__}: {e}")


def check_opendata():
    print("\n================ opendata.swiss (CKAN) ================")
    url = "https://ckan.opendata.swiss/api/3/action/package_search"
    for q in ["winterthur veranstaltungen", "winterthur events", "winterthur agenda kultur"]:
        print(f"\n  Suche: '{q}'")
        try:
            r = requests.get(url, params={"q": q, "rows": 8}, headers=H, timeout=25)
            results = r.json().get("result", {}).get("results", [])
            print(f"    {len(results)} Datensätze")
            for pkg in results:
                title = (pkg.get("title") or pkg.get("name") or "?")
                if isinstance(title, dict):
                    title = title.get("de") or title.get("en") or next(iter(title.values()), "?")
                fmts = sorted({(res.get("format") or "?").upper() for res in pkg.get("resources", [])})
                print(f"    • {str(title)[:70]}  [{','.join(fmts)}]")
                for res in pkg.get("resources", [])[:3]:
                    fmt = (res.get("format") or "?").upper()
                    if fmt in ("JSON", "CSV", "GEOJSON", "ICS"):
                        print(f"        - {fmt}: {(res.get('url') or '')[:110]}")
        except Exception as e:  # noqa: BLE001
            print(f"    [ERR] {type(e).__name__}: {e}")


def main():
    print("🔍 Feed-Diagnose")
    check_ical()
    check_opendata()
    print("\n✅ Feed-Diagnose fertig")


if __name__ == "__main__":
    main()
