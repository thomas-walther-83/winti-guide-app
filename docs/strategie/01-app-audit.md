# Winti Guide – App-Audit (Ist-Zustand)

> Stand: 2026-06-03 · Basis: Quellcode-Analyse des Repositories `winti-guide-app`
> (React Native / Expo SDK 54, Supabase, Web-Export via GitHub Pages).

## 1. Architektur & Tech-Stack (verifiziert)

| Bereich | Befund | Quelle |
|---|---|---|
| Framework | Expo SDK ~54, React Native 0.76.7, React 18.3 | `package.json` |
| Navigation | **Eigene Tab-Steuerung per `useState`**, kein React Navigation | `App.tsx:27-82` |
| Backend | Supabase (`@supabase/supabase-js` 2.103) | `src/config/supabase.ts`, `src/services/supabaseService.ts` |
| Karte | Leaflet + OpenStreetMap im WebView (kein API-Key) | `src/screens/MapScreen.tsx:79-118` |
| Persistenz | AsyncStorage (Favoriten, Auth-Session) | `src/screens/HomeScreen.tsx:27-45` |
| Zahlungen | Stripe Payment Links (extern via `Linking.openURL`) | `src/screens/AccountScreen.tsx:62-67` |
| KI-Guide | OpenAI `gpt-4o-mini` mit Offline-Fallback | `src/services/aiGuideService.ts:137-238` |
| Mehrsprachigkeit | 4 Sprachen vorbereitet (de/en/fr/it), **aber nicht in der UI angebunden** | `src/hooks/useTranslation.ts`, `src/locales/*.json` |
| Tests | Jest + Testing Library, Hooks/Services/2 Komponenten | `src/__tests__/**` |

**Architektur-Risiko Nr. 1 – Navigation:** `App.tsx` rendert Screens über ein
`switch` auf `activeTab` (`App.tsx:48-65`). Es gibt **kein Routing, keinen Back-Stack
und keine Deep-Links**. Folgen: kein „Zurück", keine teilbaren URLs zu einem Ort/Event,
kein Detail-Screen-Push, und der `partner`-Tab ist zwar implementiert, aber in der
sichtbaren `TABS`-Liste gar nicht enthalten (`App.tsx:19-25` vs. `case 'partner'`).
Empfehlung: Migration auf **React Navigation** (Native Stack + Bottom Tabs) – Voraussetzung
für fast alle weiteren Features (Detailseiten, Sharing, Push-Deep-Links).

## 2. Informationsarchitektur & Navigationsfluss

5 sichtbare Tabs (`App.tsx:19-25`):

```
🏠 Entdecken → 📅 Kalender → 🗺️ Karte → ❤️ Gespeichert → 👤 Konto
                                                         (＋ verstecktes Partner-Portal)
```

- **Entdecken (`HomeScreen`)**: Header + Suche + Kategorie-Chips + (optional) Sub-Kategorie-Chips
  + „Empfohlen für dich"-Karussell + KI-Guide-Karte + Listing-Liste mit eingestreuten Ads
  (alle 5 Einträge, nur Free-Tier). Alles in **einer einzigen `FlatList`** über ein
  diskriminiertes `ListItem`-Union gerendert (`HomeScreen.tsx:55-197`).
- **Kalender (`CalendarScreen`)**: Events gruppiert nach Datum, Kategorie-Chips, Free-Limit 7 Tage
  mit Premium-Teaser (`CalendarScreen.tsx:54-61, 157-176`).
- **Karte (`MapScreen`)**: Leaflet-WebView, Kategorie-/Sub-Filter, Marker-Farben pro Kategorie,
  Fokus-Sprung von Listing → Karte (`MapScreen.tsx:120-205`).
- **Gespeichert (`SavedScreen`)**: lokale Favoriten, Free-Limit 5, Premium-Teaser.
- **Konto (`AccountScreen`)**: Login/Register (Supabase Auth), Premium-Upgrade-Karte, Sign-out,
  Partner-Hinweis-Box ohne klickbaren Link (`AccountScreen.tsx:178-184`).
