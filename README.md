# Winti Guide 🦁

Der ultimative digitale Stadtführer für Winterthur – als React Native / Expo App.

## Features

- 🏠 **Entdecken** – Restaurants, Cafés, Bars, Hotels, Sightseeing & mehr
- 📅 **Kalender** – Kommende Events (Free: 7 Tage, Premium: alle)
- 🗺️ **Karte** – Interaktive OpenStreetMap (kostenlos, kein API-Key nötig)
- ❤️ **Gespeichert** – Favoriten lokal speichern (Free: max. 5, Premium: unbegrenzt)
- 👤 **Konto** – Login / Registrierung + Premium-Upgrade via Stripe
- 📢 **Partner-Portal** – Self-Service für Werbepartner (Anzeigen, Abos, Rechnungen)
- 🌍 **Mehrsprachig** – Deutsch, Englisch, Französisch, Italienisch
- 🔍 **Suche & Filter** – Nach Kategorie und Namen filtern

## Tech Stack

- **Frontend**: React Native / Expo SDK 54
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Zahlungen**: Stripe (Partner-Abos B2B + App-Premium B2C)
- **Karte**: OpenStreetMap + Leaflet via WebView (kostenlos)
- **Speicherung**: AsyncStorage (offline Favoriten / Auth-Session)
- **Sprache**: TypeScript

## Projekt-Struktur

```
src/
├── config/
│   └── supabase.ts            # Supabase Client (mit AsyncStorage Auth)
├── context/
│   └── AuthContext.tsx        # Auth-Context (Login, Register, Logout)
├── types/
│   └── index.ts               # TypeScript Interfaces
├── services/
│   └── supabaseService.ts     # Datenbank-Abfragen + Partner/Ads/Invoices
├── hooks/
│   ├── useListings.ts         # Listings Hook
│   ├── useEvents.ts           # Events Hook
│   ├── useAppTier.ts          # Free/Premium Tier Hook
│   └── useTranslation.ts      # Übersetzungen Hook
├── screens/
│   ├── HomeScreen.tsx         # Startseite (Listings + Partner-Ads)
│   ├── CalendarScreen.tsx     # Kalender (7-Tage-Limit für Free)
│   ├── MapScreen.tsx          # Kartenansicht
│   ├── SavedScreen.tsx        # Gespeicherte Favoriten (5-Limit für Free)
│   ├── AccountScreen.tsx      # Login / Register / Premium-Upgrade
│   └── PartnerPortalScreen.tsx # Partner Self-Service Portal
├── components/
│   ├── ListingCard.tsx        # Eintrag-Karte
│   ├── EventCard.tsx          # Event-Karte
│   ├── PartnerAdBanner.tsx    # Partner-Anzeige (für Free-Nutzer)
│   ├── PremiumGate.tsx        # Upgrade-Prompt für gesperrte Features
│   ├── CategoryFilter.tsx     # Kategorie-Filter
│   ├── SearchBar.tsx          # Suchleiste
│   └── NavigationBar.tsx      # Navigation unten
├── locales/
│   ├── de.json                # Deutsch
│   ├── en.json                # Englisch
│   ├── fr.json                # Französisch
│   └── it.json                # Italienisch
└── styles/
    └── theme.ts               # Design-Konstanten

supabase/
└── functions/
    └── stripe-webhook/
        └── index.ts           # Stripe Webhook Edge Function (Deno)

supabase-schema.sql            # Original-Schema (Listings, Events, Ads)
supabase-schema-v2.sql         # Business-Modell-Schema (Partner, Premium, Ads)
winterthur-admin.jsx           # Admin-Panel (React, inkl. Partner-Verwaltung)
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

Dann `.env.local` bearbeiten und Werte eintragen:

```env
# Supabase (aus supabase.com → Projekt → Settings → API)
EXPO_PUBLIC_SUPABASE_URL=https://dein-projekt.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=dein-anon-key

