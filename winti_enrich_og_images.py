#!/usr/bin/env python3
"""
og:image-Backfill für Listings.

Liest alle aktiven Listings mit Website, deren `image_urls` noch leer
oder nur Picsum-Platzhalter enthält, lädt die Startseite, extrahiert
echte Bilder (og:image, og:image:secure_url, twitter:image und JSON-LD
`image`) und schreibt sie als Array zurück. Bestehende, redaktionell
gepflegte Bilder bleiben unangetastet.

Voraussetzungen (Umgebungsvariablen):
  SUPABASE_URL  – Projekt-URL
  SUPABASE_KEY  – Service-Role-Key (umgeht RLS)

Optional:
  CAP           – max. Listings pro Lauf (Default 500)
  DEBUG         – '1' → Per-Listing-Logs
"""
import json
import os
import re
import sys
import time
from urllib.parse import urljoin

import requests

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://dphhqwisluirihmahyee.supabase.co").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
DEBUG = os.environ.get("DEBUG", "0") == "1"
CAP = int(os.environ.get("CAP", "500"))
MAX_IMAGES = 5

UA = "Mozilla/5.0 (compatible; WintiGuideBot/1.0; +https://winti-guide.app)"
HEADERS = {
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "de-CH,de;q=0.9,en;q=0.7",
}

if not SUPABASE_KEY:
    print("❌ SUPABASE_KEY (service-role) fehlt – bitte als Umgebungsvariable setzen.", file=sys.stderr)
    sys.exit(1)


def sb_headers(extra: dict | None = None) -> dict:
    h = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    if extra:
        h.update(extra)
    return h


def fetch_listings() -> list[dict]:
    """Liest alle aktiven Listings mit Website und den für die Analyse nötigen Feldern."""
    params = {
        "select": "id,name,website,image_url,image_urls",
        "is_active": "eq.true",
        "website": "not.is.null",
        "order": "name",
    }
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/listings",
        headers=sb_headers(),
        params=params,
        timeout=30,
    )
    if r.status_code != 200:
        print(f"❌ Listings-Fetch fehlgeschlagen: {r.status_code} {r.text[:200]}", file=sys.stderr)
        sys.exit(1)
    return r.json()


def needs_enrichment(l: dict) -> bool:
    if not (l.get("website") or "").strip():
        return False
    urls = l.get("image_urls") or []
    if not urls:
        return True
    # Nur Picsum-Platzhalter? Dann durch echte Bilder ersetzen.
    if all("picsum.photos" in (u or "") for u in urls):
        return True
    return False


def absify(url: str, base_url: str) -> str:
    url = (url or "").strip()
    if not url:
        return ""
    if url.startswith("//"):
        return "https:" + url
    if url.startswith("http"):
        return url
    return urljoin(base_url, url)


