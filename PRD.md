# Product Requirements Document (PRD)
### Chama-to-Enterprise Platform — Name: **Stawi**

> **Locked decisions (2026-06-20):** Name = **Stawi** · Theme = **Trustworthy fintech base + warm pan-African accents** · Business-matching ventures = **AI-generated on the fly** (fits the reset/re-roll button) · M-Pesa = **Daraja sandbox first** (live Paybill before launch) · First build = **Pillar 1, Table Banking**.

**Owner:** Jacob (bucrepinfo@gmail.com)
**Status:** **v1.2 — 4 pillars built, all code seams closed, realtime live** (~150 core tests; SSE push; Pillar 4 wired end-to-end; awaiting external account keys to go live)
**Last updated:** 2026-07-07
**Primary market:** Global, multi-tenant (Kenya-first; 12 countries seeded)
**Stack of record:** Next.js (web) · React Native/Expo (mobile) · Clerk (auth) · DigitalOcean (deploy)

> This document is the single source of truth. It is revised in place (do not fork new versions).
> It pairs with the memory files in `/memory` for cross-session continuity.

---

## 1. Name Options (pick one)

| # | Name | Meaning / Rationale | Why it works |
|---|------|---------------------|--------------|
| 1 | **Mzunguko** ⭐ | Swahili for *"the rotation / cycle"* — literally the merry-go-round at the heart of table banking. | Authentic, ownable, not used by competitors (Chamasoft, SmartChama, MyChama). Tells the founding story. Scales beyond "chama" as you grow into business + accounting. |
| 2 | **Stawi** | Swahili for *"thrive / prosper / flourish."* | Short (5 letters), brandable, positive emotion, easy to say globally. Speaks to the *outcome* (growth, business) not just the savings mechanic. |
| 3 | **Kibubu** | Swahili for the traditional *savings tin / piggybank.* | Culturally resonant and memorable; instantly signals "saving money." Distinctive and warm. |

**Recommendation:** **Mzunguko** — it captures the rotating-savings origin while leaving room to grow into the business and accounting pillars. Fallback: **Stawi** if you want something shorter/more global-sounding. The rest of this PRD uses *Mzunguko* as a placeholder.

---

## 2. Vision & Problem

Millions of Kenyans (and Africans broadly) save through **chamas** — informal merry-go-round / table-banking groups. Today they juggle WhatsApp, paper ledgers, and standalone tools (Chamasoft, SmartChama, MyChama) that stop at *tracking contributions*. None of them carry the group across the full journey: **save together → formalize into a registered group → start a business → run that business with real accounting and tax compliance → scale under a managed sales/distribution hierarchy.**

**Mzunguko** is that full journey in one platform: a chama becomes a registered self-help group/SACCO, gets matched to a viable business by the capital it raised, and runs that business with QuickBooks-grade bookkeeping, automated Kenyan tax/levy calculation, supplier alerts, and member-level capital tracking — all real-time, mobile-first, M-Pesa-native.

### Differentiation vs. competitors
- Competitors **track money**; Mzunguko **grows businesses** (matching + accounting + compliance).
- **Capital-to-Business matching engine** — nobody else does this.
- **Built-in formalization** (SHG/cooperative registration templates per country regulator).
- **Multi-tier sales & supervision hierarchy** (constituency → county → national → continental → global → super admin) as a built-in growth/distribution engine.
- **Real-time capital-ratio calculator** updating every member's dashboard on each payment.

---

## 3. Target Users & Roles

**End users**
- **Group/Chama members** — contribute, view dashboards, message, vote on ideas.
- **Group officials** — Chairman, Secretary, Treasurer, Signatories (role-based permissions; can assign roles down the hierarchy).
- **Solo entrepreneurs / existing businesses** — use the business + accounting pillars without a group.

