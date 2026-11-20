# Stawi PRD v3 — restructure for informal groups (draft for owner approval, 20/11/26)

> Owner brief, 20/11/26: serve the informal, often non-literate table-banking
> group first; let what they say become formal documents; carry the same group
> into a business, into honest books, and into savings and credit with Stawi.
> Find out why groups, their businesses and SACCOs fail, make each failure a
> feature, and copy what the strong ones do.
>
> Status: **draft — nothing here is built yet.** Figures marked *(verify)* must be
> confirmed against the named source before they go into code.

---

## 1. What the owner asked for, per pillar

| Pillar | Owner's words, condensed |
|---|---|
| **1. Table banking → registered group** | Informal, often non-literate groups. Areas for officials, agendas and minutes; members type a few points **or speak** (owner confirmed voice, 20/11/26) and the engine writes the formal document. Group goals ("buy chairs, sufuria, plates") with targets. A contribution tracker that auto-calculates each member's share. Built on Kenya's registration requirements, cross-checked globally. |
| **2. Capital → business matching** | Match ideas to the capital raised and the chosen industry; show several, the group shortlists **at least 3** and confirms one. Give them the tools to decide: demand and supply, governance, risk; a researched verdict on whether the idea is right. |
| **3. Accounting (QuickBooks + POS)** | Very simple on a phone, full on desktop. Business profile (name, logo, mission, vision). Sales, purchases, expenses, stock; fast-, slow- and dead-stock analysis with advice on what to stock more or less. Taxes, PAYE and levies per country, so they never need to leave Stawi. |
| **4. Stawi SACCO+ (savings & credit)** | Position Stawi as their savings and credit provider. Because we already hold their member list, minutes and statements, they auto-generate the loan pack lenders ask for (business proposal, last 6 sittings' minutes, statements) and forward it to Pillar 4. We read their statements with them and advise. Fill every gap that makes groups, their businesses and SACCOs fail; copy what makes the strong ones succeed. One app, one stop. |

---

## 2. Research findings

### 2.1 What a registered group needs in Kenya

**Registration (State Department for Social Protection, sub-county office)** — [source](https://socialprotection.go.ke/services-group-registration)
- Name search; **minutes of the meeting that asked to register, recording the elected officials**.
- **Signed member list:** name, position, mobile number, ID number, signature; **ID copies for all members**.
- **Constitution** with the application form; fee **KES 1,000** (CBO: KES 5,000).
- After registration: **annual renewal** (after the first two years), **annual progress report**, records available on request; non-compliance can mean deregistration.
- Constitution should state objectives, membership rules and how officials are chosen; changes of officials are notified and signed by officials, with verified minutes attached ([Kenyans.co.ke, 2019 — fees may have changed](https://www.kenyans.co.ke/news/39055-chama-circles-how-register-self-help-group-kenya)).

**Opening a group bank account** (I&M, typical of Kenyan banks) — [source](https://www.imbankgroup.com/ke/wp-content/uploads/sites/2/2025/07/Account-Opening-Requirements-for-Chamas.pdf)
- Registration certificate, constitution/by-laws, **resolution or minutes naming the signatories and their mandate**, signatories' IDs, KRA PINs and photos.

**What lenders ask a group for** (this is the Pillar 4 loan pack)

| Lender | Asks for |
|---|---|
| Youth Enterprise Fund group loan — [source](https://www.youthfund.go.ke/constituency-based-loan/) | ≥5 members; registration certificate and member list; signed bank-details form; **certified bank statements (last 3 months)**; **recent business records**; **group minutes authorising the borrowing and the guarantee**; all members' IDs; signed repayment undertaking; co-guarantee and lien on the group account; entrepreneurship training |
| Uwezo Fund — [source](https://uwezo.go.ke/faqs) | Registered group; **running table banking with evidence of monthly contributions**; bank account in the group's name; membership/leadership mix rules |
| Equity chama investment loan — [source](https://equitygroupholdings.com/ke/borrow/chamagroup/chama-investment-loan/) | ≥5 members, all 18+; **proof of existence for at least 2 years**; registered; personal guarantees or security |
| Hustler Fund group loan — [source](https://ke.kcbgroup.com/images/termsandcondition/faqgroupenterprise.pdf) | Registered with MSEA; ≥10 members in a common economic activity; each with ID and a mobile wallet; no member in default |
| Banks and SACCOs generally (owner's field experience) | A **business proposal** and the **minutes of the last ~6 sittings** |

**Conclusion:** every item a lender wants is something Stawi already captures or can capture as a by-product of normal use: members and IDs, minutes, monthly contribution records, statements, business records, a resolution to borrow. The **loan-readiness pack** is therefore a one-tap export, and the group's age, contribution streak and repayment history become its credit file.

### 2.2 How other countries do it (global cross-check)

| Country / model | What it adds to Kenya's list |
|---|---|
| India SHG–bank linkage (RBI/NABARD) — [RBI master circular](https://rbi.org.in/Scripts/BS_ViewMasCirculardetails.aspx?id=12665) | Banks grade groups before lending on **regular meetings, regular savings, internal lending, timely repayment and up-to-date books** *(verify exact grading table)*. → Stawi computes this grade automatically. |
| Savings groups / VSLA (CARE) — [CARE minimum standards](https://www.care.org/wp-content/uploads/2025/12/22_CA-VSLA-Minimum-Standards_Oct2025.pdf) | Fixed **saving cycle of 9–12 months** ending in a share-out; business plans and coaching after the first cycle. → Stawi adds cycle and share-out tracking, then nudges into Pillar 2. |
| Uganda Tier 4 Microfinance & Money Lenders Act 2016 — [Act](https://budget.finance.go.ug/sites/default/files/Tier%204%20Microfinance%20Institutions%20%26%20Money%20Lenders%20Act%202016-GAZETTED.pdf) | Community savings groups and SACCOs are a regulated tier with their own registration and reporting. → compliance pack per country. |
| Tanzania Microfinance Act 2018 + Community Microfinance Groups Regulations — [Act](https://tanzlii.org/en/akn/tz/act/2018/10/eng@2018-11-23) | Same idea: community groups registered under Tier 4. |
| Digital linkage evidence (CGAP / FinDev 2026) — [source](https://www.findevgateway.org/blog/2026/02/from-informal-to-investable) | Lenders expand credit "as trust and data accumulate"; groups repaying through existing meetings keep arrears very low; **digital records lower servicing cost**. |
| IPA / World Vision, Uganda & Malawi — [source](https://poverty-action.org/unlocking-potential-savings-groups-through-group-loans-and-digital-records-insights-our-baseline) | Paper ledgers lose and mis-record contributions; **smartphone ownership is low (20–29%) but basic phones are common (60–89%)** → Stawi must work on a basic phone too (USSD/SMS, voice). |

### 2.3 Why groups (chamas) fail

- **Theft and embezzlement** — about **13%** according to FSD Kenya research cited in [money254](https://money254.co.ke/post/chama-revolution-what-successful-chamas-know-do-why-many-fail).
- **No clear purpose or rules** — no agreed goals, contribution deadlines, penalties or exit rules ([Cytonn](https://cytonn.com/blog/article/Reasons-why-your-chama-will-fail), [Chamasoft](https://blog.chamasoft.com/chama-failure-a-deep-dive-into-common-pitfalls)).
- **Weak leadership and poor records** — officials can't keep accounts, and the rest can't check them.
- **Poor communication and low commitment** — missed meetings and payments build mistrust.
- **Investing without research** — copycat ideas, Ponzi schemes, get-rich-quick offers.
- **Many collapse within two years** (no exact figure published).
- Scale: **19.7%** of Kenyan adults use chamas and **8.7%** use SACCOs ([FinAccess 2024 via The Star](https://www.the-star.co.ke/news/infographics/2025-03-19-how-kenyans-saved-their-money-in-2024)).

**What successful chamas do:** a shared written purpose; elected chair, treasurer and secretary; minutes and cash-flow records every meeting; regular reviews; transparent tools; support for members in life events.

### 2.4 Why their businesses fail (6 months, 1 year, 3 years)

- Kenya: **46% of small businesses closed in their first year**; 2.2 million closed in 5 years (KNBS 2016 MSME survey, [Standard](https://www.standardmedia.co.ke/business/amp/news/article/2000221491/why-400000-smes-are-dying-annually)). Reasons given: **rising operating costs, falling income, losses**; also licences, competition, market access, credit. Experts add **copycat businesses** and **starting a business for lack of a job**.
- Global: **20.4% fail in year 1, 49.4% within 5 years, 65.3% within 10** (US BLS via [US Chamber](https://uschamber.com/co/start/strategy/why-small-businesses-fail)). Top causes: **cash flow**, **no real demand**, poor management, **mixing business and personal money**, weak marketing, **inventory mistakes** (over- and under-stocking).

### 2.5 Why SACCOs fail or stop growing — and what the strong ones do

- **Fraud and weak governance:** SACCOs lose **over KSh 3 billion a year** to fraud and lax controls; **KUSCCO**: KSh 13.8 billion stolen, liabilities exceed assets by KSh 12.5 billion ([The Star, 2025](https://the-star.co.ke/news/2025-07-04-saccos-losing-sh3-billion-annually-to-internal-fraud-due-to-weak-governance-ncba)).
- **Bad loans:** SASRA's limit is **5% non-performing loans**; **188 SACCOs breached it** in 2024; the industry ratio was **8.39%** ([money254](https://www.money254.co.ke/post/188-saccos-flagged-for-breaching-loan-rule-what-it-means-for-members-news)). Deposit-taking SACCO NPLs rose 19.7% to KSh 53.1 billion ([CBK via Kenyans.co.ke](https://www.kenyans.co.ke/news/116059-saccos-show-strong-growth-amid-rise-loan-defaults-and-crb-listings-report)).
- **Pressure for unsecured insider loans** from big borrowers ([Business Daily](https://www.businessdailyafrica.com/bd/economy/influence-peddlers-raid-saccos-for-huge-unsecured-loans-5206664)).
- **Non-remittance** of deductions, **liquidity shortfalls**, **no deposit insurance** (SASRA pain points).
- **Strong SACCOs** (Stima, Kenya Police, Tower, Mwalimu, Harambee): consistent dividends (12–20%) and deposit interest (9–13%), strong digital systems, solid governance, a clear member base, loans at about **1% a month reducing balance** versus banks' 14–18% a year ([Serrari](https://serrarigroup.com/guides/wealth-builder/best-saccos-in-kenya-2026-ranked-by-dividend-returns)).

### 2.6 Kenya tax and levies a small business must handle (Pillar 3)

| Item | Rule | Source |
|---|---|---|
| PAYE | 10% to 24,000; 25% to 32,333; 30% to 500,000; 32.5% to 800,000; 35% above (monthly) | [KRA PAYE brochure 2026](https://www.kra.go.ke/images/publications/PAYE-Brochure-2026.pdf) |
| Affordable Housing Levy | 1.5% employee + 1.5% employer; deductible for PAYE | [PwC](https://taxsummaries.pwc.com/Kenya/Individual/Other-taxes) |
| SHIF | 2.75% of gross pay; deductible | [PwC](https://taxsummaries.pwc.com/Kenya/Individual/Other-taxes) |
| NSSF | employer matches; max KES 6,480 a month from 01/02/26 | [PwC](https://taxsummaries.pwc.com/Kenya/Individual/Other-taxes) |
| Turnover tax | businesses with KES 1M–25M a year; rate **3% per PwC, 1.5% after the Tax Laws (Amendment) Act 2024** *(verify with KRA)* | [PwC](https://taxsummaries.pwc.com/kenya/corporate) |
| VAT | 16% standard | PwC |
| eTIMS | electronic invoices required; Finance Act 2026 penalty: higher of 5% of tax or KES 10,000 (individuals) / 100,000 (companies) | [EY](https://taxnews.ey.com/news/2026-1445-kenya-enacts-finance-act-2026) |
| Tourism/catering levy | 2% for hotels, restaurants, catering | already in `tax.ts` |

---

## 3. What Stawi has today vs. the brief

| Pillar | Already built | Missing (this restructure) |
|---|---|---|
| 1 | Charter (officials, members, constitution, mission); Minutes form (attendance, agendas, AOB, contributions, fines); rough notes → formal minutes (`minutes-prose.ts`); month-end statement; capital-share calculator (`capital.ts`); formalisation wizard (`formalization.ts`) | **Voice minutes** in local languages; **icon-led, read-aloud UI** for non-literate members; **group goals** (chairs, sufuria) with progress; **per-member contribution tracker** with share %, streak, arrears; **registration pack** (signed member list, formation minutes, constitution) generated from the data; **annual renewal + progress report** reminders; savings **cycle and share-out** |
| 2 | Industry + capital → ideas; re-roll; shortlist ≥3 (`match.ts`, 6 industries) | **Kenya-specific industry list** (more, finer); **decision toolkit** per idea: demand check, competition, suppliers, licences, start-up budget, break-even, risk; **side-by-side comparison** of the 3; **group vote** recorded in minutes; **viability verdict** with reasons; anti-copycat and anti-Ponzi warnings |
| 3 | Ledger, P&L, period reconciliation, fast/slow/dead stock, restock advice, POS, barcodes, eTIMS, Z-report, Kenya VAT/PAYE/tourism/standards levy (`accounting.ts`, `pos.ts`, `tax.ts`) | **Business profile** (name, logo, mission, vision); **phone-first simple mode**; **separate business vs. personal money**; **cash-flow forecast + survival alerts** (the 6-month / 1-year / 3-year killers); **turnover tax, AHL, SHIF, NSSF**; **other countries' tax packs** |
| 4 | SACCO+ savings, loans, credit score, graduation engine, failure-gap list (`savings.ts`, `credit.ts`, `graduation.ts`); switched off (`SACCO_PLUS_ENABLED`) for Play launch | **Loan-readiness pack** (one-tap export of everything in §2.1); **group credit grade** (India-style) from real data; **statement interpretation with advice**; **business proposal builder** from Pillar 2 + 3; route the pack to Stawi credit **or** any outside lender; **insider-loan limits**, **NPL ≤5% guard**, **liquidity floor** surfaced to members |

---

## 4. The MVP — every failure becomes a feature

| # | Failure (from research) | Stawi feature that removes it | Pillar |
|---|---|---|---|
| 1 | Members can't write minutes | **Speak or type a few points → formal minutes** in English and Kiswahili, with attendance, agendas, resolutions and signatures; read-aloud for review | 1 |
| 2 | No clear purpose or rules | **Constitution builder** from simple questions (contribution amount, day, fines, exit rule, loan rule); **group goals** with targets and progress bars | 1 |
| 3 | Theft and hidden records (13%) | Every contribution recorded once, **visible to every member live**; per-member tracker and share %; dual approval on payouts; SMS receipt to each member | 1, 4 |
| 4 | Collapse within 2 years / low commitment | Streaks, meeting reminders, arrears alerts, **health score** for the group | 1 |
| 5 | Can't get a bank account or loan: missing documents | **Registration pack** and **loan-readiness pack** generated from data already in Stawi | 1, 4 |
| 6 | Investing without research; copycats; Ponzi | **Decision toolkit** and **viability verdict**; red-flag checker for "guaranteed returns" offers | 2 |
| 7 | No demand (≈45% of failures globally) | **Demand check** before confirming: who buys, how many nearby, price they pay | 2 |
| 8 | Cash-flow death in year 1 (46% in Kenya) | **Cash-flow forecast**, minimum cash buffer, **early-warning alerts**; the first 90 days coached step by step | 3 |
| 9 | Mixing business and personal money | Separate business wallet and ledger; owner's drawings recorded as drawings | 3 |
| 10 | Over- and under-stocking | Fast/slow/dead stock with **what to stock more / less**; reorder points | 3 |
| 11 | Tax penalties (eTIMS, levies) | All Kenyan taxes and levies computed; reminders before due dates; other countries via compliance packs | 3 |
| 12 | SACCO bad loans (NPL 8.39% vs 5% limit) | **Explainable credit score**, loan limit tied to savings, guarantor cover, **portfolio NPL guard** that slows lending near 5% | 4 |
| 13 | SACCO insider fraud (KSh 3bn a year) | Immutable audit trail, **insider-loan caps**, dual approval, member-visible books | 4 |
| 14 | Liquidity runs | Live liquidity meter and lending brake at the floor | 4 |
| 15 | Groups never graduate | Graduation ladder with a readiness % and the next concrete step | 1, 4 |

**Strengths copied from the best:** 1% a month reducing-balance loans; competitive deposit interest and dividends; digital-first, branchless service; open membership; consistent, published returns; strong governance visible to members.

---

## 5. Accessibility for non-literate members (applies to all pillars)

- **Voice in, voice out:** record minutes and entries by speaking; the app reads summaries and balances aloud. Kiswahili and English first, then other local languages.
- **Icons and colours** for every action (money in, money out, meeting, goal); numbers spoken as well as shown.
- **Basic-phone path:** SMS receipts and USSD balance/contribution checks for members without smartphones (most members have basic phones, few have smartphones).
- **Official checks before posting:** the secretary or chair approves the generated minutes; nothing is posted unreviewed.
- Phone-first by default; the same data on a full desktop layout for officials and businesses.

---

## 6. Build order (one PR per block, Pillar 1 first)

1. **Pillar 1a — contribution tracker and group goals** (per-member share %, streak, arrears; goals with progress). Pure core + tests, then the web screens.
2. **Pillar 1b — voice and simple minutes** (record → transcript → formal minutes; read-aloud; icon UI). Speech-to-text behind a provider-neutral adapter with a spend cap; owner approves the provider.
3. **Pillar 1c — registration pack and compliance** (signed member list, formation minutes, constitution builder, renewal and progress-report reminders).
4. **Pillar 4a — loan-readiness pack and group credit grade** (one-tap export; India-style grade from real data). Works for outside lenders even while SACCO+ stays off.
5. **Pillar 2 — decision toolkit** (Kenya industry list, demand check, comparison of 3, vote recorded in minutes, viability verdict, red flags).
6. **Pillar 3 — survival layer** (business profile, simple mode, cash-flow forecast and alerts, business/personal separation, full Kenya levies, other countries' packs).
7. **Pillar 4b — statement interpretation and advice; SACCO+ lending guards** (NPL guard, insider caps), still behind `SACCO_PLUS_ENABLED`.

Protected areas (money, credit, tax, KYC, tenancy, database) follow the standing rules: each block is a reviewable PR for owner approval; no autonomous money movement.

---

## 7. Decisions for the owner

1. **Approve this restructure** as the plan (or change the order in §6).
2. **Languages for voice:** Kiswahili and English first — which local languages next?
3. **Speech-to-text provider** for voice minutes (paid per minute; needs a spend cap). I will propose options with prices in the Pillar 1b PR.
4. **Basic-phone access (USSD/SMS):** needs an Africa's Talking USSD code — proceed?
5. **Stawi credit:** keep SACCO+ off (as now) and ship the loan pack for outside lenders first, or plan a licensed partner for credit?