def extract_images(html: str, base_url: str) -> list[str]:
    """Sammelt Bild-URLs aus einer HTML-Seite (Open Graph, Twitter Cards, JSON-LD)."""
    if not html:
        return []
    urls: list[str] = []

    def add(u: str) -> None:
        u = absify(u, base_url)
        if not u:
            return
        if not u.startswith("http"):
            return
        if u.lower().endswith(".svg"):
            return
        if u in urls:
            return
        # Längen-Sanity (sehr lange Daten-URLs / falsche Treffer rausfiltern)
        if len(u) > 500:
            return
        urls.append(u)

    # Open Graph (mehrere möglich) – beide Attribut-Reihenfolgen
    og_pat_a = re.compile(
        r'<meta[^>]+?property=["\']og:image(?::url|:secure_url)?["\'][^>]+?content=["\']([^"\']+)["\']',
        re.IGNORECASE,
    )
    og_pat_b = re.compile(
        r'<meta[^>]+?content=["\']([^"\']+)["\'][^>]+?property=["\']og:image(?::url|:secure_url)?["\']',
        re.IGNORECASE,
    )
    for pat in (og_pat_a, og_pat_b):
        for m in pat.finditer(html):
            add(m.group(1))

    # Twitter Card
    tw_pat = re.compile(
        r'<meta[^>]+?name=["\']twitter:image(?::src)?["\'][^>]+?content=["\']([^"\']+)["\']',
        re.IGNORECASE,
    )
    for m in tw_pat.finditer(html):
        add(m.group(1))

    # JSON-LD image (String, Liste, Objekt)
    ld_pat = re.compile(
        r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        re.IGNORECASE | re.DOTALL,
    )
    for m in ld_pat.finditer(html):
        raw = m.group(1).strip()
        try:
            data = json.loads(raw)
        except Exception:
            continue
        nodes = data if isinstance(data, list) else [data]
        # @graph einsammeln
        flat: list = []
        for n in nodes:
            if isinstance(n, dict) and isinstance(n.get("@graph"), list):
                flat.extend(n["@graph"])
            else:
                flat.append(n)
        for node in flat:
            if not isinstance(node, dict):
                continue
            img = node.get("image")
            candidates = []
            if isinstance(img, str):
                candidates = [img]
            elif isinstance(img, list):
                candidates = img
            elif isinstance(img, dict):
                candidates = [img.get("url") or img.get("@id") or img.get("contentUrl")]
            for c in candidates:
                if isinstance(c, dict):
                    c = c.get("url") or c.get("@id") or c.get("contentUrl")
                if isinstance(c, str):
                    add(c)

    return urls[:MAX_IMAGES]


def patch_listing(listing_id: str, body: dict) -> bool:
    r = requests.patch(
        f"{SUPABASE_URL}/rest/v1/listings",
        headers=sb_headers({"Prefer": "return=minimal"}),
        params={"id": f"eq.{listing_id}"},
        json=body,
        timeout=15,
    )
    if r.status_code not in (200, 204):
        if DEBUG:
            print(f"  ⚠️  PATCH {r.status_code} {r.text[:160]}")
        return False
    return True


def main() -> int:
    print("═" * 60)
    print(f"  og:image-Backfill (CAP={CAP}, DEBUG={DEBUG})")
    print("═" * 60)

    listings = fetch_listings()
    candidates = [l for l in listings if needs_enrichment(l)]
    print(f"📋 {len(listings)} aktive Listings · {len(candidates)} brauchen Anreicherung")

    if not candidates:
        print("✅ Alles bereits angereichert – nichts zu tun.")
        return 0

    target = candidates[:CAP]
    n_ok = 0
    n_fail = 0
    n_imgs = 0

    for i, l in enumerate(target):
        site = (l.get("website") or "").strip()
        if not site.startswith(("http://", "https://")):
            site = "https://" + site
        try:
            res = requests.get(site, headers=HEADERS, timeout=8, allow_redirects=True)
            if res.status_code != 200:
                if DEBUG:
                    print(f"  ⚠️  HTTP {res.status_code} @ {site[:70]}")
                n_fail += 1
                continue
            imgs = extract_images(res.text, site)
            if not imgs:
                if DEBUG:
                    print(f"  ∅ keine Bilder @ {site[:70]}")
                n_fail += 1
                continue
            ok = patch_listing(l["id"], {"image_urls": imgs, "image_url": imgs[0]})
            if ok:
                n_ok += 1
                n_imgs += len(imgs)
                if DEBUG:
                    print(f"  ✓ {l['name'][:40]:40s} · {len(imgs)} Bilder")
            else:
                n_fail += 1
        except Exception as e:
            if DEBUG:
                print(f"  ⚠️  {site[:60]}: {str(e)[:90]}")
            n_fail += 1
        time.sleep(0.15)  # netter Web-Crawler
        if (i + 1) % 50 == 0:
            print(f"  ⏱  Fortschritt: {i + 1}/{len(target)} · ok={n_ok} · fail={n_fail}")

    print()
    print("═" * 60)
    print(f"  ✅ {n_ok} Listings angereichert ({n_imgs} Bild-URLs gesamt)")
    print(f"  ∅  {n_fail} ohne Bild (HTTP-Fehler, og:image fehlt, Timeout …)")
    print("═" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
