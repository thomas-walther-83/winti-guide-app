#!/usr/bin/env python3
"""Temporäres Diagnose-Tool für die Event-Quellen von phase2.

Läuft auf dem GitHub-Runner (voller Internetzugang) und schreibt die echte
Seitenstruktur jeder Quelle ins Log, damit die Selektoren in
winti_import_phase2.py gezielt repariert werden können.

NICHT für den Dauerbetrieb gedacht – wird nach der Reparatur wieder entfernt.
Schreibt NICHTS in die Datenbank.
"""

import json
import re
from collections import Counter

import requests
from bs4 import BeautifulSoup

PROJECT_UA = "WintiGuide/1.0 (Stadtführer-App Winterthur; kontakt@wintiGuide.ch)"
BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)

SOURCES = {
    "winterthur.com": ["https://en.winterthur.com/events", "https://de.winterthur.com/veranstaltungen"],
    "myswitzerland": ["https://www.myswitzerland.com/de-ch/erlebnisse/veranstaltungen/veranstaltungen-suche/-/winterthur/"],
    "altekaserne": ["https://www.altekaserne.ch/programm"],
    "stadttheater": ["https://www.stadttheater-winterthur.ch/spielplan", "https://www.stadttheater-winterthur.ch"],
    "casinotheater": ["https://www.casinotheater.ch/programm", "https://www.casinotheater.ch"],
    "fotomuseum": ["https://www.fotomuseum.ch/de/calendar/", "https://www.fotomuseum.ch"],
    "technorama": ["https://www.technorama.ch/de/erlebnis/veranstaltungen", "https://www.technorama.ch"],
    "kunsthalle": ["https://kunsthallewinterthur.ch/ausstellungen/", "https://kunsthallewinterthur.ch"],
    "stadt.winterthur": ["https://stadt.winterthur.ch/themen/leben-in-winterthur/veranstaltungen", "https://stadt.winterthur.ch"],
}

CANDIDATE_SELECTORS = [
    "article", "li.event", ".event", ".events", ".veranstaltung", ".veranstaltungen",
    "[class*=event]", "[class*=veranstaltung]", "[class*=Event]", ".teaser", ".card",
    ".programm-item", ".program-item", ".list-item", ".item", "tr",
]


def fetch(url, ua):
    try:
        r = requests.get(url, headers={"User-Agent": ua}, timeout=20, allow_redirects=True)
        return r
    except Exception as e:  # noqa: BLE001
        return e


def jsonld_event_count(soup):
    total, events = 0, 0
    for tag in soup.find_all("script", attrs={"type": "application/ld+json"}):
        total += 1
        raw = tag.string or tag.get_text() or ""
        if '"Event"' in raw or "'Event'" in raw or "Event" in raw:
            try:
                data = json.loads(raw)
                items = data if isinstance(data, list) else [data]
                for it in items:
                    t = str(it.get("@type", "")) if isinstance(it, dict) else ""
                    if "Event" in t:
                        events += 1
                    g = it.get("@graph") if isinstance(it, dict) else None
                    if isinstance(g, list):
                        events += sum(1 for x in g if isinstance(x, dict) and "Event" in str(x.get("@type", "")))
            except Exception:  # noqa: BLE001
                if "Event" in raw:
                    events += raw.count('"Event"')
    return total, events


def diag_source(name, urls):
    print(f"\n{'='*64}\n📂 {name}\n{'='*64}")
    for url in urls:
        # UA-Vergleich
        rp = fetch(url, PROJECT_UA)
        rb = fetch(url, BROWSER_UA)
        sp = rp.status_code if isinstance(rp, requests.Response) else f"ERR({type(rp).__name__})"
        sb = rb.status_code if isinstance(rb, requests.Response) else f"ERR({type(rb).__name__})"
        print(f"\n  URL: {url}")
        print(f"    Status  ProjektUA={sp}  BrowserUA={sb}")
        r = rb if isinstance(rb, requests.Response) and rb.ok else (rp if isinstance(rp, requests.Response) else None)
        if r is None or not r.ok:
            print("    → nicht abrufbar, nächste URL")
            continue
        print(f"    final_url={r.url}")
        print(f"    content-type={r.headers.get('content-type','?')}  len={len(r.text)}")
        soup = BeautifulSoup(r.text, "html.parser")
        ld_total, ld_events = jsonld_event_count(soup)
        print(f"    JSON-LD-Blöcke={ld_total}  davon Event-Objekte≈{ld_events}")
        # Kandidaten-Container
        hits = []
        for sel in CANDIDATE_SELECTORS:
            try:
                n = len(soup.select(sel))
            except Exception:  # noqa: BLE001
                n = 0
            if n:
                hits.append((sel, n))
        hits.sort(key=lambda x: -x[1])
        print(f"    Kandidaten: {', '.join(f'{s}={n}' for s, n in hits[:10]) or 'keine'}")
        # häufigste class-Tokens auf Elementen mit Datum/Zeit-Hinweis
        classes = Counter()
        for el in soup.find_all(class_=True):
            txt = el.get_text(" ", strip=True)[:120].lower()
            if re.search(r"\b\d{1,2}\.\s?(jan|feb|mär|apr|mai|jun|jul|aug|sep|okt|nov|dez)", txt) or \
               re.search(r"\b\d{1,2}:\d{2}\b", txt):
                for c in (el.get("class") or []):
                    classes[c] += 1
        if classes:
            print(f"    class-Tokens nahe Datum/Zeit: {', '.join(f'{c}={n}' for c, n in classes.most_common(8))}")
        # Sample erstes <article> oder bester Kandidat
        best = hits[0][0] if hits else "article"
        sample = soup.select_one(best)
        if sample:
            cls = ".".join(sample.get("class") or [])
            link = sample.find("a", href=True)
            print(f"    Sample[{best}] tag={sample.name} class='{cls}'")
            print(f"      text='{sample.get_text(' ', strip=True)[:140]}'")
            if link:
                print(f"      link='{link['href'][:120]}'")


def main():
    print("🔍 Event-Quellen-Diagnose")
    for name, urls in SOURCES.items():
        try:
            diag_source(name, urls)
        except Exception as e:  # noqa: BLE001
            print(f"  ❌ {name}: {type(e).__name__}: {e}")
    print("\n✅ Diagnose fertig")


if __name__ == "__main__":
    main()
