# Winti Guide – Design & Look-and-Feel Optimierung

> Branchen-Benchmark: Spotted by Locals, Like a Local, Visit-City-Apps, Komoot,
> Tripadvisor, offizielle Tourismus-Apps. Fokus: visuelle Wertigkeit, Conversion,
> Accessibility (WCAG 2.1 AA, Apple HIG, Material 3).

## 0. Aktuelle Design-Sprache (Ist)

- **Farbe:** Monochrom-Rot (`primary #CC0000`, dazu `#990000`/`#E50000`) auf Weiß,
  Surface `#F8F8F8` (`theme.ts:2-22`). Sehr „signalrot", wenig Tourismus-Wärme.
- **Typografie:** Systemfont, Skala 11/12/14/18/24, Bold-lastig (`theme.ts:38-61`).
- **Spacing:** sauberes 4er-System (4/8/16/24/32/48) – gute Basis.
- **Karten:** Listings = Emoji in farbigem 52×52-Block + Text (`ListingCard.tsx`);
  Featured/Hero = `ImageBackground` mit Farb-Fallback, **aber ohne echte Bilder**.
- **Icons:** Ionicons (gut), aber Tabs/Header mischen Emoji 🦁📅🗺️❤️👤 mit Vektor-Icons.
- **Dark Mode:** keiner.

**Kern-Befund:** Die Struktur ist solide, aber die App sieht aus wie ein *Prototyp*,
weil (a) echte Fotos fehlen und (b) ein knalliges Rot dominiert. Discovery-Apps
leben zu ~70 % vom Bild. Das ist der größte Hebel.

---

## 1. Farbpalette (konkrete Vorschläge)

Winterthur-Identität: Stadtwappen-Rot + „Eulachstadt"/Parks (Grün) + warmes Sandstein
der Altstadt-Lauben. Vorschlag einer **wärmeren, tourismustauglichen Palette**:

```ts
// theme.ts – Vorschlag
colors: {
  primary:        '#C8102E', // Winterthur-Rot, leicht entsättigt, AA auf Weiß
  primaryDark:    '#9B0E24',
  primaryLight:   '#E84860',
  accent:         '#1F7A5A', // Park-/Natur-Grün (Eulach), CTA-Sekundär
  accentWarm:     '#E8A13A', // Sandstein/Altstadt – für Highlights/Badges
  background:     '#FFFFFF',
  surface:        '#F6F4F1', // warmes Off-White statt kühlem #F8F8F8
  surfaceElevated:'#FFFFFF',
  text:           '#1A1A1A',
  textSecondary:  '#5A5A5A', // dunkler als #6B6B6B → besserer Kontrast
  textMuted:      '#8A8A8A',
  border:         '#E6E2DD',
  success:        '#1F7A5A',
  error:          '#D12030',
}
```

**Begründung:** `#CC0000` hat zwar AA, wirkt aber „Alarm". `#C8102E` bleibt markant,
ist aber edler; ein **grüner Akzent** entlastet das Dauer-Rot (heute sind Buttons,
Save-Herz, Tab-Active, Premium, Event-Datum *alle* rot → keine Hierarchie). **Erster
Schritt zwingend:** Marken-Rot zwischen `app.json` (`#8B0000`) und `theme.ts` (`#CC0000`)
vereinheitlichen.

**Dark Mode (M):** zweites Token-Set, via `useColorScheme()` umschaltbar.

```ts
dark: { background:'#121212', surface:'#1E1E1E', text:'#F2F2F2',
        textSecondary:'#B5B5B5', border:'#2C2C2C', primary:'#FF5A6E' }
```

## 2. Typo-Skala

Aktuell zu wenige Stufen, Body 14 px ist für Fließtext grenzwertig.

```ts
typography: {
  display:  { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 }, // Screen-Titel
  title:    { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 17, fontWeight: '600' },
  body:     { fontSize: 16, fontWeight: '400', lineHeight: 22 }, // 14 → 16
  bodySm:   { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  caption:  { fontSize: 13, fontWeight: '400' }, // 12 → 13
  label:    { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, textTransform:'uppercase' },
}
```

Empfehlung: optionaler Markenfont (z. B. **Inter** oder **Source Sans 3** via
`expo-font`) für Titel; `allowFontScaling` aktiv lassen und auf 2 Skalierungsstufen testen.

## 3. Spacing & Radien

4er-System beibehalten. Radien leicht vereinheitlichen: Karten konsequent `lg` (16),
Chips `full`, Buttons `md` (12). Heute mischt sich `sm`/`md`/`lg` über Komponenten.

## 4. Karten- & Listen-Design (größter visueller Hebel)

**Problem:** `ListingCard` ist ein Emoji-Block + Text – wirkt wie Platzhalter.

**Empfehlung (M):**
1. `image_url` ins `Listing`-Modell + Schema aufnehmen; Importer um Foto-Quelle
   ergänzen (winterthur.com OG-Image / Wikimedia / Partner-Upload).
