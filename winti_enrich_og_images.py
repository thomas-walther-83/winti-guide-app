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
FORCE = os.environ.get("FORCE", "0") == "1"
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


SKIP_REASON: dict[str, str] = {}


def _same_or_subdomain(a: str, b: str) -> bool:
    """True wenn a und b dieselbe registrierbare Domain teilen.
    `cdn.boilerroom.ch` und `boilerroom.ch` zählen als gleich.
    Sehr simple Heuristik (kein PSL), reicht aber für unsere Daten.
    """
    if not a or not b:
        return False
    if a == b:
        return True
    # Letzte 2 Labels vergleichen (boilerroom.ch == cdn.boilerroom.ch)
    pa = a.split(".")
    pb = b.split(".")
    if len(pa) < 2 or len(pb) < 2:
        return False
    return pa[-2:] == pb[-2:]


# Hosts, die typische Admin-/Externe-Bildquellen sind (= NICHT enrichen).
# Eine URL aus einer dieser Domains wird als „bewusst gesetzt" gewertet.
TRUSTED_EXTERNAL_HOSTS = (
    "unsplash.com",
    "images.unsplash.com",
    "pexels.com",
    "wikimedia.org",
    "wikipedia.org",
    "drive.google.com",
    "imgur.com",
    "i.imgur.com",
    "cloudinary.com",
    "imagekit.io",
)

# CMS-/Site-Builder-CDNs: dort liegen Bilder oft tatsächlich zur Site
# gehörend (Wix, Shopify, Squarespace, …). Werden als „self-hosted-ähnlich"
# gewertet und sind daher für ein Re-Enrichment offen, falls aktuell nur
# eine solche URL drin ist.
CMS_CDN_HOSTS = (
    "wixstatic.com",
    "shopify.com",
    "shopifycdn.com",
    "squarespace-cdn.com",
    "squarespace.com",
    "webflow.com",
    "website-files.com",
    "wpengine.com",
    "wp.com",
    "jimdo.com",
    "duda.co",
    "jimdo-storage.global.ssl.fastly.net",
)

# Hosts, die fast immer Müll für unsere Listings liefern (Avatare,
# Profilbilder, Tracking). Werden beim Scrapen als low-quality verworfen.
LOW_QUALITY_HOSTS = (
    "gravatar.com",
    "secure.gravatar.com",
    "0.gravatar.com",
    "1.gravatar.com",
    "2.gravatar.com",
    "facebook.com/tr",
    "googletagmanager.com",
    "doubleclick.net",
)


def needs_enrichment(l: dict) -> bool:
    """True, wenn das Listing sich für Re-Scrape lohnt.

    Lockerer als V2: registrierbare Domain wird verglichen, Subdomains
    der eigenen Site (cdn.x.ch ↔ x.ch) zählen als self-hosted. Nur
    URLs von explizit „vertrauten" externen Hosts (Unsplash, Wikimedia
    etc.) gelten als bewusst gesetzte Admin-Edits und werden geschont.
    """
    name = l.get("name", "")
    if not (l.get("website") or "").strip():
        SKIP_REASON[name] = "keine website"
        return False
    urls = [u for u in (l.get("image_urls") or []) if u]
    if not urls:
        return True
    if all("picsum.photos" in u for u in urls):
        return True
    # Externe vertrauenswürdige Quelle vorhanden → schützen
    for u in urls:
        h = site_host(u)
        if _host_matches(h, TRUSTED_EXTERNAL_HOSTS):
            SKIP_REASON[name] = f"externe Quelle {h}"
            return False
    own = site_host(ensure_https(l["website"]))
    if not own:
        SKIP_REASON[name] = "website hat keinen host"
        return False
    # „Self-hosted-ähnlich": eigene (Sub-)Domain ODER bekannte CMS-CDN
    # ODER Müll-Host (Gravatar etc., den wir loswerden wollen).
    def looks_self_hosted(u: str) -> bool:
        h = site_host(u)
        if _same_or_subdomain(h, own):
            return True
        if _host_matches(h, CMS_CDN_HOSTS):
            return True
        if _host_matches(h, LOW_QUALITY_HOSTS):
            return True
        return False

    if all(looks_self_hosted(u) for u in urls if u):
        return True
    foreign = next((u for u in urls if not looks_self_hosted(u)), "")
    SKIP_REASON[name] = f"fremde URL ohne trusted host: {foreign[:80]}"
    return False


def absify(url: str, base_url: str) -> str:
    url = (url or "").strip()
    if not url:
        return ""
    # Fragment abschneiden: URLs wie "https://x.ch/#logo" sind Anker auf
    # Seiten-Elemente, keine ladbaren Bild-Dateien (Boilerroom-Fall).
    url = url.split("#", 1)[0]
    if not url:
        return ""
    if url.startswith("//"):
        return "https:" + url
    if url.startswith("http"):
        return url
    return urljoin(base_url, url)


def _host_matches(host: str, host_list: tuple[str, ...]) -> bool:
    return any(host == h or host.endswith("." + h) for h in host_list)


def is_low_quality(url: str) -> bool:
    """True nur für echten Müll (Favicons, UI-Icons, Tracking-Pixel,
    Gravatare). Logos und Brand-Bilder gelten als brauchbar.
    """
    p = urlparse(url)
    path = p.path.lower()
    host = p.netloc.lower()
    # Leerer/Root-Pfad = die Seite selbst (z. B. nach Fragment-Strip von
    # "https://x.ch/#logo"), keine Bild-Datei.
    if path in ("", "/"):
        return True
    if _host_matches(host, LOW_QUALITY_HOSTS):
        return True
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
    print(f"  og:image-Backfill V3 (CAP={CAP}, DEBUG={DEBUG}, FORCE={FORCE})")
    print("═" * 60)

    listings = fetch_listings()
    if FORCE:
        # Force-Modus: ALLE Listings mit Website werden neu enricht, egal
        # was aktuell in image_urls steht. Admin-Edits gehen ggf. verloren.
        candidates = [l for l in listings if (l.get("website") or "").strip()]
    else:
        candidates = [l for l in listings if needs_enrichment(l)]
    print(f"📋 {len(listings)} aktive Listings · {len(candidates)} brauchen Anreicherung")
    if DEBUG and SKIP_REASON and not FORCE:
        print(f"⏭  {len(SKIP_REASON)} übersprungene Listings:")
        for name, reason in sorted(SKIP_REASON.items())[:60]:
            print(f"    {name[:42]:42s}  ← {reason[:80]}")
        if len(SKIP_REASON) > 60:
            print(f"    … (+{len(SKIP_REASON)-60} weitere)")

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