- **Partner-Portal (`PartnerPortalScreen`)**: Self-Service (Profil, Pakete, Anzeige erstellen,
  Dashboard) – funktional, aber **nicht über die Navigation erreichbar**.

**Bruch im Flow:** Es gibt **keinen Detail-Screen**. Ein Tipp auf eine `ListingCard`
öffnet nichts; nur die Aktionsbuttons „Anrufen/Website/Auf Karte zeigen" sind aktiv
(`ListingCard.tsx:44-140`). Damit fehlt die zentrale Seite jeder Discovery-App
(Fotos, Beschreibung, Öffnungszeiten, Bewertungen, Routing, Teilen).

## 3. Content-Modell (verifiziert in `src/types/index.ts` & `supabase-schema.sql`)

- **`Listing`** (`types/index.ts:111-131`): `category` (9 feste Kategorien), `sub_type`,
  `name`, `address`, `hours`, `phone`, `website`, `stars` *(String!)*, `description`,
  `lat/lon`, `is_premium`. **Kein `image_url`, keine `tags`, keine `price_level`,
  keine strukturierten Öffnungszeiten, keine Geo-Distanz.**
- **`Event`** (`types/index.ts:133-148`): `title`, `cat` (8 Kategorien), `location`,
  `event_date`/`event_time` *(Strings)*, `price` *(String)*, `description`, `url`.
  Kein `lat/lon`, kein Listing-Bezug, kein Mehrtages-/Wiederholungs-Modell, kein Bild.
- **Partner-Schicht** (`Partner`, `PartnerSubscription`, `PartnerInvoice`, `PartnerAd`):
  vollständig modelliert inkl. Stripe-Feldern, MoSCoW-reifes B2B-Datenmodell.
- **Daten-Pipeline:** `winti_import_phase*.py` ziehen aus offiziellen Quellen –
  `winterthur.com`, `opendata.swiss`/CKAN, Eventbrite-API sowie `.ics`-Feeds von
  Gewerbemuseum, Naturmuseum, Stadtbibliothek, Alte Kaserne, Casinotheater
  (verifiziert über URLs in `winti_import_phase2.py`). Solide, aber bilderlos.

**Content-Risiko:** `stars` ist ein **freier String** und wird im KI-Service per
`parseFloat` sortiert (`aiGuideService.ts:100-105`) – fragil. Es gibt keine eigene
Bewertungs-/Review-Tabelle; „Empfohlen für dich" ist lediglich „Premium zuerst,
dann Rest, max. 6" (`HomeScreen.tsx:121-125`), also keine echte Personalisierung.

## 4. Onboarding, Leerzustände, Barrierefreiheit

- **Onboarding:** **Nicht vorhanden** (keine Treffer für `onboarding`/`welcome`).
  Erstnutzer landen direkt in der Liste, ohne Standort-/Sprach-/Interessen-Abfrage.
- **Leerzustände:** Gut gelöst und konsistent – Such-Empty (`HomeScreen.tsx:313-319`),
  Events-Empty (`CalendarScreen.tsx:129-135`), Saved-Empty (`SavedScreen.tsx:101-115`).
- **Loading/Error:** Vorhanden inkl. Retry-Buttons; Home nutzt Pull-to-Refresh.
- **Barrierefreiheit (Schwachstellen):**
  - Keine `accessibilityLabel`/`accessibilityRole` an `TouchableOpacity` (App-weit 0 Treffer).
  - Touch-Targets teils < 44 px: Save-Button-Padding `xs`=4 px, nur via `hitSlop`
    auf ~36 px erweitert (`ListingCard.tsx:128-138`); Sub-Kategorie-/Kategorie-Chips ~31 px hoch.
  - `userInterfaceStyle: "light"` fest – **kein Dark Mode** (`app.json`).
  - Splash/Theme-Color `#8B0000`, App-Primary `#CC0000` – **Markenfarbe inkonsistent**
    (`app.json` vs. `src/styles/theme.ts:3`).
  - Schrift nicht skalierbar getestet (`allowFontScaling` nirgends gesetzt); kleinste
    Texte 10–11 px (`PartnerAdBanner.tsx:60`, `theme.typography.label`).

