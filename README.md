# Winti Guide 🦁

Lokaler Stadtguide für Winterthur, Schweiz.

## Tech Stack
- **Frontend**: React Native / Expo
- **Backend**: Supabase
- **Daten**: OpenStreetMap, Zürich Tourismus API

## Setup

### 1. Abhängigkeiten installieren
```bash
npm install
npx expo install react-native-safe-area-context react-native-screens
```

### 2. Supabase konfigurieren
In `App.tsx` die Supabase URL und Key eintragen.

### 3. Datenbank einrichten
`supabase-schema.sql` im Supabase SQL Editor ausführen.

### 4. Daten importieren
```bash
pip install requests beautifulsoup4 python-dateutil
python3 winti_import_phase1.py
```

### 5. App starten
```bash
npx expo start
```

## Datenquellen
- OpenStreetMap (ODbL Lizenz)
- Zürich Tourismus API
- Open-Meteo (Wetter)

© 2026 Winti Guide
