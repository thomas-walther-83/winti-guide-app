# Winti Guide — Session-Handoff

Kurzer, dichter Überblick für eine **neue Session**. Stand: 2026-06-04.

## Was die App ist
Stadtführer für **Winterthur** (Expo / React Native, Web-Export → **GitHub Pages**).
Backend: **Supabase** (Listings, Events, Favoriten, Touren, app_users/Tiers).
Mehrsprachig (de/en/fr/it). Free- vs. Premium-Tier.

## Wie deployt/getestet wird
- **Web-Deploy:** Workflow `.github/workflows/deploy-pages.yml` baut bei jedem Push auf `main`
  via `npx expo export --platform web` und published auf GitHub Pages.
  Live-URL: `https://thomas-walther-83.github.io/winti-guide-app/` (Base-URL `/winti-guide-app`).
- **DB-Migrationen:** `.github/workflows/db-migrate.yml` (manuell triggern oder bei Push),
  führt `supabase/migrations/*.sql` aus (idempotent schreiben!).
- **Daten-Import (Events/Listings):** `.github/workflows/data-import.yml`
  - Events: `winti_import_phase2.py` — **alle 3 Tage** (Cron `0 3 */3 * *`).
  - Listings: `winti_import_phase1.py` — monatlich.
  - Manuell: workflow_dispatch mit input `target=events|listings|both`, optional `debug=1`.
- **Lokale Checks vor Push:** `npx tsc --noEmit` + `npx jest`. Optional `EXPO_BASE_URL=/winti-guide-app npx expo export --platform web` (Bundling prüfen).

