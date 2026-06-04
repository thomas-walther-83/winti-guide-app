#!/usr/bin/env python3
"""
Quell-Probe: prüft, ob bestimmte Seiten vom CI-Runner (Browser-User-Agent)
abrufbar sind und ob sie server-seitige, strukturierte Inhalte liefern.
Reines Diagnose-Tool – schreibt nichts in die Datenbank.

Aufruf:  python3 probe_sources.py
"""
import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    ),
    "Accept-Language": "de-CH,de;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

URLS = [
    "https://www.kinderthur.ch",
    "https://kinderregion.ch/de/die-region/winterthur/",
    "https://winterthur.com/kunst-kultur/veranstaltungen.html",
    "https://www.winterthur.com/de/kunst-kultur/veranstaltungen.html",
    "https://veranstaltungen.winterthur.ch/events",
]


def probe(url: str) -> None:
    print(f"\n=== {url}")
    try:
        res = requests.get(url, headers=HEADERS, timeout=20)
    except Exception as e:
        print(f"  FEHLER: {type(e).__name__}: {str(e)[:120]}")
        return
    print(f"  HTTP {res.status_code} · {len(res.text)} bytes · final={res.url}")
    if res.status_code != 200:
        return
    soup = BeautifulSoup(res.text, "html.parser")
    title = (soup.title.string if soup.title and soup.title.string else "").strip()[:90]
    n_jsonld = len(soup.find_all("script", type="application/ld+json"))
    n_links = len(soup.find_all("a", href=True))
    n_head = len(soup.select("h1,h2,h3"))
    n_cards = len(soup.select("[class*='event'],[class*='veranstaltung'],[class*='teaser'],[class*='card'],[class*='item']"))
    print(f"  title='{title}'")
    print(f"  jsonld={n_jsonld} links={n_links} headings={n_head} card-like={n_cards}")
    samples = [h.get_text(strip=True) for h in soup.select("h1,h2,h3") if h.get_text(strip=True)]
    for s in samples[:12]:
        print(f"    H: {s[:80]}")
    low = res.text.lower()
    for marker in ("nur einen moment", "einen moment bitte", "just a moment",
                   "cf-browser-verification", "enable javascript", "captcha"):
        if marker in low:
            print(f"  ⚠️  mögliche JS-/Bot-Challenge erkannt: '{marker}'")
            break


if __name__ == "__main__":
    for u in URLS:
        probe(u)
    print("\nFertig.")
