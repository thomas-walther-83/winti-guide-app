# Winti Guide – Strategie- & Optimierungsbericht (Management-Summary)

> Stand: 2026-06-03 · Grundlage: vollständige Code-Analyse von `winti-guide-app`
> (Expo/React Native, Supabase, Web/PWA). Diese Seite fasst die wichtigsten
> Erkenntnisse zusammen; Details in den vier Teilberichten.

## Gesamtbild

Winti Guide hat ein **technisch solides, gut typisiertes Fundament** und – ungewöhnlich
für dieses Stadium – ein **vollständig gebautes zweiseitiges Geschäftsmodell**
(B2C-Premium + B2B-Partner-Self-Service mit Stripe und Ad-Tracking). Der **KI-Guide
„Thomas"** ist ein echtes Alleinstellungsmerkmal. Die App wirkt aber **visuell wie ein
Prototyp** (keine echten Bilder, Dauer-Rot) und es fehlen **Discovery-Kernbausteine**:
Detailseite, „in der Nähe", echtes Routing, gelebte Mehrsprachigkeit.

## Top-Empfehlungen (höchster Hebel zuerst)

1. **Detailseite + React Navigation einführen** – die zentrale, heute fehlende
   Interaktion; Voraussetzung für Sharing, Push-Ziele, Routing. *(Audit §2, Roadmap F1/F2)*
2. **Echte Bilder** statt Emoji-/Farbblöcke – größter visueller Conversion-Hebel.
   *(Design §4, Roadmap F3)*
3. **Mehrsprachigkeit live schalten** – i18n (de/en/fr/it) ist fertig gebaut, aber
   **nirgends in der UI angebunden**; billigster großer Reichweiten-Gewinn bei Touristen.
   *(Audit §1/§6, Roadmap F5)*
4. **„In der Nähe" + Standort** – Top-Erwartung von Touristen, `lat/lon` ist bereits da.
   *(Roadmap F4)*
5. **Geschäftsfokus auf B2B verschieben** – bei 115k EW trägt reines B2C-Abo nicht;
   Umsatzmotor sind Partner-Abos + Stadt-/Tourismus-Kooperation, B2C-Premium bleibt
   Hygienefaktor. *(Businessmodell §1/§2/§8)*
6. **Design-Quick-Wins**: Marken-Rot vereinheitlichen (`app.json #8B0000` ≠
   `theme.ts #CC0000`), Kontraste/Touch-Targets/A11y, Akzent-Grün für Hierarchie,
   Dark Mode. *(Design §1/§10)*

## Wichtigste Befunde

- **Stärken:** saubere Codebasis + Tests, durchdachtes Free/Premium-Gating, komplette
  Partner-Infrastruktur, kostenlose OSM-Karte, KI-Guide, PWA-Vertrieb ohne Store-Hürde.
- **Schwächen:** kein Detail-Screen, keine Bilder, i18n nicht angebunden (de-facto nur
  Deutsch), kein Routing/Deep-Links (Partner-Tab sogar versteckt), keine Geolokalisierung,
  kein Onboarding, kein Dark Mode, A11y-Lücken, `stars`/`price` als String ohne Reviews.

## Teilberichte

- [`01-app-audit.md`](./01-app-audit.md) – Ist-Zustand, IA, Content-Modell, Stärken/Schwächen (mit `datei:zeile`).
- [`02-design-look-and-feel.md`](./02-design-look-and-feel.md) – Farben (Hex), Typo, Karten/Detail, A11y, Quick Wins.
- [`03-feature-roadmap.md`](./03-feature-roadmap.md) – 18 Features, MoSCoW, Impact/Effort, 3-Phasen-Roadmap.
- [`04-businessmodell.md`](./04-businessmodell.md) – Erlösströme, CHF-Pricing, Canvas, Szenario & White-Label-Skalierung.

## Vorgeschlagene Reihenfolge (90 Tage)

**Phase 1 (Fundament & Wertigkeit):** React Navigation, Detailseite, echte Bilder,
i18n live, leichtes Onboarding, Design-Quick-Wins, Favoriten-Sync.
**Phase 2 (Standort & Monetarisierung):** „in der Nähe", Routing, Sharing, Push,
Partner-Deals/Coupons, saisonale Kollektionen.
**Phase 3 (Differenzierung & Skalierung):** Touren, Reviews, Offline, ÖV, White-Label
für weitere Städte.