**Internal / commercial hierarchy** (each tier supervises the tier below, assigns roles, and receives weekly/monthly/financial+operations reports):
1. Constituency sales rep
2. County manager
3. National manager
4. Continental manager
5. Global manager
6. **Super Admin** (platform owner)

### Role & permission matrix (initial)

| Capability | Member | Treasurer | Secretary | Chairman | Sales (tiered) | Super Admin |
|---|---|---|---|---|---|---|
| View own dashboard / capital ratio | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| Record a contribution/payment | — | ✅ | — | ✅ (approve) | — | ✅ |
| Approve/issue receipts | — | ✅ | ✅ | ✅ | — | ✅ |
| Assign roles | — | — | — | ✅ | ✅ (down-tier only) | ✅ |
| Edit bylaws / group profile | — | — | ✅ | ✅ | — | ✅ |
| Run P&L / reconciliation | — | ✅ | ✅ | ✅ | view | ✅ |
| View tier reports (groups, subs, members) | — | — | — | — | ✅ (own tier + below) | ✅ |
| Manage subscriptions/billing | — | ✅ | — | ✅ | — | ✅ |

> Implemented with Clerk **Organizations** + custom roles/permissions and a row-level access policy in the database.

---

## 4. Scope — The Four Pillars

### Pillar 1 — Table Banking → Registered Group  *(FIRST BUILD)*
The foundation. Chosen to build first because it creates the group, the members, the money, and the capital data every other pillar depends on.

**Features**
- Group creation, member onboarding (profile: photo, contacts, designation/role).
- **Merry-go-round engine:** rotating contribution schedules, recipient order, cycle tracking, penalties/fines.
- **Treasurer-recorded payments → real-time fan-out:** when the treasurer records a contribution, every member's dashboard updates live, and an **internal capital-ratio calculator** recomputes each member's share of total capital after every payment.
- **Payments integration:** M-Pesa Daraja API (STK Push for collection, C2B Paybill/Till, B2C for disbursements/payouts), plus bank/manual entry. *(Daraja 3.0, current as of 2026.)*
- **Acknowledgement & receipts:** payment-confirmation notifications + downloadable PDF receipts (group name, member, amount, date, running capital, reference).
- **Formalization wizard:** guides the group from informal chama to a registered Self-Help Group / SACCO (see §6 regulatory templates) — composition, membership, formation minutes, bylaws, officials.
- **Real-time responsiveness** across web + mobile (websockets/live queries).