# Stripe Payment Links (aus stripe.com → Payment Links)
EXPO_PUBLIC_STRIPE_PREMIUM_MONTHLY_URL=https://buy.stripe.com/...
EXPO_PUBLIC_STRIPE_PREMIUM_YEARLY_URL=https://buy.stripe.com/...
EXPO_PUBLIC_STRIPE_PARTNER_STARTER_URL=https://buy.stripe.com/...
EXPO_PUBLIC_STRIPE_PARTNER_PRO_URL=https://buy.stripe.com/...
EXPO_PUBLIC_STRIPE_PARTNER_PREMIUM_URL=https://buy.stripe.com/...
```

### 4. App starten

```bash
npx expo start
```

Dann den **QR-Code** mit der **Expo Go App** auf deinem iPhone scannen.

## Datenbank (Supabase)

### Schema einrichten

**Schritt 1 – Basisschema** (Listings, Events, Ads):

1. [supabase.com](https://supabase.com) → Dein Projekt → SQL Editor
2. Inhalt von `supabase-schema.sql` einfügen und ausführen

**Schritt 2 – Business-Modell-Schema** (Partner, Premium, Ads):

1. SQL Editor → Neues Query
2. Inhalt von `supabase-schema-v2.sql` einfügen und ausführen

> Beide Schemas sind idempotent (verwenden `create if not exists` / `create or replace`).

### Daten importieren

```bash
pip install requests beautifulsoup4 python-dateutil
python3 winti_import_phase1.py
python3 winti_import_phase2.py
```

### Neuen Eintrag hinzufügen

**Via Admin Panel** (empfohlen):
- Öffne `winterthur-admin.jsx` in einem React-Projekt
- Trage deine Supabase-URL und Anon-Key oben in der Datei ein
- Nutze das UI um Einträge, Events, Partner und Anzeigen zu verwalten

## Stripe-Integration

### Payment Links erstellen

1. [stripe.com](https://stripe.com) → Payment Links → "+ New"
2. Je einen Link für die 5 Produkte (App Premium Monthly/Yearly + 3 Partner-Pakete) erstellen
3. URLs in `.env.local` eintragen

### Stripe Webhook einrichten

```bash
# Supabase Edge Function deployen
supabase functions deploy stripe-webhook

# Webhook Secret als Secret setzen
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

Im Stripe Dashboard:
- Webhooks → "+ Add endpoint"
- URL: `https://<project-id>.supabase.co/functions/v1/stripe-webhook`
- Events: `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.deleted`, `customer.subscription.updated`

## Free vs. Premium

| Feature | Free | Premium |
|---|---|---|
| Listings (alle Kategorien) | ✅ | ✅ |
| Kalender | Nächste 7 Tage | Alle Events |
| Gespeicherte Orte | Max. 5 | Unbegrenzt |
| Partner-Werbebanner | Sichtbar | Keine |
| Karte | ✅ | ✅ |
| **Preis** | Kostenlos | CHF 1.99/Mo oder CHF 9.99/Jahr |

## Partner-Preismodell

| Paket | Monatlich | Jährlich | Leistungen |
|---|---|---|---|
| Starter | CHF 49 | CHF 490 | 1 Inline-Anzeige, Basis-Statistiken |
| Pro | CHF 99 | CHF 990 | Banner + Inline, Featured-Listing |
| Premium | CHF 199 | CHF 1'990 | Unbegrenzt, Kategorie-Highlight |

## Umgebungsvariablen

| Variable | Beschreibung |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase Projekt-URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key (öffentlich, durch RLS geschützt) |
| `EXPO_PUBLIC_STRIPE_PREMIUM_MONTHLY_URL` | Stripe Link für monatliches App-Premium |
| `EXPO_PUBLIC_STRIPE_PREMIUM_YEARLY_URL` | Stripe Link für jährliches App-Premium |
| `EXPO_PUBLIC_STRIPE_PARTNER_STARTER_URL` | Stripe Link für Partner Starter-Paket |
| `EXPO_PUBLIC_STRIPE_PARTNER_PRO_URL` | Stripe Link für Partner Pro-Paket |
| `EXPO_PUBLIC_STRIPE_PARTNER_PREMIUM_URL` | Stripe Link für Partner Premium-Paket |

> **Sicherheit**: Alle `EXPO_PUBLIC_*` Werte sind Client-seitig sichtbar. Sensible Stripe-Secrets (z.B. `STRIPE_WEBHOOK_SECRET`) werden ausschliesslich als Supabase Edge Function Secrets gespeichert.

## iPhone Setup

1. **Expo Go** installieren: [App Store](https://apps.apple.com/app/expo-go/id982107779)
2. `npx expo start` ausführen
3. QR-Code in der Expo Go App scannen
4. App wird geladen und ist bereit zum Testen

## Lizenz

© 2026 Winti Guide – Thomas Walther
