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

# Pfad-Pattern, das auf Logos/Icons/Favicons hinweist.
LOGO_RE = re.compile(
    r"""(?:^|/)(?:
        logo[-_.] | brand[-_.] | favicon | apple-touch-icon |
        icon[-_]?\d* | sprite | spinner | loader | placeholder |
        share[-_]?(?:button|icon)? | social[-_]?(?:button|icon)? |
        btn[-_] | menu[-_]?icon
    )""",
    re.IGNORECASE | re.VERBOSE,
)
# Kleine Bild-Dimensionen im Filename → meistens Thumbnails / Icons.
SMALL_DIMS_RE = re.compile(
    r"-\d{1,3}x\d{1,3}\.(?:jpe?g|png|webp|gif)",
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
    path = urlparse(url).path.lower()
    if LOGO_RE.search(path):
        return True
    if SMALL_DIMS_RE.search(path):
        return True
    if path.endswith((".gif", ".svg", ".ico")):
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


def gather_from_site(site_url: str, debug_label: str = "") -> list[str]:
    """Holt Bilder von der Hauptseite + bis zu MAX_SUBPAGES Subseiten."""
    images: list[str] = []
    try:
        res = requests.get(site_url, headers=HEADERS, timeout=8, allow_redirects=True)
        if res.status_code == 200:
            images.extend(extract_images(res.text, res.url))
            if DEBUG:
                print(f"      home → {len(images)} Bilder")
    except Exception as e:
        if DEBUG:
            print(f"      home: {str(e)[:60]}")

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
                r = requests.get(url, headers=HEADERS, timeout=6, allow_redirects=True)
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
            time.sleep(0.15)

    return images[:MAX_IMAGES]


def picsum_for(listing: dict) -> list[str]:
    seed = listing.get("source_id") or listing.get("id") or "x"
    return [
        f"https://picsum.photos/seed/{seed}/1200/800",
        f"https://picsum.photos/seed/{seed}-b/1200/800",
    ]


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
    print(f"  og:image-Backfill V2 (CAP={CAP}, DEBUG={DEBUG})")
    print("═" * 60)

    listings = fetch_listings()
    candidates = [l for l in listings if needs_enrichment(l)]
    print(f"📋 {len(listings)} aktive Listings · {len(candidates)} brauchen Anreicherung")

    if not candidates:
        print("✅ Alles bereits angereichert – nichts zu tun.")
        return 0

    target = candidates[:CAP]
    n_good = 0
    n_picsum = 0
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
            ok = patch_listing(l["id"], {"image_urls": imgs, "image_url": imgs[0]})
            if ok:
                n_good += 1
                n_imgs += len(imgs)
                if DEBUG:
                    print(f"    ✓ {len(imgs)} Bilder behalten")
            else:
                n_failed += 1
        else:
            # Keine qualitativen Bilder → Picsum-Platzhalter (sauberer Zustand)
            picsum = picsum_for(l)
            ok = patch_listing(l["id"], {"image_urls": picsum, "image_url": ""})
            if ok:
                n_picsum += 1
                if DEBUG:
                    print(f"    ∅ nichts gefunden → zurück auf Picsum")
            else:
                n_failed += 1

        time.sleep(0.15)
        if (i + 1) % 30 == 0:
            print(f"  ⏱  Fortschritt: {i + 1}/{len(target)} · gut={n_good} · picsum={n_picsum} · fail={n_failed}")

    print()
    print("═" * 60)
    print(f"  ✅ {n_good} Listings mit echten Bildern ({n_imgs} URLs gesamt)")
    print(f"  ↩  {n_picsum} Listings auf Picsum zurückgesetzt (keine guten Bilder)")
    print(f"  ⚠️  {n_failed} Fehlversuche (HTTP/Timeout/PATCH-Fehler)")
    print("═" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