### Pillar 2 — Capital-to-Business Matching
- User enters **capital available** (e.g. from the group's table-bank balance) and selects a **desired industry** from a list.
- Engine **randomly generates business ventures** within that capital band, filtered to the chosen industry category.
- **Reset button** re-rolls a fresh set of ventures within the same capital/industry.
- **Save/Book ≥3 ideas** into a shortlist to compare and discuss before the group decides on one.
- Each venture card: estimated startup capital, margin profile, risk note, why it fits the capital band.

### Pillar 3 — Accounting (QuickBooks-style) + Compliance + Admin Hierarchy
- **Data entry** for daily Profit & Loss: sales, COGS, expenses, stock.
- **Auto-calculation:** daily P&L, then **reconciliation daily → weekly → monthly → yearly**, each with metric analysis: transactions made, fast-moving vs. slow-moving, sorted by sales, low/high sellers, **dead stock**.
- **Financial suggestions report:** what to improve, what to restock, what to drop.
- **Supplier integration & stock alerts:** link supplier contacts; when stock is low → alert manager + subscribed supplier to supply; **pre-runout warning** + **critical-runout warning** at POS, dashboard, and via messaging.
- **Tax & levy auto-calc (Kenya):** PAYE, VAT (16%), Tourism/Catering Levy (2%), Standards Levy where applicable — with links to the correct remittance bodies (KRA iTax/eTIMS, Tourism Fund), configurable per country and business type.
- **Member profiles + messaging:** photo, contacts, designation; in-app message, chat, and call.
- **Subscriptions:** 10 currency-units/month (in the country's currency), **first month free**, customisable **country flag**.
- **Multi-tier admin side panel:** super admin sees all individuals/groups/businesses onboard, their subscriptions, and their assigned sales team across constituency → county → national → continental → global. Tabulated analytics: groups/businesses, members subscribed per group, revenue, operations. Each tier supervises the tier below, assigns roles, and pushes weekly/monthly/financial reports upward.

### Pillar 4 — Stawi SACCO+ (Savings & Credit Services) *(added 2026-07-06)*

**The unique MVP — the Graduation Engine.** Deep research into why microfinance groups fail to graduate into SACCOs, then banks, then listed institutions surfaced eight consolidated failure gaps. Each is productised as a Stawi feature (implemented in `core/graduation.ts` → `FAILURE_GAPS`):

| # | Failure gap (research-backed) | Stawi solution |
|---|---|---|
| 1 | **Governance failure & insider fraud** (e.g. KUSCCO: Sh13.8B lost, insolvency of Sh12.5B) | Dual-approval on disbursements, immutable audit trail, RBAC, treasurer actions visible to all members live |
| 2 | **Liquidity breaches & runs** (SASRA 15% liquid-assets floor ignored) | Live liquidity meter + alerts + automatic lending brake near the floor |
| 3 | **Thin core capital** — cannot absorb losses or meet licence thresholds | Per-member share-capital tracking + capital-adequacy gauge vs next stage |
| 4 | **Poor books / unauditable records** — audited accounts impossible | Digital double-entry from day one (Pillars 1+3); audit-ready exports anytime |
| 5 | **Opaque lending & high NPLs** — committee/relationship loans | Deterministic, explainable eligibility scoring; multiplier limits; enforced guarantor coverage |
| 6 | **Ballooning physical costs** (branches, paper, wages → rate hikes & hidden charges; digital accounts cost 80–95% less to serve) | Branchless by design: onboarding, deposits, loans, notifications, CRM all digital; humans only where regulators demand |
| 7 | **Uninformed membership & low trust** | Member-visible capital ratios, plain-language statements, in-app education nudges |
| 8 | **Regulatory non-compliance** (dual/absent supervision) | Country-aware compliance packs, aligned T&Cs, filing reminders, stage-gated checklists |

**The graduation ladder** (assessed live per institution): informal chama → registered self-help group → SACCO (BOSA) → deposit-taking SACCO (FOSA) → microfinance bank → commercial bank → **listed** (the Equity Building Society → Equity Bank → NSE path). Each rung has machine-checkable prudential requirements (capital adequacy ≥10–14.5%, liquidity ≥15–20%, NPL ≤5%, audited years, profit years, member thresholds, governance stack) with a readiness % and a member-visible gap report.

**Products (v1, all four confirmed):**
1. **Savings** — interest on deposits **10% p.a.** (accrued monthly); share capital pays **13% p.a. dividends** (benchmarked to top DT-SACCOs: Mwalimu 13%/10%, Stima 20%/13%).
2. **Loans** — reducing-balance only (the honest method): **Development 1.0%/mo, 3× deposits, 36 mo · Instant Emergency 1.5%/mo, auto-disbursed under cap, no guarantors · Business Boost 1.2%/mo, 24 mo** (feeds Pillars 2–3 ventures). Risk-based pricing: Tier A base rate, B +0.25, C +0.5.
3. **Qualifiable determinants (credit scoring)** — deterministic 100-point score, every point explained: tenure (15), saving streak (25), on-time repayment (30), borrowing headroom (20), security/guarantor coverage (10); hard blocks on defaults, multiplier breach, under-coverage. Approval floor 45; no committee.
4. **Remittances & transfers** — flat digital fee tiers (10 / 50 / 0.4% capped at 200 units) under mobile-money/bank rates.

**Credit-graduation tiers (party level, added 2026-07-07):** while the Graduation
Engine tracks the INSTITUTION up the chama→listed ladder, every PARTY on the credit
trail (member, group, business) graduates through earned tiers from **wholistic
performance** — saving discipline, repayment behaviour, tenure, loans cleared, and
Pillar-3 books kept: **Seed → Sprout → Harvest → Mkubwa** (`core/tiers.ts`, 8 tests).
Each tier unlocks concrete benefits: deposit multiplier 1×→2×→3×→4×, rate discount
0→−0.25%/mo (floor 0.5%), instant guarantor-free caps 10k→100k units, terms 6→36 mo.
Defaults block progression; the top tier requires 6+ months of books — transparency
is literally rewarded with cheaper money. Rendered as the first section of the
/sacco Graduate tab (tier cards + "you are here" + gap checklist + readiness %).

**Retention & Mobilization engine (added 2026-07-07):** the Graduate-tab pattern,
platform-wide. `core/moments.ts` catalogs 12 machine-triggered "moments" across all
4 pillars × 4 goals (retain/mobilize/refer/monetize) — streak milestones, payout
countdowns, member-drive gaps, venture unlocks, clean-books streaks, tax deadlines,
interest posted, tier-close, ladder progress, trial ending — each with ready channel
copy (in-app hook, ≤160-char SMS, email subject, poster headline, newsletter blurb).
Rendered as `MomentsStrip` on the dashboard; **the same catalog is the single source
for ALL CRM content** — rules in `docs/CRM-CONTENT-GUIDE.md` (no trigger → no send;
≤2 touches/week; failure-gaps are the marketing spine, never name competitors;
prudential figures never in member-facing content). SACCO+ activation marketing is
always personalised: `SaccoActivationCard` computes the merits a performing party
ALREADY earned (entry tier, rate, limit, monthly interest on current pot). Landing
page leads the niche: "Eight reasons microfinance collapses. Eight guard-rails,
built in." (+7 moments tests; ~150 core tests.)

**Institution-ladder visibility (decided 2026-07-07):** role-graded, not hidden.
Members SEE the ladder position + readiness % (it recruits and retains — gap #7
"uninformed membership" is a failure cause, and the 500-member DT-SACCO check is
delivered by members themselves) plus a "how members move this forward" nudge.
Prudential internals (liquidity/capital-adequacy/NPL ratios + detailed gap
checklist) are OFFICIALS+ only — a misread liquidity figure can trigger the very
run it guards against. SUPER_ADMIN (env `SUPER_ADMIN_CLERK_IDS`) sees everything
across tenants via /admin. Implemented: `getViewerRole()` in lib/data →
`SaccoStudio viewerRole` prop gates the Graduate tab sections.

**Opt-in positioning (locked 2026-07-07):** SACCO+ is NEVER a prerequisite.
Many target groups will join Stawi for Pillars 1–3 alone — to solve financial-books
conflicts and get transparent, publishable reports — while already saving/borrowing
with another institution. Pillars 1–3 work fully standalone; SACCO+ surfaces as an
**optional activation card on the dashboard and a compact banner on /books**
("Banking elsewhere? No problem…"), one tap, no lock-in. Their Pillar 1–3 history
(contributions, tenure, books) silently builds their fast-track KYC and loan-limit
standing, so the day they switch, onboarding is instant and their rate is already
earned. Acquisition thesis: win the books first, win the wallet later.

**Onboarding (toggleable entity types):** registered groups (**fast-tracked** — KYC reused from the Formalization wizard; first-hand enrolment target), businesses, individuals (lowest barrier: 200 units), institutions/unions/organizations. Each type has its own doc checklist, minimum opening deposit, and minimum share capital.

**Digital-first operating model:** no branches/rentals/paper; system intelligence handles scoring, approvals, alerts, statements; CRM, awareness campaigns, and mobilization run in-app; human involvement only where a country's regulator requires it. This cost base is what funds the competitive rates.

**T&Cs:** submissive to each country's cooperative/financial regulator (extends `legal/SUBSCRIPTION-TERMS.md` + Pillar 3 compliance packs).

**Implementation:** `core/savings.ts`, `core/credit.ts`, `core/graduation.ts` (+37 tests) · Prisma: `SaccoAccount`, `SaccoTxn`, `Loan`, `LoanGuarantor`, `LoanRepayment` + 4 enums · Web: `/sacco` (Join / Save / Borrow / Graduate tabs).

---

## 5. Out of Scope (for v1)
- Cross-border FX / multi-currency settlement (display localization only at first).
- ~~Lending/credit scoring engine (phase 2).~~ **Delivered in Pillar 4 (2026-07-06).**
- Native voice/video calling infra (start with click-to-call / VoIP handoff).
- Full ERP inventory beyond stock alerts.

---

## 6. Regulatory Templates (Kenya — researched)

**Self-Help Group (chama) registration** — governed by the **Community Groups Registration Act, 2022**, via the **County Department of Social Protection**:
- Minimum **5 members** with a common objective.
- Steps: name search → draft constitution + foundational meeting (elect officials, record minutes) → application form + constitution + minutes + ID copies → submit + pay fee (~**KES 1,000**) → processing **14–30 days**.
- Post-registration: open group bank account, obtain **KRA PIN** if engaging in taxable activity.

**SACCO / Cooperative Society** (for groups that scale) — under the **Co-operative Societies Act**, registered with the **Commissioner for Cooperative Development**:
- Member ≥15 yrs; board members ≥18; **common bond**; SACCO needs **≥20 members** (or ≥10 founding members with a common bond).
- Documents (×4 copies): proposed **bylaws** (English), application form, supplementary info, economic appraisal, **minutes of formation meeting** signed by chair + secretary, member list with IDs/signatures, evidence of common bond.
- Bylaws cover purpose, governance, member rights, loan policies, dissolution. Timeline **~2 months**.

**Taxes & levies (Kenya 2026)** — auto-calc targets:
- **PAYE** — banded 10% → 35%; remit by **9th** of following month.
- **VAT** — **16%**; register if taxable supplies ≥ **KES 5M/yr**; file via iTax/**eTIMS** by **20th**.
- **Tourism/Catering Levy** — **2%** of gross sales (accommodation, food, drink, services); to the **Tourism Fund** by **10th**. (Successor to the old Catering & Tourism Development Levy.)
- **Standards Levy** (manufacturing) — **0.2%** of monthly turnover, capped KES 4M/yr, exempt below KES 5M.

> The data model stores these as a **configurable rule pack per country + business type**, so Nigeria/others plug in later.

---

## 7. Technical Architecture

**Monorepo** (Turborepo) with shared packages:
```
/apps
  /web        → Next.js 14 (App Router) — member + admin web app
  /mobile     → Expo / React Native — member app (iOS + Android)
/packages
  /ui         → shared design system (frontend-design skill output)
  /core       → business logic: capital-ratio calc, matching engine, P&L, tax rules
  /db         → schema + queries (Postgres on DigitalOcean Managed DB)
  /api        → tRPC or REST layer
```
- **Auth:** Clerk (Organizations = groups/businesses; roles & permissions; per-member profiles).
- **DB:** PostgreSQL (DigitalOcean Managed). Real-time via Postgres LISTEN/NOTIFY or a websocket layer (e.g. Supabase Realtime/Ably) for live dashboards.
- **Payments:** M-Pesa **Daraja 3.0** (STK Push, C2B, B2C) behind a payment-provider abstraction (so Flutterwave/Paystack/banks slot in per country).
- **Files/receipts:** PDF generation service; object storage (DO Spaces).
- **Notifications:** push (Expo), SMS (Africa's Talking), in-app, email.
- **Deploy:** DigitalOcean App Platform (web + API), Managed Postgres, Spaces. CI/CD from GitHub. **All work pushed to GitHub.**

---

## 8. Plan-Mode Execution Roadmap

Following your 5-step method, run in **plan mode**, updating this PRD continuously.

| Step | Phase | Output | Status |
|---|---|---|---|
| **1. Research & spec** | This document + memory files | PRD v0.1, regulatory research, name options | ✅ this session |
| **2. Claude Design** | Design system + key screens (frontend-design skill): member dashboard, capital-ratio view, business-match, admin hierarchy panel | Figma-grade HTML/React design artifacts | ⏭ next |
| **3. Build** | Monorepo scaffold → Pillar 1 (table banking + M-Pesa + receipts) → Pillar 2 (matching) → Pillar 3 (accounting/compliance/admin) | Working web + mobile MVP | ⏭ |
| **4. Subagents** | Harness specialized agents: Research, Operation (fix/rebuild codebase), Support, Sales, Finance, Legal | Automated dev + ops loop | ⏭ |
| **5. Deploy** | DigitalOcean App Platform + Managed Postgres + Spaces, CI/CD from GitHub | Live staging → production | ⏭ |

**Suggested milestones**
- **M1 (Weeks 1–2):** Design system + Pillar 1 screens; monorepo scaffold; Clerk auth; group/member models.
- **M2 (Weeks 3–4):** Table-banking engine + M-Pesa STK Push + real-time capital ratio + PDF receipts.
- **M3 (Weeks 5–6):** Formalization wizard (Kenya SHG/SACCO templates); subscriptions (free first month).
- **M4 (Weeks 7–8):** Business-matching engine.
- **M5 (Weeks 9–12):** Accounting (P&L, reconciliation, tax auto-calc), supplier alerts, admin hierarchy + analytics.
- **M6:** Deploy + pilot with 1–2 real chamas.

---

## 9. Open Questions (need your input before Step 2)
1. **Name** — confirm Mzunguko, or pick Stawi / Kibubu / something else.
2. **First-build pillar** — I've selected **Pillar 1 (Table Banking)** as foundational; confirm or override.
3. **Theme direction** — light or dark, and any brand feel (e.g. trustworthy-fintech, warm-community, bold-pan-African)?
4. **Business-matching ventures** — should venture ideas come from a curated/research-backed dataset, or be AI-generated on the fly within the capital band?
5. **M-Pesa** — do you already have a Safaricom Daraja account / Paybill, or should the build start in sandbox?

---

## 10. Success Metrics
- Groups onboarded; % that formalize; % that launch a business.
- Active members; contributions processed (volume + KES value).
- Subscription conversion after free month; retention.
- Businesses with daily P&L entries; tax filings assisted.
- Sales-hierarchy coverage (groups per tier).

---

*Sources for regulatory/payment research are listed in the chat message accompanying this PRD.*

---

## 11. Implementation Status — v1.0 (2026-06-22)

Stawi is **built and deployment-ready** as a global, multi-tenant SaaS. Everything
below is implemented and parse-clean; **98 core unit tests pass**. The repo is a
Turborepo monorepo (~120 files).

### Monorepo
```
apps/web      Next.js 15 (App Router, server actions) — all UI + API routes
apps/mobile   Expo / React Native scaffold (own design system, shared tokens)
packages/core Domain logic — 13 modules, 98 Vitest tests
packages/db   Prisma schema (13 models / 10 enums) + tenant-scoped repository + seed + RLS
```

### `@stawi/core` modules (all tested)
`capital` (capital-ratio), `rotation` (merry-go-round), `tax` (Kenya PAYE/VAT/levies),
`match` (business-venture generator), `mpesa` (Daraja STK helpers), `accounting`
(P&L, reconciliation, stock movement, suggestions), `formalization` (SHG/SACCO steps),
`receipt`, `notifications`, `compliance` (12-country registry), `moderation`
(abuse/hate/incitement gate), `plans` (Free/Starter/Growth/Enterprise), `tenancy`
(slug resolver, isolation guards), `payments` (provider routing).

### Web routes
- Pages: `/` `/dashboard` `/match` `/books` `/formalize` `/sacco` `/community` `/admin`
  `/subscribe` `/terms` `/receipt/[ref]` `/sign-in` `/sign-up`
- API: `/api/health`, `/api/mpesa/stk`, `/api/mpesa/callback`,
  `/api/billing/checkout`, `/api/billing/webhook` (Stripe), `/api/webhooks/clerk`

### Integrations — all drafted, **live-on-key**
| Integration | State |
|---|---|
| **Clerk** auth + `/sign-in` `/sign-up` + middleware | wired |
| **Clerk webhook** (org→Tenant, membership→TenantMember, svix verify) | live on `CLERK_WEBHOOK_SECRET` |
| **M-Pesa Daraja** STK push + callback (pending→confirmed persistence) | live on Daraja keys |
| **Stripe** Checkout (subscription, 30-day trial) + webhook (HMAC verify) | live on `STRIPE_SECRET_KEY` |
| **Paystack / Flutterwave** | routed by country, stubs until keyed |
| **Africa's Talking** SMS acknowledgements | live on AT keys |
| **Postgres (Prisma)** tenant-scoped queries + `rls.sql` | live on `DATABASE_URL` |

### Multi-tenant model
Clerk Organization → **Tenant** (billing/isolation boundary, `clerkOrgId`), owning
Groups. Isolation enforced at the query layer (`getTenantContext`, `assertSameTenant`,
`tenantScope`) + slug resolver (`umoja.stawi.app` or `/t/umoja`) via middleware +
`prisma/rls.sql`. See `TENANCY.md`.

### Trust, safety & legal
- Content-safety gate (`moderation`) on server actions + `ModeratedTextarea`; blocks
  abuse/incitement/hate, flags profanity, defeats leetspeak. `ModerationLog` audit table.
- Subscription **Terms & Conditions** template — `legal/SUBSCRIPTION-TERMS.md` (+ `/terms`
  summary + acceptance gate). ⚠️ needs per-market legal review.
- `COMPLIANCE.md` — 12-country regulatory registry (⚠️ rates indicative, verify locally).

### Pillar 4 — SACCO+ (added 2026-07-06)
- `core/savings.ts` (entity onboarding, txn engine, 10% deposit interest, 13% dividends,
  remittance fee tiers, 15% liquidity guard), `core/credit.ts` (3 loan products,
  100-point explainable eligibility score, risk-tier pricing, reducing-balance
  amortization), `core/graduation.ts` (8 failure gaps → solutions, 7-stage ladder
  assessment) — +37 tests (135 total).
- Prisma: `SaccoAccount`, `SaccoTxn` (dual-approval field), `Loan`, `LoanGuarantor`,
  `LoanRepayment`, 4 enums.
- Web: `/sacco` — Join (entity toggle, fast-track for registered groups) / Save /
  Borrow (live score + schedule) / Graduate (ladder + gap report) tabs.

### AI-native agents
`.claude/agents/`: research, operation, support, sales, finance, legal + README
(Capture→Curate→Store→Execute→Experience recursive context loop).

---

## 12. Continue From Here (next-session backlog)

**External-account wiring (go-live) — see `PRE-DEPLOY-CHECKLIST.md` + `DEPLOYMENT-RUNBOOK.md`:**
1. Provision DigitalOcean Managed Postgres → `DATABASE_URL`; run generate + migrate +
   seed; `psql -f packages/db/prisma/rls.sql`.
2. Clerk keys + register `/api/webhooks/clerk`.
3. M-Pesa Daraja sandbox keys.
4. Stripe key + register `/api/billing/webhook`.
5. `doctl apps create --spec .do/app.yaml`; set SECRET env values; GitHub Actions secrets.
6. Domain + wildcard `*.stawi.app` for tenant subdomains.

**Code TODOs that activate with a live DB/keys — ✅ ALL DONE 2026-07-07:**
- ✅ Stripe webhook → `activateSubscriptionForTenant` flips Subscription ACTIVE (live on DB).
- ✅ `withTenantRls` repo helper sets `app.tenant_id` per transaction.
- ✅ rls.sql now covers ALL tenant-owned tables (group-, business-, sacco-, loan-chained).
- ✅ Concrete Paystack (`lib/paystack.ts`) + Flutterwave (`lib/flutterwave.ts`) init/verify, live-on-key.
- ✅ Pillar 4 wired end-to-end: repo (getSaccoAccounts/openSaccoAccount/postSaccoTxn dual-approval/applyForLoan/accrueMonthlyInterest), server actions (open/txn/loan), data provider seed fallback.
- ✅ `/api/cron` (CRON_SECRET-guarded): month-end interest accrual (idempotent) + subscription dunning.

**Pre-deployment audit (2026-07-07) — PASSED, findings fixed:**
- FLW env-name mismatch fixed (lib reads `FLW_SECRET_KEY`, legacy alias kept).
- `.do/app.yaml`: added PAYSTACK/FLW/CRON/AT secrets + MPESA_ENV/SHORTCODE.
- `.github/workflows/cron.yml`: daily scheduler → /api/cron (needs CRON_URL/CRON_SECRET repo secrets).
- README rewritten to four pillars + opt-in note; PRE-DEPLOY-CHECKLIST steps 12–13 added.
- seed.ts seeds a SACCO+ account (Umoja opted in) for DB-mode parity.
- SACCO+ opt-in entry points: `SaccoActivationCard` on /dashboard (full) + /books (compact).

**Product backlog (not yet built):**
- ✅ Real-time push (2026-07-07): SSE bus (`lib/events.ts` + `/api/events` +
  `LiveRefresh`) — server actions publish, every open dashboard refreshes <1s.
  (Swap in-process bus for Redis pub/sub when scaling to multiple instances.)
- ✅ /sacco page wired to data provider + server actions (open account, deposit,
  submit loan application) with demo-mode fallback (2026-07-07).
- ✅ Mobile SACCO+ screen (`apps/mobile/SaccoScreen.tsx` + tab switcher) (2026-07-07).
- Member messaging/calling beyond the moderated composer; i18n/localization of
  UI strings + per-market Privacy Policy;
  receipts to PDF via DO Spaces; reconcile Clerk-Org-as-Group vs Tenant (current:
  Org→Tenant, Group.clerkOrgId retained).

---

## 13. Skills & Tools Used

- **`frontend-design`** (Anthropic skill) — drove the "warm savanna fintech" design
  system (Fraunces × Hanken Grotesk × IBM Plex Mono), the 7-pillars-of-UX bar, and all
  web UI; also the self-contained HTML previews (`design/stawi-prototype.html`,
  `design/stawi-app-preview.html`).
- **WebSearch** — Kenya SHG/SACCO law, KRA 2026 tax/levy rates, M-Pesa Daraja 3.0,
  competitor scan (Chamasoft/SmartChama/MyChama). Cited in the spec.
- **Sandbox (bash) + esbuild + Vitest** — every file authored via `/tmp` heredoc →
  copy-to-mount → esbuild parse-check + line-count verify (the mounted folder
  intermittently truncates large editor writes — see operation-agent note); core logic
  driven by 98 Vitest tests.
- **Memory files** (`/spaces/.../memory/`) — cross-session continuity.
- Not used but available and relevant for next phases: `pptx`/`docx` (investor deck,
  formal docs), `xlsx` (financial models), `pdf` (receipt generation), Figma skills
  (design handoff). Per the user's 5-step method, `frontend-design` = step 2 (Claude Design).
