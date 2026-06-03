# Winti Guide – Geschäftsmodell

> Ausgangslage (verifiziert im Code): zweiseitiges Modell ist bereits angelegt –
> **B2C-Premium** (`AppTier free|premium`, Stripe Payment Links, `AccountScreen.tsx`)
> und **B2B-Partner** (Pakete Starter/Pro/Premium, Self-Service-Portal, Stripe,
> Impression/Click-Tracking, Rechnungen – `PartnerPortalScreen.tsx`,
> `supabaseService.ts`, `types/index.ts`). Markt: Winterthur ~115'000 EW + Tagestouristen.

## 1. Markt- & Realitäts-Check

- Bei ~115k Einwohnern ist **reines B2C-Abo (CHF 1.99/Mo bzw. 9.99/Jahr) zu dünn**:
  Selbst optimistische 10'000 Installs × 3 % Premium-Conversion × CHF 9.99 ≈ **CHF 3'000/Jahr**.
  → B2C-Premium ist **Hygiene-/Image-Faktor**, nicht der Umsatzmotor.
- **Umsatzmotor ist B2B**: lokale Gastronomie, Hotels, Detailhandel, Kultur, plus
  Tourismus-/Stadt-Kooperation. Das Partner-Datenmodell ist dafür bereits gebaut.
- Differenzierung gegenüber Google/Tripadvisor: **lokal kuratiert + KI-Guide „Thomas"
  + mehrsprachig + Stadt-/Tourismus-Verankerung**.

## 2. Erlösströme (priorisiert)

| Strom | Beschreibung | Pricing (CHF) | Reife |
|---|---|---|---|
| **R1 Partner-Listings/Abos** | Starter/Pro/Premium (Featured, Banner, Statistiken) | 49 / 99 / 199 mtl. (bereits definiert) | live-fähig |
| **R2 Gesponserte Platzierungen** | Top-Position in Kategorie, Featured-Karussell, KI-Empfehlung „Partner" | CPM CHF 15–40 **oder** Fix CHF 150–400/Mo | Tracking vorhanden |
| **R3 Stadt-/Tourismus-Kooperation (B2B)** | Jahresvertrag mit Winterthur Tourismus / Standortförderung als offizieller/empfohlener Guide; White-Label-Feed | CHF 8'000–25'000 / Jahr | Akquise |
| **R4 Gastro-/Retail-Deals & Coupons** | Provision je Einlösung oder Deal-Flatrate | 5–15 % oder CHF 30–80/Deal-Mo | Feature F14 |
| **R5 Event-Ticketing-Affiliate** | Vermittlung zu Eventfrog/Ticketcorner/Eventbrite | 3–8 % je Ticket | Events vorhanden |
| **R6 B2C-Premium (Freemium)** | werbefrei, voller Kalender, unbegrenzt Favoriten, Touren | 1.99/Mo · 9.99/Jahr (ggf. → 2.90/14.90) | live |
| **R7 White-Label für weitere Städte** | „Guide-as-a-Service" (Frauenfeld, Schaffhausen, Uster …) | Setup CHF 3'000–8'000 + 500–1'500/Mo | Phase 3 |

**Empfehlung:** Fokus R1 + R3 (planbarer Umsatz), R2/R4 als Upsell, R6 als Reichweiten-
und Conversion-Indikator, R7 als Skalierungs-These.

## 3. Pricing-Detail Partner (Anpassung der Ist-Pakete)

Die bestehenden Pakete (49/99/199) sind sinnvoll; Ergänzung um Jahres-Rabatt (bereits
490/990/1990 hinterlegt) und ein Einstiegs-„Basic-Eintrag gratis":

| Paket | mtl. | jährl. | Inhalt |
|---|---|---|---|
| **Basis (gratis)** | 0 | 0 | Standard-Eintrag (kuratiert), keine Hervorhebung |
| **Starter** | 49 | 490 | 1 Inline-Ad, Basis-Statistik, „verifiziert"-Badge |
| **Pro** | 99 | 990 | Banner+Inline, Featured-Listing, Deal-Slot, erweiterte Statistik |
| **Premium** | 199 | 1'990 | Unbegrenzt, Kategorie-Highlight, KI-Empfehlung, Account-Manager |

Gratis-Basiseintrag ist strategisch wichtig: füllt den Guide (Content), senkt
Akquise-Reibung und schafft Upgrade-Pfad.

## 4. Kostenstruktur (grob, jährlich)

| Posten | Schätzung CHF/Jahr |
|---|---|
| Supabase (Pro-Tier) | 300–1'000 |
| OpenAI (KI-Guide, gpt-4o-mini, nutzungsabhängig) | 200–1'500 |
| Apple/Google Developer | ~150 |
| Domain/Hosting (Web/PWA via GitHub Pages = ~0) | ~50 |
| Bild-/Daten-Lizenzen, Stockfotos | 0–500 |
| **Variabel: Vertrieb/Akquise & Redaktion** | Hauptkostenblock (Zeit/Personal) |
| Stripe-Gebühren | ~2.9 % + 0.30 je Transaktion |