2. **Listen-Karte mit Thumbnail** (72×72, `borderRadius md`) links statt Emoji-Block;
   Emoji nur als Fallback. Titel 16 px Bold, darunter `sub_type · ⭐ stars · €€`,
   dann Adresse mit Distanz („320 m"). Rechtsbündig Save-Herz (44×44).
3. **Hero/Featured** mit echtem Foto + dunklem Gradient-Overlay
   (`heroBannerOverlay` existiert bereits, `theme.ts:21`), Kategorie-Badge oben links,
   Name unten – Komoot/Spotted-Stil. 16:9, Radius `lg`.
4. **Price-Level & Rating sichtbar** machen (€/€€/€€€, Sterne) – heute ungenutzt.

```tsx
// ListingCard – Thumbnail statt Emoji-Block
{listing.image_url
  ? <Image source={{ uri: listing.image_url }} style={styles.thumb} />
  : <View style={[styles.thumb,{backgroundColor:bgColor}]}><Text>{emoji}</Text></View>}
```

## 5. Detailseite (fehlt komplett – Pflicht)

Aufbau (Branchenstandard): **Foto-Galerie (Pager)** → Titel + Rating + Kategorie-Badge
→ Quick-Actions (Route, Anrufen, Website, Teilen, Save) → Öffnungszeiten (heute
hervorgehoben „jetzt geöffnet/geschlossen") → Beschreibung → **Mini-Map** mit Marker
→ „In der Nähe"-Sektion. Diese Seite ist Voraussetzung für Sharing, Routing und Reviews.

## 6. Bildbehandlung

- Einheitliche Aspect-Ratios (Liste 1:1, Hero 16:9, Detail 4:3-Galerie).
- Lazy-Loading + Blur-Hash-Placeholder (`expo-image` statt `Image` → Caching, `contentFit`).
- Immer Gradient-Overlay unter Text auf Bildern für Kontrast (Text auf Foto = A11y-Risiko).

## 7. Empty / Loading / Error / Mikrointeraktionen

- **Loading:** Skeleton-Karten statt zentralem Spinner (`HomeScreen.tsx:282-287`) –
  wirkt schneller, reduziert Layout-Shift.
- **Empty:** bereits gut; Illustration statt Emoji wäre die Kür.
- **Mikrointeraktionen:** Save-Herz mit Scale-Bounce (`react-native-reanimated`),
  haptisches Feedback (`expo-haptics`) bei Save/Tab-Wechsel, sanfte Chip-Transition.
- **Tab-Bar:** Emoji aus `TABS` entfernen (werden eh durch Ionicons ersetzt,
  `NavigationBar.tsx:8-13`), `paddingBottom:20` durch `useSafeAreaInsets().bottom` ersetzen.

## 8. Suche & Filter

- Suche heute clientseitig nach Name/Adresse/Subtype (`HomeScreen.tsx:104-111`).
- Empfehlung: **Filter-Bottom-Sheet** (Preis, Rating, „jetzt offen", Distanz,
  „kinderfreundlich"), Sortierung (Distanz/Bewertung/Name), Suchverlauf.
- Sub-Kategorie-Chips beibehalten, aber Anzahl je Chip anzeigen („Restaurants 42").

## 9. Karten-Integration

- Marker zu **Cluster** zusammenfassen (Leaflet.markercluster) bei Zoom-out.
- „Mein Standort"-Button + „In diesem Bereich suchen".
- Custom-Marker mit Kategorie-Icon statt einfacher `circleMarker` (`MapScreen.tsx:59-66`).
- Tippen auf Marker-Popup → Detailseite (sobald Routing existiert).

## 10. Accessibility (WCAG 2.1 AA / HIG)

| Thema | Soll | Aktueller Verstoß |
|---|---|---|
| Touch-Target | ≥ 44×44 px | Chips ~31 px, Save-Button ~36 px (`ListingCard.tsx:128`) |
| Kontrast Text | ≥ 4.5:1 | `textMuted #9B9B9B` auf Weiß ≈ 2.8:1 → **fail** für 10–13 px |
| Labels | `accessibilityLabel` an allen Buttons | App-weit fehlend |
| Dynamic Type | `allowFontScaling` | nicht getestet |
| Farbe als einzige Info | nie | „Premium" nur als roter Punkt (`ListingCard.tsx:183`) → Label ergänzen |

`textMuted`/`textSecondary` abdunkeln (siehe §1), kleinste Schrift ≥ 12 px.

---

## Priorisierung (Impact / Effort)

**Quick Wins (S, < 1 Tag)**
- Marken-Rot vereinheitlichen (`app.json` ↔ `theme.ts`).
- `textMuted`/`textSecondary` abdunkeln, Mindestschrift 12 px.
- Touch-Targets ≥ 44 px, `accessibilityLabel` auf Buttons/Tabs.
- Emoji aus Tab-Bar entfernen, SafeArea-Inset statt fixem Bottom-Padding.
- Akzent-Grün einführen, Save-Herz von Premium-Rot entkoppeln (Hierarchie).

**Mittel (M, 1–2 Wochen)**
- Echte Bilder (`image_url` + `expo-image`), Listen-Thumbnails, Hero mit Foto.
- **Detailseite** (setzt React Navigation voraus).
- Skeleton-Loader, Mikrointeraktionen/Haptik.
- Dark Mode.

**Größere Umbauten (L)**
- Filter-Bottom-Sheet + serverseitige Suche/Sortierung.
- Karten-Cluster + Standort + Custom-Marker.
- Markenfont, Illustrations-Set für Empty-States.

> Roadmap-Einordnung dieser Maßnahmen siehe [`03-feature-roadmap.md`](./03-feature-roadmap.md).