## 5. Stärken

1. **Saubere, typisierte Codebasis** – klare Trennung Services/Hooks/Components, gute Tests.
2. **Durchdachtes Free/Premium-Gating** (Ads alle 5 Einträge, 7-Tage-Kalender, 5 Favoriten)
   inkl. überzeugender Premium-Teaser.
3. **Vollständige B2B-Partner-Infrastruktur** (Self-Service-Portal, Stripe, Impression-/
   Click-Tracking `supabaseService.ts:108-115`, Admin-Freigabe-Workflow `:207-218`).
4. **Kostenlose Karte** (OSM/Leaflet) – kein laufender Map-API-Kostenblock.
5. **KI-Guide „Thomas"** mit echtem Listings-Kontext und sauberem Offline-Fallback –
   echtes Alleinstellungsmerkmal gegenüber Spotted-by-Locals & Co.
6. **Web-Export/PWA-Weg** über GitHub Pages – Vertrieb ohne App-Store-Hürde.

## 6. Schwachstellen (priorisiert)

| # | Schwäche | Wirkung | Datei/Stelle |
|---|---|---|---|
| 1 | Kein Detail-Screen je Ort/Event | Kerninteraktion fehlt, geringe Verweildauer | `ListingCard.tsx` (kein `onPress` auf Karte) |
| 2 | Keine echten Bilder (Emoji/Farbblöcke) | Wirkt unfertig, schlechte Conversion | `ListingCard.tsx:65-68`, `HeroCard.tsx` (kein `image_url`) |
| 3 | i18n gebaut, aber nicht angebunden → de-facto nur Deutsch | Touristen ausgeschlossen | `useTranslation.ts` (0 UI-Nutzung), Screens hartkodiert |
| 4 | Kein Routing/Deep-Links/Back | Kein Sharing, kein Push-Ziel, versteckter Partner-Tab | `App.tsx:48-65` |
| 5 | Keine Geolokalisierung / „in der Nähe" | Top-Erwartung bei Touristen fehlt | keine `expo-location`-Nutzung |
| 6 | Kein Onboarding | Kein erster Aha-Moment, kein Opt-in (Push/Sprache) | – |
| 7 | Kein Dark Mode, A11y-Lücken, Touch-Targets < 44 px | App-Store-Qualität & Inklusion | `app.json`, `ListingCard.tsx:128` |
| 8 | Markenfarbe inkonsistent (`#8B0000` vs `#CC0000`) | Unprofessioneller Eindruck | `app.json` vs `theme.ts:3` |
| 9 | `stars`/`price` als String, keine Reviews/Tags | Schwache Filter & Empfehlungen | `types/index.ts:122,143` |
| 10 | Performance-Risiko: ein Mega-`useMemo` baut die ganze Home-Liste neu bei jeder Filteränderung | Ruckeln bei vielen Listings | `HomeScreen.tsx:162-197` |

## 7. Quick Wins (≤ 1 Tag)

- Markenfarbe vereinheitlichen (`#8B0000` → `#CC0000` oder umgekehrt) in `app.json`.
- `accessibilityLabel`/`accessibilityRole="button"` auf alle Tab- und Aktionsbuttons.
- Partner-Tab sichtbar/erreichbar machen oder bewusst aus dem Konto verlinken
  (`AccountScreen.tsx:178-184` mit `onPress`).
- Touch-Targets auf ≥ 44 px (Chip-`paddingVertical` 8 → 11, Save-Button-Padding erhöhen).
- `key`-Strategie der Home-Liste in eigene Memo-Slices aufteilen (Header vs. Liste).

> Detaillierte Design- und Feature-Empfehlungen siehe
> [`02-design-look-and-feel.md`](./02-design-look-and-feel.md) und
> [`03-feature-roadmap.md`](./03-feature-roadmap.md).