Die laufenden Plattformkosten sind **sehr niedrig** (kostenlose Karte, PWA-Vertrieb).
Der reale Kostenblock ist **Akquise + redaktionelle Pflege** der Inhalte.

## 5. Zielsegmente & Go-to-Market

- **B2B-Primär:** Restaurants/Cafés/Bars (Altstadt, Neumarkt), Hotels, Kultur-Institutionen
  (die ohnehin schon Datenquelle sind: Gewerbemuseum, Naturmuseum, Casinotheater …),
  Detailhandel, Fitness/Freizeit.
- **B2B-Anker:** Winterthur Tourismus / Standortförderung (R3) als Glaubwürdigkeits- und
  Reichweiten-Hebel.
- **GTM-Schritte:**
  1. App mit Gratis-Basiseinträgen füllen (Content first) → Glaubwürdigkeit.
  2. „Pilot-Partner"-Aktion: 10–20 Lokale 3 Monate gratis Pro gegen Feedback/Logo.
  3. Direktakquise Altstadt (persönlich, lokal) + Tourismus-Kooperation.
  4. PWA/Web-Link (`github.io`) als reibungsloser Test-/Verkaufskanal ohne Store-Freigabe.
  5. Saisonale Anlässe (Albanifest, Musikfestwochen, Weihnachtsmarkt) als Akquise-Trigger.

## 6. KPIs / Metriken

- **Reichweite:** Installs/MAU/WAU, DAU/MAU-Stickiness, D1/D7/D30-Retention.
- **Engagement:** Detailseiten/Session, Suchen, „in der Nähe"-Nutzung, KI-Guide-Fragen.
- **B2C:** Premium-Conversion-Rate, Churn, ARPU.
- **B2B (Kernumsatz):** Anzahl zahlende Partner, MRR, durchschnittl. Paketwert, Partner-Churn,
  **Ad-CTR** (Tracking via `trackAdImpression`/`trackAdClick` schon vorhanden), Deal-Einlösungen.
- **Nord-Stern:** *„geteilte/gespeicherte/abgerufene Orte je MAU"* – misst echten Nutzwert.

## 7. Business Model Canvas (Textform)

- **Wertangebote:** kuratierter, mehrsprachiger Stadtführer; KI-Guide „Thomas";
  „in der Nähe" & Touren für Touristen; Reichweite & messbare Sichtbarkeit für lokale Betriebe.
- **Kundensegmente:** Touristen/Tagesgäste; Einheimische; lokale KMU/Gastro/Hotels/Kultur;
  Stadt/Tourismusorganisation.
- **Kanäle:** iOS/Android App, Web/PWA (GitHub Pages), Partner-Self-Service-Portal,
  Direktvertrieb, Tourismus-Touchpoints (Hotels, Bahnhof, QR).
- **Kundenbeziehungen:** Self-Service (Portal), persönliche B2B-Betreuung (Premium),
  KI-Self-Service (B2C), Push-Re-Engagement.
- **Einnahmequellen:** R1 Abos, R2 Sponsoring, R3 Stadt-Kooperation, R4 Deals,
  R5 Ticket-Affiliate, R6 B2C-Premium, R7 White-Label.
- **Schlüsselressourcen:** kuratierter Content/Daten-Pipeline, Codebasis, Partnerstamm,
  Marke „Winti Guide", Tourismus-Beziehung.
- **Schlüsselaktivitäten:** Content-Kuration & Import, Partner-Akquise/Success, Produkt-Dev,
  KI-Betrieb, Datenpflege/Moderation.
- **Schlüsselpartner:** Winterthur Tourismus, Kultur-Institutionen (Datenquellen),
  Supabase/OpenAI/Stripe, Ticketing-Plattformen, lokale Betriebe.
- **Kostenstruktur:** niedrige fixe Plattformkosten; Hauptkosten Akquise + Redaktion (Zeit).

## 8. Realistisches Szenario & Skalierung

**Jahr 1 (Winterthur):** 20–35 zahlende Partner, Mix-MRR-Schnitt ~CHF 80
→ **MRR CHF 1'600–2'800 (≈ CHF 19'000–34'000/Jahr)** + ggf. 1 Stadt-/Tourismus-Vertrag
(R3, CHF 8'000–25'000). B2C-Premium als Bonus (~CHF 2'000–5'000).
→ **Plausibles Jahr-1-Ziel: CHF 30'000–60'000** bei schlanken Kosten.

**Skalierung:** Sobald das Modell in Winterthur trägt, ist der Hebel **R7 White-Label**:
Die Codebasis ist mandantenfähig erweiterbar (Stadt = Filter auf Daten/Branding).
Jede weitere Stadt addiert R1+R3 bei marginalen Plattform-Mehrkosten. Realistischer
Pfad: 3–5 Schweizer Mittelstädte in 3 Jahren → wiederkehrender Umsatz im
mittleren sechsstelligen Bereich denkbar, ohne dass die Fixkosten linear mitwachsen.

> Feature-Voraussetzungen (Deals F14, Touren F9, White-Label) siehe
> [`03-feature-roadmap.md`](./03-feature-roadmap.md).
