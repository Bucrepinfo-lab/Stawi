# Stawi CRM Content Guide — one voice, in-app and out

> Audience: sales/support/marketing agents (human or AI) generating emails,
> SMS, posters, WhatsApp messages and newsletters. This guide is BINDING:
> content that ignores it fragments the brand voice.

## 1. The spine: eight failure gaps = our niche

Every campaign leans on the research that IS the product: the eight reasons
microfinance fails to graduate (source of truth: `packages/core/src/graduation.ts`
→ `FAILURE_GAPS`, rendered on the landing page and /sacco Graduate tab).

| # | Gap | Marketing angle (headline energy) |
|---|-----|-----------------------------------|
| 1 | Governance fraud | "Every shilling has two approvers and a permanent record." |
| 2 | Liquidity runs | "A live meter watches the money so nobody has to panic." |
| 3 | Thin capital | "Watch your capital adequacy grow toward the next licence." |
| 4 | Paper books | "No more 'where did the money go?' Ever." |
| 5 | Committee lending | "No committee. No favours. Your record decides." |
| 6 | Branch costs | "No branches means your rates stay low. 80–95% cheaper to serve." |
| 7 | Uninformed members | "Every member sees the same numbers, live." |
| 8 | Compliance gaps | "Your country's rules, built in — filings on time, licence on track." |

Rule: **never attack competitors by name.** We market against the *failure
pattern*, not against institutions.

## 2. The engine: moments, not blasts

All lifecycle content is generated from `packages/core/src/moments.ts`
(`MOMENTS` catalog + `detectMoments(signals)`); the dashboard MomentsStrip
renders the same objects. Twelve moments across 4 pillars × 4 goals
(RETAIN / MOBILIZE / REFER / MONETIZE), each with ready channel copy:
`smsText` (≤160 chars filled), `emailSubject`, `posterHeadline`,
`newsletterBlurb`, in-app `hook`/`message`/CTA.

Rules:
- A message goes out only when its moment's `trigger` fires for that party.
  No trigger → no send. (This is what makes us not-spam.)
- Max 2 CRM touches per party per week; priority decides which moments win.
- Fill placeholders with `fillMoment()`; never hand-write values.
- Every send links to the CTA route of the moment — the app is the landing page.

## 3. The lure ladder (acquisition → activation → advocacy)

1. **Acquire with Pillars 1–3** — lead with books, transparency, published
   reports. Explicitly welcome groups banking elsewhere:
   *"Banking elsewhere? No problem — your books, reports and transparency
   live here regardless."* (compact banner, /books)
2. **Activate with earned merits** — for performing parties, SACCO+ marketing
   always shows what their record ALREADY earned (tier at entry, rate, limit,
   monthly interest on the current pot) — see `SaccoActivationCard`. Never a
   generic pitch when a personalised one is computable.
3. **Advocate via milestones** — member-drive and ladder-progress moments turn
   members into the sales force ("Bring one saver. Move the whole group up.").

## 4. Voice

Warm, direct, second person. Numbers over adjectives. Swahili accents welcome
(Mkubwa, chama, asante) — never as decoration, only where natural. No fear
tactics: we show liquidity meters to officials, not doom to members. Money
figures always formatted, always from live data — never invented.

## 5. Channel specifics

- **SMS**: one moment, one number, one CTA; ≤160 chars filled (tested in CI).
- **Email**: subject = moment's `emailSubject`; body = message + 3 merit
  bullets max + one button (CTA route).
- **Poster**: `posterHeadline` + one stat + QR to /sacco or group invite link.
- **Newsletter**: 3–5 `newsletterBlurb`s, platform-level numbers only
  (never expose any single group's prudential figures — officials-only rule
  applies to CRM too).

## 6. Visibility rules carry over

Prudential internals (liquidity %, capital adequacy, NPL) appear ONLY in
officials-targeted content. Member-facing content shows position, readiness %
and actions — the same grading as the Graduate tab.
