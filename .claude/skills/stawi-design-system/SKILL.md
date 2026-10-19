---
name: stawi-design-system
description: Use when building or restyling any Stawi UI (web, mobile, prototype, or artifact) to keep it on-brand — Forest/Gold/Bone palette, Fraunces × Hanken Grotesk × IBM Plex Mono type, the stawi-logo.svg mark, and the design/ prototypes as the reference.
---

# Stawi Design System

**Purpose:** Keep every generated surface on-brand. Stawi means "thrive"; the
promise is *Save · Grow · Thrive*. The look is a warm, trustworthy "savanna
fintech" — not generic SaaS. Encode the tokens so new UI matches the prototypes.

## When to use
- Building/editing `apps/web` (Next.js 15) or `apps/mobile` (Expo) UI.
- Producing a prototype, mockup, landing page, or an Artifact/design for Stawi.
- Reviewing UI for brand drift.

## Ground-truth files (read before styling)
- `BRAND.md` — vision, values, the four pillars, palette, type, logo rules.
- `design/stawi-logo.svg` — the icon + wordmark lockup (forest token, ascending
  bars = savings growing, gold coin/sun, rotating-savings arc = the chama circle).
- `design/` prototypes — copy their tokens and structure:
  `stawi-landing-demo.html`, `stawi-app-preview.html`, `stawi-admin-preview.html`,
  `stawi-member-mobile-preview.html`, `stawi-sacco-preview.html`,
  `stawi-harmony-preview.html`, `pillar1-cockpit-prototype.html`,
  `business-cockpit-demo.html`, `stawi-prototype.html`.

## Exact tokens (from BRAND.md + design/stawi-landing-demo.html)
**Core palette:** Forest `#14352a` / `#2f855a`, Gold `#e0a32e`, Bone `#f7f3ea`,
Ink `#1c2620`. Never recolor the logo mark outside this palette or stretch it;
keep clear space ≥ the height of the coin.

**Prototype CSS variables** (light; the prototypes ship a `html.dark` override):
```css
:root{
  --bone:#f6f1e7; --bone2:#efe8d9; --paper:#fffdf8;
  --ink:#16261f; --ink2:#2c4339;
  --forest:#1f4d3a; --forestD:#16382a;
  --gold:#e0a32e; --goldD:#b97e15;
  --dim:#6b7c73; --faint:#9aa79f; --line:#dcd3c2;
}
html.dark{
  --bone:#0f1613; --bone2:#17211c; --paper:#141d18;
  --ink:#eaf0ea; --ink2:#c2ccc4;
  --forest:#3f9d70; --forestD:#2f855a;
  --dim:#8a978d; --faint:#6f7d74; --line:#25302a;
}
```
Use BRAND.md hexes as the canonical brand anchors; the prototype vars are the
applied working set — match whichever the surrounding code already uses, and
support dark mode.

**Type** (Google Fonts):
- Display: **Fraunces** (600) — headings, wordmark feel (`.display{font-family:'Fraunces',Georgia,serif}`).
- Body: **Hanken Grotesk** (400–800) — default UI (`system-ui` fallback).
- Mono: **IBM Plex Mono** (500/600) — figures, amounts, codes.
- Tagline style: `font-weight:800; letter-spacing:2.5px; text-transform` feel,
  `--dim` color.

## Built-in design/artifact types vs hand-built
- **Hand-build in the repo** for anything that ships: `apps/web` / `apps/mobile`
  components and the `design/` prototypes — match the existing tokens and the
  "warm savanna fintech" style the operation-agent follows.
- **Use Claude's built-in artifact/design types** only for throwaway explorations,
  external one-off mockups, or a standalone shareable page — not as a substitute for
  editing repo UI. When you do, import the exact palette + fonts above so it still
  reads as Stawi, and embed `design/stawi-logo.svg` for the mark.

## Guardrails
- Phone-first, multilingual, works offline on an entry-level device (BRAND.md value
  of inclusion) — keep layouts light, legible, high-contrast, touch-friendly.
- The app always answers "what do I do next?" (value: simplicity) — design toward a
  clear next action.
- Never invent a new brand color or font. Reuse tokens; don't restyle the logo.
