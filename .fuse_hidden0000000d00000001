# Product Requirements Document (PRD)
### Chama-to-Enterprise Platform — Name: **Stawi**

> **Locked decisions (2026-06-20):** Name = **Stawi** · Theme = **Trustworthy fintech base + warm pan-African accents** · Business-matching ventures = **AI-generated on the fly** (fits the reset/re-roll button) · M-Pesa = **Daraja sandbox first** (live Paybill before launch) · First build = **Pillar 1, Table Banking**.

**Owner:** Jacob (bucrepinfo@gmail.com)
**Status:** Draft v0.1 — Spec phase (no code yet, pending approval)
**Last updated:** 2026-06-20
**Primary market:** Kenya (launch) → Pan-African → Global
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

## 4. Scope — The Three Pillars

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

---

## 5. Out of Scope (for v1)
- Cross-border FX / multi-currency settlement (display localization only at first).
- Lending/credit scoring engine (phase 2).
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