⚠️ **Gotcha (wichtig):** Die GitHub-Actions-**Log/Status-API hängt in dieser Umgebung teils 15–20 Min**
(zeigt fertige Läufe als „in_progress", Logs 404). Läufe sind real nach ~4–5 Min fertig.
Nicht in Panik abbrechen — auf den tatsächlichen Abschluss / die echte Live-App schauen.
Außerdem: GitHub-Pages-URLs sind aus der Sandbox **nicht** abrufbar (403) → im Browser testen lassen.

## Design-System (diese Session eingeführt)
- **Editorial-Look:** Fraunces-Serif für Titel (`@expo-google-fonts/fraunces`), warme „Papier"-Palette,
  Rot nur als Akzent, Foto-Hero-Cards, größere Radien/weiche Schatten.
- **Dark Mode (app-weit):** `src/context/ThemeContext.tsx` → `useTheme()` / `useThemeMode()`.
  System/Hell/Dunkel, persistiert (AsyncStorage `winti_theme_mode`), Umschalter im Konto.
  Paletten in `src/styles/theme.ts` (`lightTheme`/`darkTheme`/`AppTheme`).
- **Muster für Theming pro Komponente** (überall so umgesetzt):
  ```tsx
  import { useTheme } from '../context/ThemeContext';
  import type { AppTheme } from '../styles/theme';
  export function X() {
    const theme = useTheme();
    const styles = useMemo(() => makeStyles(theme), [theme]);
    ...
  }
  const makeStyles = (theme: AppTheme) => StyleSheet.create({ ... });
  ```
  ⚠️ Bei FIXEN hellen Flächen (z. B. weiße Chips, Creme-Banner `#FFFBF0`) **Textfarbe fest dunkel**
  setzen (nicht `theme.colors.text`), sonst weiß-auf-weiß im Dark Mode.
- Der statische `export const theme = lightTheme` existiert nur noch für Rückwärtskompatibilität.

## Features dieser Session (alle live)
- **Entdecken (HomeScreen):** Umschalter **Foto-Karten ↔ Kompaktliste** (persist `winti_view_mode`),
  **Scroll-to-top** (`ScrollTopButton`), **„Jetzt geöffnet"-Filter** (`src/utils/openingHours.ts`, getestet).
- **Kalender (CalendarScreen):** **Monatskalender** (`MonthCalendar`) mit **von–bis-Auswahl** + Schnellfilter
  (Heute/Wochenende/Diese Woche), **Kompaktansicht-Umschalter** (`EventRow`), Scroll-to-top.
- **Detail-Dialog (DetailModal):** großer Foto-Hero mit Verlauf + Serif-Titel (Orte & Events).
- **Touren (Phase B, vorige Arbeit + diese Session):**
  - DB: `user_tours` + `tour_stops` (+ `route_waypoints jsonb`) mit RLS — Migrationen
    `supabase/migrations/20260604_user_tours.sql`, `..._tour_route.sql`.
  - Eigene Touren anlegen/verwalten, „Zur Tour hinzufügen" (`AddToTourSheet`).
  - **Karte im Tour-Modus** (`MapScreen` `focusTour`): **Fußgänger-Routing** über
    **FOSSGIS-OSRM** (`https://routing.openstreetmap.de/routed-foot/route/v1`, gratis, kein Key)
    via **Leaflet Routing Machine**. Stops fix (nummeriert), **Linie ziehen** = Zwischenpunkte,
    **grauen Punkt antippen = löschen**, Distanz + Gehzeit, eigener Standort. Gezogene Route wird
    gespeichert (`route_waypoints`), bei Stop-Änderung verworfen. Teilen + „In Google Maps öffnen".
  - **D3-Features (diese Session):**
    - **Reihenfolge optimieren** (ToursScreen `TourDetail.optimize`): Nearest-Neighbor + 2-opt.
    - **Kuratierte Touren** (`src/config/curatedTours.ts`): statisch, ohne Login sichtbar,
      Sektion „Empfohlene Touren" oben im Touren-Tab → `onShowTour` → Karte.
      ⚠️ Koordinaten sind **Näherungen** — bei Bedarf präzisieren.

## Event-Import (Stand & Quellen)
`winti_import_phase2.py`. Aktuell ~**77 Events** in DB. Quellen-Ausbeute (letzter Lauf):
- **Casinotheater 39**, **Musikkollegium 22**, **Alte Kaserne 13**, **junge-altstadt 3**,
  **coucoumagazin** (eigener Scraper `scrape_coucou`), **winterthur-tourismus.ch** (statt Stadt-Agenda).
- **Wichtiger Fix:** eigener **deutscher Datumsparser** (`parse_german_date`, „05. Juni 2026") —
  dateutil kann das nicht; davor fielen Casinotheater/Alte Kaserne fast komplett raus (25 → 77).
- Tote/blockte Quellen: winterthur.com (unreachable), myswitzerland (HTTP 406), Eventbrite
  (öffentliche Such-API 2020 abgeschaltet), stadt.winterthur Agenda (verlinkt nur → tourismus).
- Robustheit: globaler `socket.setdefaulttimeout(25)`, harter Pro-Quelle-Timeout via **SIGALRM**
  (`run_source`, `_SourceTimeout` erbt von **BaseException**), Bild-Nachladen mit Zeitbudget,
  Job-`timeout-minutes: 20`, `PYTHONUNBUFFERED=1`.

## Offene Punkte / Nächste Schritte
- [ ] **Tab-Tipp-nach-oben:** Tippen auf den bereits aktiven Tab springt nach oben
      (braucht kleine Verdrahtung in `App.tsx` ↔ Screens, z. B. Ref/Callback an Home/Kalender).
- [ ] **`EVENTFROG_API_KEY`** als Repo-Secret hinterlegen (Settings → Secrets and variables → Actions) —
      Workflow reicht ihn bereits durch; schaltet Eventfrog (großer CH-Aggregator) frei.
- [ ] **Kuratierte-Tour-Koordinaten** präzisieren (aktuell Näherungen).
- [ ] Optional: coucou/tourismus Selektoren feinjustieren, falls Ausbeute schwankt
      (Diagnose via workflow_dispatch `debug=1` → `debug_source_structure`).
- [ ] Optional: gezogene Route exakt nach Google Maps (Google kann nur ~9 Wegpunkte → Näherung;
      exakt nur via GPX-Export möglich).

## Wichtige Dateien (Karte)
- App-Shell/Navigation: `App.tsx`, `src/components/NavigationBar.tsx`
- Theme: `src/styles/theme.ts`, `src/context/ThemeContext.tsx`
- Screens: `src/screens/{HomeScreen,CalendarScreen,MapScreen,ToursScreen,AccountScreen,...}.tsx`
- Touren-Service/Map: `src/services/toursService.ts`, `MapScreen.buildTourHTML` (LRM/OSRM-Foot)
- Utils: `src/utils/{openingHours,distance,maps}.ts`
- Karten/Listen: `src/components/{ListingCard,ListingRow,EventCard,EventRow,MonthCalendar,DetailModal,ScrollTopButton}.tsx`
- Config: `src/config/{curatedTours,tourLimits,collections,categoryVisuals}.ts`
- i18n: `src/locales/{de,en,fr,it}.json` (Keys IMMER in allen vier ergänzen)
- Import: `winti_import_phase2.py` (Events), `winti_import_phase1.py` (Listings)

## Konventionen
- Branch: auf `main` entwickeln; Feature-Branch `claude/winti-guide-app-setup-dwTTv` synchron halten.
- Neue i18n-Keys in **allen vier** Locales.
- DB-Änderungen als **idempotente** Migration + Workflow `db-migrate.yml` ausführen.
- Vor Push: `tsc` + `jest` grün.
