# Winti Guide – Feature-Vorschläge & Roadmap

> Zielgruppen: **Einheimische** (Wiederkehr, Events, Geheimtipps, Deals) und
> **Touristen** (Orientierung, „in der Nähe", Mehrsprachigkeit, Touren, Offline).
> Aufwand: S = ≤ 3 Tage, M = 1–2 Wochen, L = > 2 Wochen.

## 1. Feature-Backlog (priorisiert, Impact/Effort)

| # | Feature | Nutzen | Zielgruppe | Aufwand | Abhängigkeit |
|---|---|---|---|---|---|
| F1 | **Detailseite** je Ort/Event | Kerninteraktion, Verweildauer, Sharing-Ziel | beide | M | React Navigation |
| F2 | **React Navigation** (Stack+Tabs, Deep-Links) | Fundament für Routing/Push/Sharing | beide | M | – |
| F3 | **Echte Bilder** (`image_url`, `expo-image`) | Conversion, Wertigkeit | beide | M | Schema/Importer |
| F4 | **Geolokalisierung + „In der Nähe"** | Top-Touristen-Erwartung, Distanz-Sort | Touristen | M | `expo-location`, F1 |
| F5 | **Mehrsprachigkeit live schalten** (de/en/fr/it) | Touristen-Reichweite (i18n schon gebaut!) | Touristen | S–M | `useTranslation` UI-Anbindung |
| F6 | **Onboarding** (Sprache, Standort, Interessen, Push-Opt-in) | Aha-Moment, Personalisierungs-Basis | beide | S | F5 |
| F7 | **Routing / Navigation zum Ort** (ÖV + zu Fuß) | „Wie komme ich hin?" | Touristen | S | Deep-Link zu Google/Apple Maps + SBB |
| F8 | **Push-Benachrichtigungen** (Events, Deals, „heute in Winti") | Re-Engagement Einheimische | Einheimische | M | F2, `expo-notifications` |
| F9 | **Kuratierte Touren/Routen** („Altstadt in 2 h", „Museums-Tour") | USP, Touristen-Wert, Premium-Inhalt | Touristen | M | F1, F4 |
| F10 | **Bewertungen & Tipps** (Reviews/„Local Tip") | Vertrauen, UGC, Content-Tiefe | beide | M | Auth, Moderation |
| F11 | **Sharing / Deep-Links** (Ort/Event/Tour teilen) | virale Reichweite, kostenlos | beide | S | F2 |
| F12 | **Offline-Modus** (Listings/Karte cachen) | Touristen ohne Roaming | Touristen | L | Caching-Layer |
| F13 | **Saisonale Highlights / Kollektionen** („Winter in Winti", Albanifest) | Redaktionelle Frische, Sponsoring-Fläche | beide | S | F1 |
| F14 | **Gastro-/Partner-Deals & Coupons** (QR-Einlösung) | direkter Partner-ROI → höhere Abos | beide | M | Partner-Portal |
| F15 | **QR/NFC bei Partnern** („Scan für Infos/Deal") | O2O-Brücke, Akquise-Argument | Touristen | M | F14 |
| F16 | **Favoriten-Sync übers Konto** (statt nur AsyncStorage) | Geräteübergreifend, Retention | beide | S | Supabase-Tabelle |
| F17 | **„Heute geöffnet"-Status & strukturierte Öffnungszeiten** | Praxisnutzen | beide | M | Schema |
| F18 | **ÖV-Anbindung** (nächste Haltestelle, SBB-Abfahrten) | Touristen-Orientierung | Touristen | M | Transport-API (opendata) |

## 2. MoSCoW

- **Must:** F1, F2, F3, F5 (i18n liegt fertig herum → schnellster Reichweiten-Hebel), F16.
- **Should:** F4, F6, F7, F11, F8.
- **Could:** F9, F10, F13, F14, F17.
- **Won't (jetzt):** F12 (Offline), F15 (NFC), F18 (ÖV) – wertvoll, aber später.

## 3. Roadmap in 3 Phasen

### Phase 1 – Fundament & Wertigkeit (Wochen 1–6) „MVP+"
**Ziel:** Aus Prototyp-Anmutung eine markttaugliche App machen.
- F2 React Navigation + Deep-Links
- F1 Detailseite (Foto, Öffnungszeiten, Map, Quick-Actions)
- F3 echte Bilder + `expo-image`
- F5 Mehrsprachigkeit live + F6 leichtes Onboarding
- F16 Favoriten-Konto-Sync
- Design Quick Wins aus [`02-design-look-and-feel.md`](./02-design-look-and-feel.md)
- **KPI:** Detailseiten-Aufrufe/Session, Sprach-Mix, D1/D7-Retention.

### Phase 2 – Standort, Engagement, Monetarisierung (Wochen 7–14)
- F4 „In der Nähe" + Distanz-Sortierung + Karten-Cluster/Standort
- F7 Routing, F11 Sharing
- F8 Push (Event-Reminder, „heute in Winti")
- F14 Partner-Deals/Coupons (treibt B2B-Umsatz, siehe [`04-businessmodell.md`](./04-businessmodell.md))
- F13 saisonale Kollektionen
- **KPI:** Push-Opt-in-Rate, Deal-Einlösungen, Partner-Conversion, MAU.

### Phase 3 – Differenzierung & Skalierung (ab Woche 15)
- F9 Touren/Routen (auch als Premium-Inhalt)
- F10 Reviews/Local Tips + Moderation
- F17 strukturierte Öffnungszeiten/„jetzt offen"
- F12 Offline, F18 ÖV, F15 QR/NFC
- **White-Label-Vorbereitung** (Mandantenfähigkeit) für weitere Städte (Frauenfeld, Schaffhausen …).
- **KPI:** Tour-Completion, UGC-Menge, Premium-Conversion, Städte-Pipeline.

## 4. Hinweise zur Umsetzung (an den Code anschließend)

- **i18n** ist der billigste große Hebel: `useTranslation` (`src/hooks/useTranslation.ts`)
  existiert mit 4 Sprachen, wird aber **nirgends in der UI** verwendet. Hardcodierte
  Strings in `HomeScreen`/`CalendarScreen`/`AccountScreen` durch `t('…')` ersetzen,
  Sprache global (Context) + Persistenz, Sprach-Auswahl im Onboarding/Konto. Achtung:
  Listings-/Event-Texte aus Supabase sind nur deutsch → ggf. `description_en` o. Ä.
- **Detailseite** verlangt zuerst F2 (heute `switch` in `App.tsx:48-65`).
- **Bilder**: `image_url` in `Listing` (`src/types/index.ts:111`) + `supabase-schema.sql`
  ergänzen, Importer (`winti_import_phase2.py`) um OG-Image/Wikimedia erweitern.
- **„In der Nähe"** nutzt vorhandene `lat/lon` (`fetchListingsWithCoords`) + `expo-location`;
  Haversine-Distanz clientseitig genügt für eine Stadt.
