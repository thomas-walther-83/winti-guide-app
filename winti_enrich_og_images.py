#!/usr/bin/env python3
"""
og:image-Backfill für Listings — V2 mit Heuristik-Filtern und Subseiten.

Verbesserungen gegenüber V1:
  * Filtert Logos/Icons/Favicons/Thumbnails per Pfad-Heuristik raus.
  * Besucht zusätzlich gallery-affine Subseiten (/galerie, /bilder,
    /restaurant, /fotos), wenn vorhanden, um echte Location-Fotos
    statt nur des Site-Hero-Banners zu finden.
  * Wenn am Ende **keine** brauchbaren Bilder übrig sind, wird das
    Listing auf die deterministischen Picsum-Platzhalter zurückgesetzt
    – sauberer Zustand statt "irgendein Logo".
  * Admin-Edits (image_urls mit fremder Domain wie Unsplash etc.)
    werden NICHT überschrieben.

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
from urllib.parse import urljoin, urlparse

import requests

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://dphhqwisluirihmahyee.supabase.co").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
DEBUG = os.environ.get("DEBUG", "0") == "1"
CAP = int(os.environ.get("CAP") or "500")
MAX_IMAGES = 5

UA = "Mozilla/5.0 (compatible; WintiGuideBot/1.0; +https://winti-guide.app)"
HEADERS = {
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "de-CH,de;q=0.9,en;q=0.7",
}

# Subseiten, die für Location-Fotos lohnen könnten (Reihenfolge = Priorität).
GALLERY_SUBPAGES = [
    "galerie", "gallery", "bilder", "fotos", "photos",
    "restaurant", "essen", "kueche", "menu",
    "ueber-uns", "about",
]
# Wie viele Subseiten pro Listing maximal angefragt werden.
MAX_SUBPAGES = 2

# Pfad-Pattern, das auf echten Müll hinweist (Favicons, UI-Icons, Tracking).
# WICHTIG: Logos sind ERWÜNSCHT (oft das og:image und das erste, beste Bild
# einer Location) und werden daher NICHT gefiltert.
JUNK_RE = re.compile(
    r"""(?:^|/)(?:
        favicon | apple-touch-icon | mstile | android-chrome |
        sprite | spinner | loader | placeholder | pixel |
        share[-_]?(?:button|icon)? | social[-_]?(?:button|icon)? |
        btn[-_] | menu[-_]?icon | arrow[-_] | chevron[-_]
    )""",
    re.IGNORECASE | re.VERBOSE,
)
# Sehr kleine Bild-Dimensionen im Filename (<= 64px) → Icons/Pixel.
TINY_DIMS_RE = re.compile(
    r"-(?:[0-9]|[1-5][0-9]|6[0-4])x(?:[0-9]|[1-5][0-9]|6[0-4])\.(?:jpe?g|png|webp|gif)",
    re.IGNORECASE,
)

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
    """Liest alle aktiven Listings mit Website."""
    params = {
        "select": "id,source_id,name,website,image_url,image_urls",
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


def ensure_https(url: str) -> str:
    url = (url or "").strip()
    if not url:
        return ""
    if not url.startswith(("http://", "https://")):
        return "https://" + url
    return url


def site_host(url: str) -> str:
    try:
        return urlparse(url).netloc.lower().replace("www.", "")
    except Exception:
        return ""


def needs_enrichment(l: dict) -> bool:
    """True, wenn das Listing sich für Re-Scrape lohnt:
      - leeres image_urls, oder
      - nur Picsum-Platzhalter, oder
      - sämtliche image_urls liegen auf der Listing-eigenen Domain
        (d. h. wahrscheinlich vom V1-Scraper gesetzt, nicht vom Admin
        aus externer Quelle wie Unsplash).
    """
    if not (l.get("website") or "").strip():
        return False
    urls = [u for u in (l.get("image_urls") or []) if u]
    if not urls:
        return True
    if all("picsum.photos" in u for u in urls):
        return True
    own = site_host(ensure_https(l["website"]))
    if not own:
        return False
    return all(site_host(u).endswith(own) or own.endswith(site_host(u)) for u in urls if u)


def absify(url: str, base_url: str) -> str:
    url = (url or "").strip()
    if not url:
        return ""
    if url.startswith("//"):
        return "https:" + url
    if url.startswith("http"):
        return url
    return urljoin(base_url, url)


def is_low_quality(url: str) -> bool:
    """True nur für echten Müll (Favicons, UI-Icons, Tracking-Pixel).
    Logos und Brand-Bilder gelten als brauchbar und bleiben erhalten.
    """
    path = urlparse(url).path.lower()
    if JUNK_RE.search(path):
        return True
    if TINY_DIMS_RE.search(path):
        return True
    if path.endswith((".ico",)):
        return True
    if "spritesheet" in path or path.endswith("/icons.png"):
        return True
    return False


def extract_images(html: str, base_url: str) -> list[str]:
    """Sammelt Bild-URLs aus einer HTML-Seite (Open Graph, Twitter Cards,
    JSON-LD, <link rel="image_src">). Liefert nur „brauchbare" Kandidaten
    – Logos, Favicons, Thumbnail-Suffixe und SVGs sind raus.
    """
    if not html:
        return []
    urls: list[str] = []

    def add(u: str) -> None:
        u = absify(u, base_url)
        if not u or not u.startswith("http"):
            return
        if len(u) > 500:
            return
        if is_low_quality(u):
            return
        if u in urls:
            return
        urls.append(u)

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

    tw_pat = re.compile(
        r'<meta[^>]+?name=["\']twitter:image(?::src)?["\'][^>]+?content=["\']([^"\']+)["\']',
        re.IGNORECASE,
    )
    for m in tw_pat.finditer(html):
        add(m.group(1))

    link_pat = re.compile(
        r'<link[^>]+?rel=["\']image_src["\'][^>]+?href=["\']([^"\']+)["\']',
        re.IGNORECASE,
    )
    for m in link_pat.finditer(html):
        add(m.group(1))

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

    return urls


# Connect-/Read-Timeout getrennt: tote Hosts geben nach 4 s Connect auf,
# statt lange am Read zu hängen. Spart bei nicht-erreichbaren Sites massiv Zeit.
TIMEOUT = (4, 6)


def gather_from_site(site_url: str, debug_label: str = "") -> list[str]:
    """Holt Bilder von der Hauptseite + bis zu MAX_SUBPAGES Subseiten.

    Wenn die Homepage gar nicht erreichbar ist (Connection-Fehler / Timeout),
    werden KEINE Subseiten mehr versucht – das verhindert, dass tote Hosts
    jeweils 3× ins Timeout laufen.
    """
    images: list[str] = []
    home_reachable = False
    try:
        res = requests.get(site_url, headers=HEADERS, timeout=TIMEOUT, allow_redirects=True)
        home_reachable = True
        if res.status_code == 200:
            images.extend(extract_images(res.text, res.url))
            if DEBUG:
                print(f"      home → {len(images)} Bilder")
    except Exception as e:
        if DEBUG:
            print(f"      home unerreichbar: {str(e)[:50]}")

    # Tote Homepage → Subseiten überspringen (spart 2 weitere Timeouts).
    if not home_reachable:
        return []

    parsed = urlparse(site_url)
    if parsed.scheme and parsed.netloc:
        base = f"{parsed.scheme}://{parsed.netloc}"
        tried = 0
        for sub in GALLERY_SUBPAGES:
            if tried >= MAX_SUBPAGES:
                break
            if len(images) >= MAX_IMAGES * 2:
                break
            url = f"{base}/{sub}"
            try:
                r = requests.get(url, headers=HEADERS, timeout=TIMEOUT, allow_redirects=True)
            except Exception:
                continue
            tried += 1
            if r.status_code != 200:
                continue
            before = len(images)
            for u in extract_images(r.text, r.url):
                if u not in images:
                    images.append(u)
            gained = len(images) - before
            if DEBUG and gained:
                print(f"      /{sub} → +{gained} Bilder")
            time.sleep(0.1)

    return images[:MAX_IMAGES]


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
    print(f"  og:image-Backfill V3 (CAP={CAP}, DEBUG={DEBUG})")
    print("═" * 60)

    listings = fetch_listings()
    candidates = [l for l in listings if needs_enrichment(l)]
    print(f"📋 {len(listings)} aktive Listings · {len(candidates)} brauchen Anreicherung")

    if not candidates:
        print("✅ Alles bereits angereichert – nichts zu tun.")
        return 0

    target = candidates[:CAP]
    n_good = 0
    n_cleared = 0
    n_failed = 0
    n_imgs = 0

    for i, l in enumerate(target):
        site = ensure_https(l.get("website") or "")
        if not site:
            n_failed += 1
            continue
        if DEBUG:
            print(f"  • {l['name'][:40]:40s}  ({site[:70]})")
        try:
            imgs = gather_from_site(site, l["name"])
        except Exception as e:
            if DEBUG:
                print(f"    ⚠️  {str(e)[:80]}")
            n_failed += 1
            time.sleep(0.15)
            continue

        if imgs:
            # og:image (oft das Logo) ist imgs[0] → wird als erstes gezeigt,
            # weitere echte Bilder von Subseiten folgen.
            ok = patch_listing(l["id"], {"image_urls": imgs, "image_url": imgs[0]})
            if ok:
                n_good += 1
                n_imgs += len(imgs)
                if DEBUG:
                    print(f"    ✓ {len(imgs)} Bilder (1. = {imgs[0][:60]})")
            else:
                n_failed += 1
        else:
            # Keine Bilder → leeren statt Fake-Stockfoto. Die App zeigt dann
            # den farbigen Kategorie-Block (sauberer Fallback im Frontend).
            ok = patch_listing(l["id"], {"image_urls": [], "image_url": ""})
            if ok:
                n_cleared += 1
                if DEBUG:
                    print(f"    ∅ kein Bild → geleert (Kategorie-Block)")
            else:
                n_failed += 1

        time.sleep(0.15)
        if (i + 1) % 30 == 0:
            print(f"  ⏱  Fortschritt: {i + 1}/{len(target)} · gut={n_good} · leer={n_cleared} · fail={n_failed}")

    print()
    print("═" * 60)
    print(f"  ✅ {n_good} Listings mit echten Bildern/Logos ({n_imgs} URLs gesamt)")
    print(f"  ⬜ {n_cleared} Listings geleert → Kategorie-Block (kein Bild verfügbar)")
    print(f"  ⚠️  {n_failed} Fehlversuche (HTTP/Timeout/PATCH-Fehler)")
    print("═" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
