# Stawi — Global Compliance Model

Stawi launches worldwide, so regulation is **data, not hard-coded logic**. Every
country is a configurable profile in `@stawi/core` (`compliance.ts`,
`COUNTRIES` registry). Adding/adjusting a market is a data change, not a rewrite.

## What each country profile carries
- Currency (ISO 4217) + locale for display formatting
- Indicative consumption-tax rate + name (VAT / GST / sales tax)
- Tax authority (e.g. KRA, FIRS, HMRC, IRS, ATO…)
- Business / cooperative registrar
- Data-protection regime + authority (GDPR, Kenya DPA, NDPA, POPIA, CCPA, DPDP, LGPD…)
- Official links

## Currently seeded markets
Kenya, Nigeria, South Africa, Ghana, United States, United Kingdom, Germany (EU),
India, Australia, Canada, UAE, Brazil — spanning Africa, Europe, North & South
America, Asia, Oceania, and the Middle East.

## How it's used
- `formatCurrencyFor(cents, code)` — localized money everywhere.
- `indicativeConsumptionTax(gross, code)` — generic VAT/GST estimate.
- Tax/levy specifics (e.g. Kenya PAYE/Tourism Levy) remain in `tax.ts`; other
  countries plug their own rule packs behind the same shape.
- The formalization wizard (`formalization.ts`) selects the right registration
  track per country.

## Important caveats
- **Rates and bodies are indicative defaults and change.** They must be verified
  against current local law before relied upon. The `research-agent` and
  `legal-agent` keep them fresh; stale facts are flagged.
- Nothing in the app is legal, tax, or financial advice (see Subscription Terms §4).
- Data is processed per the applicable regime; international transfers use lawful
  mechanisms.

## Adding a market
1. Add a `CountryProfile` to `COUNTRIES`.
2. Add any country-specific tax/levy rules + registration steps.
3. Add the Privacy Policy localization + DPA references.
4. Have local counsel review the formalization and tax content.
