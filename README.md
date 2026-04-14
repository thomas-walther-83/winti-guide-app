# Winti Guide 🦁

Der ultimative digitale Stadtführer für Winterthur – als React Native / Expo App.

## Features

- 🏠 **Entdecken** – Restaurants, Cafés, Bars, Hotels, Sightseeing & mehr
- 📅 **Kalender** – Kommende Events in Winterthur
- 🗺️ **Karte** – Interaktive OpenStreetMap (kostenlos, kein API-Key nötig)
- ❤️ **Gespeichert** – Favoriten lokal speichern (auch offline)
- 🌍 **Mehrsprachig** – Deutsch, Englisch, Französisch, Italienisch
- 🔍 **Suche & Filter** – Nach Kategorie und Namen filtern

## Tech Stack

- **Frontend**: React Native / Expo SDK 54
- **Backend**: Supabase (PostgreSQL)
- **Karte**: OpenStreetMap + Leaflet via WebView (kostenlos)
- **Speicherung**: AsyncStorage (offline Favoriten)
- **Sprache**: TypeScript

## Projekt-Struktur

```
src/
├── config/
│   └── supabase.ts       # Supabase Client
├── types/
│   └── index.ts          # TypeScript Interfaces
├── services/
│   └── supabaseService.ts # Datenbank-Abfragen
├── hooks/
│   ├── useListings.ts    # Listings Hook
│   ├── useEvents.ts      # Events Hook
│   └── useTranslation.ts # Übersetzungen Hook
├── screens/
│   ├── HomeScreen.tsx    # Startseite (Listings)
│   ├── CalendarScreen.tsx # Kalender (Events)
│   ├── MapScreen.tsx     # Kartenansicht
│   └── SavedScreen.tsx   # Gespeicherte Favoriten
├── components/
│   ├── ListingCard.tsx   # Eintrag-Karte
│   ├── EventCard.tsx     # Event-Karte
│   ├── CategoryFilter.tsx # Kategorie-Filter
│   ├── SearchBar.tsx     # Suchleiste
│   └── NavigationBar.tsx # Navigation unten
├── locales/
│   ├── de.json           # Deutsch
│   ├── en.json           # Englisch
│   ├── fr.json           # Französisch
│   └── it.json           # Italienisch
└── styles/
    └── theme.ts          # Design-Konstanten
```

## Setup

### Voraussetzungen

- Node.js 18+
- npm oder yarn
- Expo CLI: `npm install -g expo-cli`
- Expo Go App auf deinem iPhone ([App Store](https://apps.apple.com/app/expo-go/id982107779))

### 1. Repository klonen

```bash
git clone https://github.com/thomas-walther-83/winti-guide-app.git
cd winti-guide-app
```

### 2. Abhängigkeiten installieren

```bash
npm install
```

### 3. Umgebungsvariablen einrichten

```bash
cp .env.example .env.local
```

Dann `.env.local` bearbeiten und deine Supabase-Zugangsdaten eintragen:

```env
EXPO_PUBLIC_SUPABASE_URL=https://dphhqwisluirihmahyee.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=dein-anon-key
```

Die Zugangsdaten findest du unter: [supabase.com](https://supabase.com) → Dein Projekt → Settings → API

### 4. App starten

```bash
npx expo start
```

Dann den **QR-Code** mit der **Expo Go App** auf deinem iPhone scannen.

## Datenbank (Supabase)

### Schema einrichten

Führe `supabase-schema.sql` im Supabase SQL Editor aus:
1. [supabase.com](https://supabase.com) → Dein Projekt
2. SQL Editor → Neues Query
3. Inhalt von `supabase-schema.sql` einfügen und ausführen

### Daten importieren

```bash
pip install requests beautifulsoup4 python-dateutil
python3 winti_import_phase1.py
python3 winti_import_phase2.py
```

### Neuen Eintrag hinzufügen

**Via Admin Panel** (empfohlen):
- Öffne `winterthur-admin.jsx` in einem React-Projekt
- Trage deine Supabase-URL und Anon-Key ein
- Nutze das UI um Einträge zu verwalten

**Via Supabase UI**:
1. Supabase → Table Editor → `listings`
2. "+ Insert row" klicken
3. Felder ausfüllen:
   - `category`: z.B. `restaurants`, `cafes`, `bars`, `hotels`
   - `name`: Name des Eintrags
   - `address`: Adresse
   - `lat` / `lon`: Koordinaten (für Karte)
   - `is_active`: `true` zum Aktivieren

## Umgebungsvariablen

| Variable | Beschreibung |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Deine Supabase Projekt-URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Dein Supabase Anon Key (öffentlich) |

> **Hinweis**: Der Supabase Anon Key ist für Client-Apps designed und darf öffentlich sein. Die Datensicherheit wird durch Row Level Security (RLS) in Supabase gewährleistet.

## iPhone Setup

1. **Expo Go** installieren: [App Store](https://apps.apple.com/app/expo-go/id982107779)
2. `npx expo start` ausführen
3. QR-Code in der Expo Go App scannen
4. App wird geladen und ist bereit zum Testen

## Lizenz

© 2026 Winti Guide – Thomas Walther
