---
name: compliance-pack
description: Use when adding or verifying a country's CountryProfile, tax/levy rules, formalization track, or data-protection references for a Stawi market — every rate and registrar must cite its legal source and be flagged "indicative default — verify against current local law".
---

# Compliance Pack

**Purpose:** Scaffold or audit a per-country compliance profile so a new market is
a *data change*, not a rewrite — and so no unverified legal claim ever ships.
Regulation is data in Stawi (`COMPLIANCE.md`): every country is a `CountryProfile`
in `@stawi/core`.

## When to use
- Adding a market (new `CountryCode`) or editing an existing profile's rate/registrar.
- Reviewing tax/levy logic (`tax.ts`), the formalization wizard (`formalization.ts`),
  or DPA/privacy references before a market launch.
- Responding to "is this rate current?" — audit + flag stale facts.

## Ground-truth files (read before editing)
- `packages/core/src/compliance.ts` — `COUNTRIES` registry, `CountryProfile` shape,
  `formatCurrencyFor`, `indicativeConsumptionTax`.
- `packages/core/src/tax.ts` — country-specific tax/levy rule packs (Kenya: VAT 16%,
  PAYE bands, Tourism Levy 2%, Standards Levy 0.2%). Note `CountryCode` here is the
  narrow `'KE'`; the broad multi-country code lives in `compliance.ts`.
- `packages/core/src/formalization.ts` — `SHG_STEPS` / `SACCO_STEPS`, each step
  carrying a `statute` field.
- `COMPLIANCE.md` (model + "Adding a market" steps), `PRD.md` §6 (regulatory sources).
- Tests: `packages/core/test/compliance.test.ts`, `tax.test.ts`, `formalization.test.ts`.

## Steps to add/verify a market
1. **Add/confirm the `CountryProfile`** in `COUNTRIES` (compliance.ts): `code`, `name`,
   `region`, `currency` (ISO 4217), `locale`, `consumptionTaxRate` + `consumptionTaxName`,
   `taxAuthority`, `registrar` (body that registers cooperatives/SHGs/companies),
   `dataProtection` + `dataProtectionAuthority`, and official `links`.
2. **Source every value.** For each rate/registrar/authority, cite the primary source
   (revenue authority, gazette, cooperatives commissioner, DPA regulator) as a markdown
   link — route the lookup through the `research-agent` / `legal-agent`. Cross-check two
   sources for any number (per research-agent method).
3. **Tax/levy rule pack.** If the market needs specific levies (not just generic VAT/GST),
   add a rule pack mirroring `tax.ts`'s shape (`TaxLine[]` with `code`, `label`,
   `amountCents`, `remitTo`, `dueBy`, `link`). Keep all money in **integer cents**.
4. **Formalization track.** Add the country's registration steps (name search →
   constitution → minutes → members → submit/fee for SHG; common bond → by-laws →
   appraisal → registration for cooperatives), each with its `statute`.
5. **Data protection.** Record the governing regime + authority and add the localized
   Privacy Policy / DPA references (Kenya DPA 2019 / ODPC; GDPR; NDPA; POPIA; etc.).
6. **Test.** Extend the compliance/tax/formalization test files; `npm run test` green.

## Mandatory guardrails — never skip
- **Cite the legal source for every rate, registrar, authority and levy.** No sourced
  link → do not write the value; say you could not verify.
- **Flag indicative defaults.** Rates/bodies are configurable defaults that change;
  label them "indicative default — verify against current local law before relying on
  them" in code comments and any surfaced copy (this language already lives at the top
  of `compliance.ts` and in `COMPLIANCE.md` — preserve it).
- **Nothing here is legal/tax advice** (Subscription Terms §4). Present requirements as
  informational and recommend local counsel review before filing (per `legal-agent`).
- **Never assert legal certainty you cannot source.** Stale or unverifiable facts get
  flagged in `PRD.md` §6, not shipped.
- Have local counsel review formalization + tax content before launch (COMPLIANCE.md
  step 4).
