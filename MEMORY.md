# Stawi — session memory / start-here

## 20/11/26 (16:45) — Owner approved the researched prices (Kenya)
- Owner 16:20: "yes confirm the prices, i approve". Kenya groups: KES 10 a member a month, at least 50, at most 299 (year = 10 months); meetings-only groups half (5 a member, 30–149); business books free for a small shop (≤100 sales a month, one person), else KES 99 a month / 30 a week / 5 a day / 990 a year; a subscribed group's first business included. Other countries keep per-group prices until their per-member table is approved.
- Code: `PER_MEMBER_PRICES`, `perMemberMonthlyCents`, `quoteGroup({ meetingsOnly })`, `BOOKS_PRICES`, `quoteBooks` in `group-pricing.ts` (tests). `/api/billing/local` charges each group's exact price (meetings-only read from `Group.modules`). Subscribe page shows the per-member rule and "Pay KES … by M-Pesa" for the group.
- **Card in Kenya is held back:** Paddle has fixed prices (149/299), which would not match. Kenya pays by M-Pesa from the group's row; the card returns once a per-member card price is set up in Paddle (owner, Paddle dashboard). Nothing is charged on a guessed amount.
- Books billing is priced but not yet charged (no books checkout yet). Terms page updated.

## 20/11/26 (16:20) — Owner chose each group's own Till; by hand meanwhile; researched prices (awaiting owner)
- Owner 15:53: Till is right; for groups that hesitate, a role-assigned person updates the figures by hand; encourage Pochi la Biashara or a Till kindly (papers are hard for many). Owner 15:53: "merge them" (#29–#36) — #29 merged d958a87; the rest merge one by one at green heads (`merge-stack.sh`, no force-push; each branch's tree is checked unchanged after bringing main in).
- `packages/core/src/collect-ways.ts` (tests): four ways money comes in (cash, M-Pesa to our Till or Pochi, M-Pesa to an official's phone, bank), M-Pesa code check (10 letters and numbers; asked for, not forced), duplicate-code refusal, three kind tips with Safaricom sources.
- `recordContributionAction` (Treasurer only, unchanged) now takes `way` and `reference`; `recordContribution` stores `mpesaRef`. Channel CASH / MPESA_C2B / BANK. `CollectTips` under the Treasurer's form.
- Prices: `docs/PRICING-PROPOSAL-2026-11.md` (PR #28) now has competitor prices and a recommendation: groups KES 10/member (50–299); meetings-only half; books free small-shop plan then KES 99/month, 30/week, 5/day. Awaiting the owner's yes.

## 20/11/26 (17:50) — Messages inside the app (awaiting owner merge)
- Owner order: built-in messaging so people ask and answer without calls. "go on build" 15:38.
- `packages/core/src/messages.ts` (tests): two places — whole group, and "Ask the officials" (asker + officials only); `checkMessage` (500 letters, safety screen), `canSeeMessage`, `threadForNewMessage`, `summariseThreads` (unanswered first), 8 a minute.
- **Database (additive):** `GroupMessage` (group, channel, threadMemberId, senderMembershipId, body, createdAt) — in `rls.sql`'s group list.
- `apps/web/lib/messages.ts`, `GET/POST /api/groups/:id/messages`, `/messages` page (12-second refresh), "Messages" main tab, `messages` switch in `modules.ts`. Privacy page updated.
- Not done: person-to-person, unread counts, notifications, photos or voice, removing a message, an unanswered-question watch, mobile. See `docs/MESSAGES.md`.

## 20/11/26 (17:20) — Owner said yes: one shared papers list for savings and credit; daily alerts by SMS (awaiting owner merge)
- Owner 15:36: "yes, go ahead and fix all" to: merge #29–#33 in order; savings and credit reads the shared papers list; and the standing items (level 4 reaches every member; table and schedule for daily alerts). **The merges were blocked by the session's safety check and are still open** — the owner must merge, or allow it.
- `activationEvidence` (`packages/core/src/sacco-activation.ts`) now returns the document house's "start savings and credit" purpose (`buildHouseFromFacts` + `houseFactsFromStatements`). Same seven ids, same readiness for every existing test; needs 3 sittings and 3 months.
- Daily alerts: `packages/core/src/attention-notices.ts` (planner, tests), `apps/web/lib/attention-notices.ts`, job 4 in `/api/cron` (the existing 03:00 UTC run). **Database (additive):** `AttentionNotice` (group, matter key, level, member row id, sentAt) — in `rls.sql`'s group list. Officials only by SMS; no member's name in an SMS; 150 a run; `ATTENTION_SMS=off` stops them. SMS purpose is `transactional` (an alert about the person's own duty).
- Level 4 (every member sees it in the app) confirmed by the owner.
- **Still the owner's:** which price option, and where group contributions settle — "yes" did not pick between the options.

## 20/11/26 (16:50) — Use only what you need: section switches, three ways to start, books with no group (awaiting owner merge)
- Owner order: modules a group switches on and off (officials' posts, agenda items, money, ideas, books, savings and credit); open to everyone; warm, honest welcome for people who want one part; a business needs no group.
- `packages/core/src/modules.ts` (tests): seven switches, `resolveModules` (saved choice over the default; agenda needs meetings; savings and credit only where the platform flag is on), three ways to start, `watchAllowed`, `groupTabsFor`, `booksOnly`, four welcome notes.
- **Database (additive):** `Group.modules Json?`. Null = the default for the group's type. Applied by the release `db push`; no RLS change (Group is already covered).
- **Access change:** `/groups/new` no longer turns away accounts without a tenant; anyone signed in may start up to three (`MAX_SELF_STARTED`). A BUSINESS start creates its `Business` row so the books open at once.
- Web: `ModuleSwitches` ("Choose what you use", officials only, `saveModulesAction`), `OpenDoor` on the landing and start pages, `TabsHint` so the main tabs follow the group on screen, home screen and books page follow the switches, minutes form drops agenda or money sections, posts removed on the server for ordinary members when switched off.
- `docs/USE-ONLY-WHAT-YOU-NEED.md`, `docs/BOOKS-FOR-ANY-BUSINESS.md` (audit: what the books have, eleven gaps in build order).
- Not done: mobile app and `/api/mobile/*` do not read the switches; books gaps 1–11.

## 20/11/26 (16:20) — One money statement by day, week and month, checked (awaiting owner merge)
- Owner order: wherever a financial statement is needed, show it by day, week and month, harmonised and reconciled into one clear summary.
- `packages/core/src/money-summary.ts` (tests): group table money (posted meetings only) and business books on one calendar; buckets by day, week (Monday) and month; totals; two checks — day/week/month totals agree, and each meeting opens with what the last one closed with (a blank or 0 opening is "not written", never a gap).
- `GET /api/groups/:id/money` (members only; totals, no names). `MoneySummary` card, folded until opened, on the group and books pages: By day / By week / By month, Together / Group / Business. The papers pack gains the together table and the check lines.
- Read-only; no change to `accounting.ts`, `statement.ts` or any money path. No database change.
- Not done: opening and closing balance per period for the business (the books hold no opening cash figure); the country's own currency label (KES shown).

## 20/11/26 (16:00) — One house, four rooms: papers written once, used in every section (awaiting owner merge)
- Owner order: a group moving from group records to savings and credit, or into business, must not be sent back for documents Stawi already holds.
- `packages/core/src/document-house.ts` (tests): twelve papers (nine from group records, three from business books) with state, count and dates; five purposes (register, bank account, start a business, show records to a bank or fund, start savings and credit — the last only when SACCO+ is on); `checkPurpose` says what is ready and how many more are needed.
- `apps/web/lib/house.ts` + `GET /api/groups/:id/papers` (members only; no personal details). `DocumentHouse` card on the group, ideas and books pages. `/groups/:id/papers?for=` is the printable pack (officials only; no phone numbers).
- Honest limit stated on screen: an outside office may still ask for signatures or a stamp on the printed copy.
- Not done: SACCO+ activation still has its own checklist (`activationEvidence`, protected area) — proposed to read the shared one; a record of who opened a pack (needs a table); Kiswahili on the printed pack. No database change.

## 20/11/26 (15:30) — A member pays their own contribution (built, switched OFF; awaiting owner decision and merge)
- Owner order: a member finds a place to pay, taps Pay, and the M-Pesa request arrives; local way first, card second.
- `packages/core/src/contribution-pay.ts` (tests), `GET/POST /api/contributions/pay` (member of the group only, own membership only, 90-second double-tap guard, PENDING contribution confirmed by the existing callback), `PayContribution` card on the dashboard (quick amounts KES 20–1,000, or type one; smallest KES 10).
- **Off by default: `MEMBER_PAY_ENABLED=true` switches it on.** The request goes to `MPESA_SHORTCODE`; if that is Telpen's Paybill, Telpen would hold group savings (regulated). `docs/MEMBER-PAY.md` sets out three ways to settle (each group's own Till recommended) for the owner to choose.
- Card is not offered for contributions (Paddle may not collect savings). Other countries wait for pawaPay's live account.
- No database change.

## 20/11/26 (15:00) — Flow and escalation, Telpen Edu standing orders adopted, decorated cards and tabs (awaiting owner merge)
- Owner order: analyse all of Stawi, apply the escalation where it fits, reuse the Telpen Edu standing orders; good nav tabs; decorated cards in every section.
- `packages/core/src/escalation.ts` (pure, 16 tests): seven watches (officials_missing, rules_missing, meeting_overdue, minutes_not_posted, contributions_not_recorded, member_behind, member_absent). Ladder: responsible official → Chairperson → all officials → every member; empty posts fall through. Member-named matters stop at the officials. Days counted on the country's own clock.
- `apps/web/lib/attention.ts` filters on the server (viewer matched to the member list by signed-in phone; super admin sees all; demo mode shows the Chairperson's view). `AttentionCard` shows "Needs attention" on the group page; officials with nothing waiting see "All in order".
- `docs/FLOW-ESCALATION-AUDIT.md`: section → who acts first → watch, gaps, and which Telpen Edu orders were adopted. `docs/STANDING_RULES.md` gains rules 13–18.
- Design: `.s-card` (bead band in the pillar colour, soft wash, rising sun) on value banners and the cards of group, ideas, books, savings and admin screens; main tabs restyled (medallion on phones, pill on computers, bead line); group record tabs are now `.s-tabs` (44 px, scroll on small phones, proper tab roles).
- Privacy page now names the anonymous counts (on the value-banners PR).
- **Not done / owner decisions:** daily alerts by SMS or push need a small table and a schedule (protected); watches for month-end statement, daily sales and tax dates; a ladder for Books; confirm that level 4 may tell every member. No database change in this PR.
- Local note: `npm ci` could not reach the registry from the sandbox; core tests ran through the esbuild runner, web typecheck is proven by CI.

## 20/11/26 (afternoon) — Value banners, main tabs, sharing, countdown badges and engagement counts (awaiting owner merge)
- Owner brief: sell the value, not the app; every section shows a pain, the proof and the solution; verifiable, no flattery; easy for non-readers; fast tabs; sharing tools; countdown badges; count clicks, views and shares.
- `packages/core/src/value-props.ts`: 15 banners across the four pillars in English and Kiswahili. Each has a fact with a named source link and a `status`: `live` only where the tool exists today, `coming` for planned tools (voice minutes, buyer check, separate business purse, loan folder). Pillar 4 banners show only when SACCO+ is on. Tests enforce a source on every banner and no "guaranteed/best" wording.
- `packages/core/src/engagement.ts`: event whitelist (view, open, cta, share, tab, sort, source) with safe keys, share links (`?via=whatsapp`, never a person), share text, countdown maths.
- Web: `ValueBanners` (collapsible, tabs per pillar), `ShareBar` (device share, WhatsApp, SMS, copy), `CountdownBadge`, `AppTabs` (My group · Ideas · Books · Share: bottom on phones, top on computers). On the home page, dashboard, match, books, sacco and subscribe. The home page's long "why others failed" grid is now collapsed.
- Counting: public `POST /api/track` (whitelisted, rate-limited, 512-byte cap) → `EngagementCount` (day, event, key, count). **No user, phone, group, tenant or IP is stored.** Admin page shows the last 7 days. Protected areas touched at the owner's request: one additive table and one public route in the middleware list.
- Not done here: the privacy page does not yet mention these anonymous counts; AI enhancement (owner asked 14:42) is planned as its own PR on the existing opt-in adapter pattern.

## 20/11/26 — All African local prices approved (owner: "approve all prices")
- Second round approved the same day ("approve the second-round prices"), group / small group a month: Zambia ZMW 50/25, Malawi MWK 4,000/2,000, Mozambique MZN 150/75, Cameroon, Congo, Gabon XAF 1,300/650, Côte d'Ivoire, Senegal, Benin, Burkina Faso XOF 1,300/650, DR Congo CDF 5,300/2,700, Lesotho LSL 40/20, Sierra Leone SLE 55/27, Zimbabwe USD 2.99/1.49, Ethiopia ETB 380/190. Recorded only: those countries need Stawi country profiles (compliance) before a group can be set there.
- `FOUNDING_GROUP_PRICES` approved, group / small group (10 or fewer) a month: Kenya KES 299/149, Uganda UGX 8,400/4,200, Tanzania TZS 6,000/3,000, Rwanda RWF 3,000/1,500 (new rows), Nigeria NGN 3,500/1,750, South Africa ZAR 45/22, Ghana GHS 30/15. The rest of the world stays indicative (card through Paddle).
- Uganda, Tanzania and Rwanda added as country profiles in `compliance.ts` (VAT 18%, URA/TRA/RRA, cooperative registrars MTIC/TCDC/RCA, data protection PDPO/PDPC/NCSA; indicative, verify locally). Before this a Ugandan group fell back to the Kenya profile and KES. SubscribeGate's country list gained UG, TZ, RW and GH.
- Local payment there still opens only once the pawaPay (UG, TZ, RW, GH) or Paystack (NG, ZA) keys are set.
- pawaPay coverage checked 20/11/26 (docs.pawapay.io/v2/docs/providers, 21 countries): `LOCAL_METHOD` gains DR Congo (CDF), Lesotho (LSL), Zimbabwe (EcoCash, USD) and Ethiopia (ETB); Senegal adds Free Money; Sierra Leone is Orange Money only. pawaPay does not cover Mali, Liberia or South Sudan. Paddle does not sell in DR Congo or Zimbabwe, so mobile money is the only way there. Prices for the second-round countries await owner approval.

## 19/11/26 — Local way first in every country; card later via Paddle (owner standing order)
- Owner 19/11/26: "Always, we go for the most convenient mode of payment... Anything to do with the card, it comes later"; when a card is used, Paddle takes it and remits the VAT. Local direct sales carry Telpen's VAT (owner accepted).
- `packages/core/src/payment-rails.ts` v4: `LOCAL_METHOD` (KE M-Pesa; UG TZ RW GH ZM MW MZ CM CI SN BJ BF CG GA SL mobile money via pawaPay; NG bank transfer/USSD and ZA EFT via Paystack), `subscriptionRails({country, switches, localPriceApproved})` best first, full `PADDLE_BLOCKED_COUNTRIES`.
- `/api/billing/mpesa` became `/api/billing/local`: GET lists groups (chairman/treasurer) whose country has an open local way, with its name; POST routes by the group's country: Daraja STK, pawaPay deposit to the payer's own phone, or Paystack's page (redirect). `apps/web/lib/local-providers.ts` (same module as SellFindConnect/HarvestHub).
- New public callbacks `/api/billing/webhook/pawapay` (deposit re-read from pawaPay) and `/api/billing/webhook/paystack` (HMAC-SHA512 signature, then `/transaction/verify`); both settle through `settlePlanPayment` with provider + currency, full amount only, once.
- `PlanPayment.provider` (default "mpesa"), additive. SubscribeGate shows "Pay by <local way>" first, card second.
- A local way opens only with its keys (`PAWAPAY_ENABLED`/`PAWAPAY_API_TOKEN`/`PAWAPAY_ENV`, `PAYSTACK_ENABLED`/`PAYSTACK_SECRET_KEY`) AND an owner-approved price for that country (only KE today). Owner: approve the price table, open pawaPay/Paystack accounts.

## 19/11/26 — M-Pesa for the Stawi plan (owner: "Yes, build M-Pesa for Stawi and merge all")
- A group's chairman or treasurer pays the plan by M-Pesa (Daraja STK to their own verified phone) from `/subscribe`: in Kenya "Pay by M-Pesa" comes first (group picker when they run more than one), "Pay by card" (Paddle) second.
- `POST /api/billing/mpesa` sets the price on the server (`quoteGroup` with the group's real member count; small-group plan refused over 10 members; KES whole shillings only) and records a PENDING `PlanPayment`. `GET` lists the Kenyan groups the person may pay for.
- New table `PlanPayment` (additive; in `rls.sql`'s group-scoped list). The M-Pesa callback runs `settlePlanPayment`: a full, successful payment confirms it once and extends the group's `Subscription` (ACTIVE, `currentPeriodEnd` +1 or +12 months after whatever runs, free first month included); short or failed payments unlock nothing.
- `packages/core/src/plan-payment.ts` (`planPeriodEndAfterPayment`, `planPaymentCovers`, `PLAN_PAYER_ROLES`) + tests.
- Live M-Pesa needs the Daraja keys and Telpen's Paybill (in progress with Safaricom); until then the route answers "M-Pesa is not set up yet. Please pay by card."

## 19/11/26 (evening) — M-Pesa should lead in Kenya; Stawi can't charge it for the plan yet
- Owner refined the rule: the most convenient local method takes the lead over Paddle where we can charge it (Kenya: M-Pesa, 89.1% of 53.4 million mobile money subscriptions, CA Kenya March 2026). `subscriptionRails` now returns every way, best first (Kenya M-Pesa then Paddle).
- Stawi has no M-Pesa payment for the plan itself (the MPESA rail is a `pending` stub), so where Paddle sells, Paddle stays the way until that is built. Building it needs a pending-plan-payment table (database; owner approval).

## 19/11/26 — Paddle first wherever it sells (awaiting owner merge)
- Owner rule (19/11/26, with the merge of #23): Paddle takes priority in every country it sells to, Kenya included (it deducts and remits the tax); else a merchant of record that remits the tax (researched: none takes M-Pesa or mobile money); else the most popular local method (M-Pesa in Kenya).
- `packages/core/src/payment-rails.ts` (Paddle's blocked list incl. CF, CD, LY, ML, SO, SS, SD, ZW; `paddleSellsIn`, `subscriptionRail`) + tests. `/api/billing/checkout` uses Paddle only where it sells; elsewhere the country's own rail.
- Still open: M-Pesa for the Stawi plan (only needed in Kenya while Paddle is off).

## 19/11/26 — Cards through Paddle (merchant of record); Stripe webhook fails closed (awaiting owner merge)
- Owner 19/11/26: "we had agreed we use firms like Paddle that do an auto remittance of the tax", chose Paddle + M-Pesa for all five products. Cards: Paddle is the seller and charges, files and remits the tax. M-Pesa: direct sale, no VAT until Telpen Systems Ltd is VAT-registered.
- `packages/core/src/paddle.ts` (browser-safe: config, signature check with a server-supplied HMAC, paid item) + tests. `/api/billing/checkout` returns Paddle's public checkout details when `PADDLE_ENABLED=true` (keys `PADDLE_PRICE_{SMALL,GROUP}_{MONTH,YEAR}`, `PADDLE_CLIENT_TOKEN`, `PADDLE_WEBHOOK_SECRET`, `PADDLE_ENV`); `SubscribeGate` opens Paddle's overlay with `customData.tenantRef`. Webhook `/api/billing/webhook/paddle` (signed, idempotent activation; small-group price refused for groups over 10).
- Fixed: `/api/billing/webhook` (Stripe) accepted UNSIGNED events when `STRIPE_WEBHOOK_SECRET` was unset; anyone could activate a subscription. It now refuses (503) without the secret.
- Not built yet: M-Pesa for the Stawi plan itself (the `MPESA` rail in `lib/billing.ts` is still a `pending` stub; group contributions use Daraja separately). Needs a pending-subscription-payment record (schema, owner approval).
- Owner steps: Paddle website approval for getstawi.com; four Paddle prices (recurring, 30-day trial for "first month free"; likely USD); notification destination `https://getstawi.com/api/billing/webhook/paddle`; Fly secrets; `PADDLE_ENABLED=true`.

## 18/11/26 — group prices and founding price lock (awaiting owner merge)
- Owner approved 18/11/26 ("Agreed, go ahead and fix"): KES 299/month or KES 2,990/year per group; groups of 10 members or fewer KES 149/1,490; first month free; a year ahead = 10 months; founding price locked for groups joining in the first 12 months while they stay subscribed (cancelling ends it); other countries indicative until approved.
- Code: `packages/core/src/group-pricing.ts` (`quoteGroup`, `FOUNDING_GROUP_PRICES`, `lockHolds`, `isFoundingGroup`), tests `packages/core/test/group-pricing.test.ts`. Plans now carry `billing: PER_GROUP | CUSTOM` (no USD price); the FREE tier is the "Small group" plan (DB enum unchanged). `/api/billing/checkout` sets the amount on the server in the country's currency, takes `period: MONTH | YEAR`, and Stripe uses a yearly interval for YEAR. `subscriptionDueCents` default is KES 29,900.
- Owner env once launched: `STAWI_FOUNDING_UNTIL` (ISO date, launch + 12 months; unset = window open). Later prices for non-founding groups: `STAWI_GROUP_PRICES="KE:34900/17900"` (monthly/small, cents). Payments is protected: PR left for the owner to merge.

## 17/11/26 — Play payments policy: no Stawi plan purchases inside the Play app (awaiting owner merge)
- Owner instruction 17/11/26 ("streamline each to comply with Play Store policies"). Inside the Play app (TWA, package `ke.stawi.app`) Stawi plans are not sold: Kenya is not in Play's alternative-billing programmes. The TWA launch request's `Referer: android-app://…` sets a session cookie `stawi_play_app=1` in the middleware; `/api/billing/checkout` answers 403 and `/subscribe` shows "Stawi plans can't be bought in the Android app." No in-app link steers to outside payment. Group M-Pesa contributions are unaffected (not Stawi's digital service). Helpers in `packages/core/src/android.ts`; tests `packages/core/test/play-app-purchases.test.ts`. Same approach as HarvestHub and Telpen Edu. Payments is protected: PR left for the owner to merge.

## 17/11/26 — first production deploy (Fly app `stawi`, getstawi.com)
> **RESUME HERE (17/11/26):** provisioned live: Fly app `stawi` (fra, 512 MB), Neon `stawi` (Frankfurt, direct
> connection), Supabase `stawi` under the free org **Telpen Systems Ltd** (telpensystems@gmail.com account;
> the bucrepinfo org was at its 2-free-project limit), Africa's Talking team/app `Stawi` (username `stawi`,
> wallet KES 0 until topped up), domain **getstawi.com** (GoDaddy, 3 yrs; A/AAAA @ and *, `_acme-challenge`
> CNAME; Fly certs for getstawi.com + *.getstawi.com). Supabase: Send SMS hook → `https://stawi.fly.dev/api/auth/send-sms`,
> Phone provider on, OTP expiry 300 s, Site URL https://getstawi.com. Fly secrets: DATABASE_URL, Supabase URL/anon/
> service-role/SMS-hook secret, AT_USERNAME/AT_API_KEY, CRON_SECRET, NEXT_PUBLIC_APP_URL/ROOT_DOMAIN. GitHub:
> FLY_API_TOKEN, CRON_SECRET, CRON_URL + the four NEXT_PUBLIC_* variables. Supabase JWT secret is not used by the code.
- First GitHub deploy (run #27) failed in release.sh: rls.sql listed `SavedVenture` with the groupId tables, but it has
  `businessId`. Fix: move it to the Business-chained loop (every other table/column in rls.sql checked against the schema).
  Database/RLS is a protected area — PR opened for owner approval.
- First live sign-in (17/11/26) failed: Supabase's Send-SMS hook passes the phone as `2547…` (no +) and Africa's
  Talking rejects it before sending (outbox empty, hook → 502). Fix: `toSmsRecipient` (core, tested) in both AT senders
  (`lib/sms.ts`, `lib/notify.ts`). Sign-in is a protected area — PR for owner approval.
- Do NOT press Fly's "merge new files" (Launch UI) — it would replace this repo's fly.toml.

## 14/11/26 — SMS is transactional only (TELPEN sender)
- Owner: the "TELPEN" Africa's Talking sender ID is for transactional SMS only (sign-in codes, payment receipts). `sendSms(…, purpose)` in `apps/web/lib/sms.ts` and `lib/notify.ts` requires `'otp' | 'transactional'` and refuses anything else; promotion goes to members via in-app messaging. Guard: `packages/core/test/sms-transactional.test.ts`.

## Session 5 (07/11/26) — pickers scoped, dates day-first, filters in the URL
> **RESUME HERE (07/11/26):** sweep of the Telpen Edu bugs (a)–(e) fixed on 07/11/26, applied
> here (PR "fix: scoped pickers, day-first dates, consistent filters"). Owner/Chrome next steps
> are unchanged (Session 4 below); not deployed yet — Stawi has no Fly app, so no health check.
- **Shared core helpers (tested):** `packages/core/src/dates.ts` — `formatDate` (dd/mm/yy,
  `year:'yyyy'` → dd/mm/yyyy), `formatDateTime` (24 h, Africa/Nairobi), `weekdayOf`,
  `monthLabel`, `todayIso`; never uses the device locale, date-only strings never shift.
  `packages/core/src/scope.ts` — `uniqueBy`, `mergeGroupsById` (one row per group, most
  privileged role), `pickAllowedId`, `duplicateRosterPhones`, `meetingRefsOutsideRoster` +
  `allowedMeetingRefs`, `checkMeetingDates`, `statementMonths` / `checkStatementMonth` /
  `pickStatementMonth`, `parsePeriod`, `entriesInPeriod`. Tests: `test/dates.test.ts`, `test/scope.test.ts`.
- **Server rejects what the pickers hide (`apps/web/lib/meeting-guard.ts`, used by web actions
  and `/api/mobile/meeting|post-meeting`):** minutes may only name members on the group's saved
  charter roster (or ones the stored meeting already named); minutes post only for a meeting
  already held (Nairobi date), next meeting not before it; month-end statement posts only for a
  month with recorded meetings, not in the future, and its figures are recomputed server-side
  from stored meetings (client numbers ignored; narrative moderated). Books ledger writes need
  membership of the business's group. Charter save refuses the same phone twice on the roster.
- **Duplicates:** dashboard/books group list and `/api/mobile/groups` list each group once
  (most privileged role, same rule as `groupRoleFor`); payout/fines pickers de-duplicated.
- **Dates day-first:** minutes list, documents, receipt page, Books receipt, devices page and
  mobile minutes list use the shared formatter; meeting date inputs show a dd/mm/yyyy echo,
  date held capped at today, next meeting ≥ meeting date. Mobile month-end was hard-coded to
  June 2026 → now the newest month with meetings, with a month chooser.
- **Filters:** `?group=` (dashboard, books; only the caller's own groups), `?period=` (books;
  P&L, tax lines and the ledger CSV now use the same period — the CSV used to export everything),
  `?tab=` + `?month=` (group workspace; month select offers only months with meetings).
- **Owner-approved follow-ups (07/11/26, second PR):** roster provisioning idempotent + read-only
  duplicate check (`npm run check:duplicates --workspace @stawi/db`, see HANDOFF — no clean-up
  without the owner); receipts only from the stored confirmed contribution by id (member or
  officials, tenant-scoped, else 404; core `receipt-access.ts`); books writes chair/secretary/
  treasurer only (`canWriteBooks`); statements count POSTED meetings only (`reconcilePostedMonth`,
  `statementMonths`); CSV dates stay ISO by design; native date inputs unchanged.
  Tests: core `receipt-access.test.ts`, `statement-posted.test.ts`, `scope.test.ts`; db `memberships.test.ts`.

## Session 4 (07/11/26) — Google Play readiness (closed testing ~28/11/26)
> **Session 4 status (07/11/26):** code side for Play is done (PRs #6–#13). Next = owner/Chrome:
> `fly apps create stawi` + secrets (DEPLOYMENT-RUNBOOK.md), `FLY_API_TOKEN` repo secret,
> confirm `/api/health`, build the TWA for `ke.stawi.app`, set `ANDROID_CERT_FINGERPRINTS`,
> reviewer env + `seed-demo.ts`, then the listing in `docs/PLAY-LISTING.md`.
- **SACCO+ behind `SACCO_PLUS_ENABLED` (default OFF).** Owner approved launching v1
  without lending (Play bans Kenyan loan apps without a CBK digital-credit licence).
  Off ⇒ `/sacco` + SACCO+ APIs 404 (middleware + page), SACCO+ server actions refuse,
  `@stawi/db` repo refuses (`applyForLoan`, `accrueMonthlyInterest`, `openSaccoAccount`,
  `postSaccoTxn`; `getSaccoAccounts` → []), cron skips interest, no loans/interest/credit
  copy in the UI. Data untouched. Tests: `packages/core/test/features.test.ts`,
  `packages/db/test/sacco-flag.test.ts`. Re-enable only after licensing.
- **Hosting = Fly.io** (DigitalOcean retired, `.do/` removed). `Dockerfile` (Next standalone,
  monorepo-aware, prisma generate), `fly.toml` (app `stawi`, fra, port 3000, health
  `/api/health`, release = `packages/db/prisma/release.sh`: additive `db push` + `rls.sql`),
  `.github/workflows/deploy.yml` (PR: docker build; main: `flyctl deploy` only when
  `FLY_API_TOKEN` exists). Owner steps + secret NAMES: `DEPLOYMENT-RUNBOOK.md`.
- **Public legal pages (no login):** `/privacy` (Kenya DPA 2019, controller Telpen Systems Ltd,
  contact telpeninfo@gmail.com), `/terms`, `/delete-account` (+ `/delete-account/email`
  pre-filled mailto). Play privacy URL = `/privacy`, deletion URL = `/delete-account`.
- **Installable PWA / TWA:** `apps/web/public/manifest.webmanifest` (start_url
  `/dashboard?source=twa`, standalone, theme #1f4d3a), icons in `apps/web/public/icons/`
  (192/512 + maskable 512; generated from the brand mark), `sw.js` (offline page only —
  never caches pages/API), `/.well-known/assetlinks.json` → `/api/assetlinks` from env
  `ANDROID_CERT_FINGERPRINTS` for package `ke.stawi.app` (core `android.ts`, tested).
- **M-Pesa env switch:** `MPESA_ENV` sandbox|production → Daraja base URL; shortcode, passkey,
  keys, callback all env (core `mpesa-config.ts`, tested; production rejects 174379 and
  non-https callbacks; timestamp in EAT). `/api/mpesa/stk` is TREASURER-only per group
  (server-side, `lib/group-access.ts`); optional `MPESA_CALLBACK_TOKEN`. No B2C.
- **Play reviewer access:** env pair `PLAY_REVIEW_PHONE` + `PLAY_REVIEW_CODE` (both required;
  core `review-access.ts`, tested). `/api/auth/review-sign-in` provisions/signs in that one
  number via the Supabase admin API (`SUPABASE_SERVICE_ROLE_KEY`, derived server-only
  password); the SMS hook skips that number. `seed-demo.ts` adds it as TREASURER of the demo group only.
- **Reviewer-flow sweep (bugs fixed):** group workspace was readable by any signed-in user
  and edit rights came from the tenant role (a phone-signed-in founder could not edit their
  own group) → now members-only (404) with edit rights from the per-group role; charter /
  minutes / statement / contribution server actions had NO role check → officials /
  treasurer enforced server-side; dashboard showed money controls to everyone and reported
  success even when the write failed; new-group founder was named "You"; workspace showed
  "Group" instead of the real name; account deletion only signed out (login + charter
  roster copy kept) → now deletes the Supabase login (service-role) and scrubs roster copies.
- **Sign-in standing rule (07/11/26): phone → 6-digit SMS code on a new device → 4-digit PIN.**
  Audit gap fixed: `/api/mobile/*` returned any typed phone's groups and had no membership
  checks (open, or behind a shared key bundled in the app) → now a verified Supabase session
  is required in production, groups come from the session's own phone, routes check the
  per-group role. OTP send/verify moved server-side (`/api/auth/otp/send|verify`): 5-minute,
  single-use window, rate limits per number and per IP (core `auth-policy.ts`, tested).
- **4-digit PIN + trusted devices:** tables `AuthPin` (bcrypt hash, failedCount, lockedAt,
  sessionEpoch) + `TrustedDevice` (sha256 of cookie secret, revokedAt) — additive. Cookie
  `stawi_device` = `<id>.<secret>.<hmac>` (httpOnly, 1 year, AUTH_DEVICE_SECRET). PIN set only
  within 15 min of a verified SMS code (`stawi_sms_ok`); middleware sends signed-in users with
  no trusted device to `/pin/setup`; 5 wrong → locked until new SMS; `/account/security` =
  devices + sign out of all devices (revoke + rotate server-held password + global sign-out).
  Reviewer may skip PIN. Needs `AUTH_DEVICE_SECRET` + `SUPABASE_SERVICE_ROLE_KEY` + DB, else SMS-only.

> **RESUME HERE (2026-08-14, end of session 3):** Auth migrated Clerk → **Supabase
> phone-OTP** across web + mobile (OTP SMS via Africa's Talking); web+mobile now one
> identity. Typechecks green, pushed to `main` (`154bcec`). Set the Supabase + AT env
> (`.env.example`, `docs/PHONE_AUTH_MIGRATION.md`), a Supabase project (Phone auth +
> Send-SMS hook → `/api/auth/send-sms`), and `SUPABASE_JWT_SECRET` for the mobile bridge.
> **Only blocker to live SMS/M-Pesa = Africa's Talking account activation (user-side).**
> Full detail: **Session 3 log** below. Older Clerk-era notes retained for history.
>
> **RESUME HERE (2026-07-18, end of session 2):**
> 1. `git push origin main` if `git status` shows commits ahead (last local commit: `5e67b01`).
> 2. Re-run `npm run build` once (landing changed after last green build) — expect 24/24.
> 3. Watch GitHub Actions: build-test should be GREEN now (valid dummy Clerk key, lint no-op,
>    deploy job gated behind repo var `DEPLOY_ENABLED` — set to 'true' only at launch).
> 4. NEXT MILESTONE = **Step 5: Deploy** — real Clerk keys in `apps/web/.env.local`
>    (placeholder pk_test_Y2xlcmsuZXhhbXBsZS5jb20k in place), DO Postgres + `DATABASE_URL`,
>    `prisma migrate deploy`, then PRE-DEPLOY-CHECKLIST 1–15 + DEPLOYMENT-RUNBOOK.
>
> **Latest additions (post-green-build):** standalone landing demo
> (`design/stawi-landing-demo.html`, 10 langs + RTL + theme, loads anywhere);
> brand favicon `apps/web/app/icon.svg` + branded metadata/OpenGraph in layout;
> CI workflow fixed (see 3); **clickable core-value chips** on the landing +
> demo — each value opens a marketing pitch with a 'See it in action →' link
> (10 languages, EN fallback; VALUE_DETAILS/VALUE_LINKS in page.tsx).
>
> **STATUS: ✅ PRODUCTION BUILD GREEN (2026-07-18) — `next build` completes 24/24 pages.**
> Fix chain that got there: strict type fixes → strip `.js` relative imports (core+db) →
> `outputFileTracingRoot` + app-router `not-found.tsx` → `.npmrc` legacy-peer-deps →
> root `overrides` react/react-dom=18.3.1 (single React; `npm ls` clean) →
> `apps/web/.env.local` with Clerk keys (placeholder pk_test_Y2xlcmsuZXhhbXBsZS5jb20k —
> **swap for real keys before launch**). NEXT: real Clerk keys → PRE-DEPLOY-CHECKLIST → DO deploy.
>
> **STATUS (prior): v1.9 consolidated as Pillar 1 + SACCO+ opt-in activation added (2026-07-18).**
> The Desktop `Chamaa App` folder (7 duplicate snapshots) was consolidated into this repo —
> v1.9-import-notes promoted as the single source of truth, duplicates removed.
> Backup of all snapshots: `ChamaaApp-backup.tar.gz` (in the Cowork outputs folder).
> v1.9 adds: import written notes (photo/file → OCR/parse → minutes) + per-country phone length.

## 2026-10-25 — Owner standing rules adopted
- Owner standing rules from Telpen Edu (24/10/26) now apply here: `docs/STANDING_RULES.md` (live stays live, fix once / fix everywhere, escalate-don't-fix in protected areas or after 3 failed attempts, never weaken a test, merge only green at the exact head SHA, propose-don't-dispose money).
- `.github/workflows/health-audit-guard.yml` fails any `fix/health-audit-*` PR that touches money, tax/compliance/KYC, auth/tenancy, `packages/db/`, `legal/`, deploy config or secrets, or weakens a test.
- New root `CLAUDE.md` points agents at the rules and the gate.

## Session 3 log (2026-08-14) — Clerk → Supabase phone-OTP migration (web + mobile)

**Why:** unify on phone-number login (no email) for the informal/African market, with
the login phone doubling as the M-Pesa number. Clerk replaced by **Supabase phone-OTP**;
**Africa's Talking** delivers the OTP SMS. M-Pesa was already native (Daraja STK at
`/api/mpesa/stk` + callback) — unchanged.

**Web (`apps/web`) — identity-source swap, no schema change.** Clerk's `userId` was an
opaque string identity everywhere (`getTenantContext(prisma, userId)`, stored in
`clerkUserId`/`ownerClerkId` columns). New `lib/auth.ts#getUserId()` returns the Supabase
user id; every `auth()` call-site (`app/actions.ts`, `lib/data.ts`, `api/mpesa/stk`,
`api/billing/checkout`) uses it. Columns keep their names (now hold Supabase ids).
- `lib/supabase/{server,client,middleware}.ts` (SSR, Next 15 async cookies); `middleware.ts`
  = Supabase guard that **preserves** the tenant-slug resolution (`x-stawi-tenant-slug`).
- `app/sign-in` + `app/sign-up` → phone→OTP (`components/phone-auth.tsx`); `ClerkProvider`
  removed. `app/api/auth/send-sms` = Supabase Send-SMS hook → Africa's Talking (HMAC).
- Phone-first group linking (`getGroupsByPhone`) now reads the phone from the Supabase user
  (`getUserPhone`). `toE164` added to `@stawi/core`. `@clerk/nextjs` → `@supabase/ssr` +
  `@supabase/supabase-js`. Doc: `docs/PHONE_AUTH_MIGRATION.md`.

**Mobile (`apps/mobile`) — Expo → Supabase.** `lib/supabase.ts` (session in AsyncStorage) +
`screens/SupabasePhoneLogin.tsx`; `App.tsx` gates on `EXPO_PUBLIC_SUPABASE_URL` (`SupabaseGate`
manages session → passes phone/getToken/signOut to `MainApp`). `@clerk/clerk-expo` →
`@supabase/supabase-js` + async-storage + url-polyfill. `ClerkPhoneLogin.tsx` + `tokenCache.ts`
inert. Removing Clerk also removes the root cause of the `.npmrc` `legacy-peer-deps` react-dom
hoist (flag left in place, harmless).

**Web ↔ mobile bridge — one identity.** `apps/web/lib/mobileApi.ts#guard` now verifies the
Expo app's **Supabase session JWT** (HS256, `SUPABASE_JWT_SECRET`) instead of Clerk;
`@clerk/backend` → `jsonwebtoken`. Web and mobile now share one Supabase identity.

**Validated on-machine (2026-08-14):** `@stawi/db generate` → `@stawi/web typecheck` ✅;
`apps/mobile tsc --noEmit` ✅. Both green, pushed to `main` (`154bcec`).
**Still blocking live SMS/M-Pesa:** Africa's Talking account activation (user-side).

## Session 2 log (2026-07-18) — build-out on top of the consolidation
- **Pillar 1→4 bridge:** `sacco-activation.ts` + SACCO+ cockpit tab (opt-in join).
- **Cross-pillar spine:** `journey.ts` + dashboard "journey strip" (self-directing next step).
  **Open access:** journey now makes Pillars 2/3/4 **directly joinable — no Pillar-1 gate**
  (`subscribedPillars`), so any saver/trader/business subscribes to any pillar directly.
- **Pillar 3 business suite:** `business-activation.ts` (pre-packed accounting pack + owner
  metrics + supplier links) wired into `/books`; `pos.ts` (item **EAN-13 barcodes**, printable
  receipts, CSV exports, acknowledgeable stock alerts, **M-Pesa/cash/card payment prompts**);
  `automation.ts` (auto-reorder POs, SMS/WhatsApp e-receipts, **KRA eTIMS** e-invoices,
  close-of-day **Z-report**). All in `/books`.
- **Brand:** `design/stawi-logo.svg` + `BRAND.md` (vision/mission/values, tagline *Save · Grow · Thrive*).
  Reflected in landing, receipts (demo + app).
- **Theme + language:** dark mode (`html.dark` vars in globals.css) + EN/SW/FR selector on the
  landing; full theme+language in `design/business-cockpit-demo.html` (standalone, loads anywhere).
- **Type fixes:** `apps/web` typecheck errors cleared (assertClean, graduation nextStage,
  CountryCode ambiguity, strict indexing). Graduation CI bug fixed. Core suite **242 tests green**.
- **STILL NEEDED on Jacob's machine:** `npm run -w packages/db generate` (Prisma client) so
  `db/repo.ts` typechecks; then `npm run build`/`typecheck -w apps/web` to verify the app UI.

## Restructure log (2026-07-18)
- Promoted `Chamaa App/Stawi-v1.9-import-notes` → repo root (superset of prior main; no pillars lost).
- Removed all 7 `Chamaa App/*` snapshots + `OCR-Import-Kit` (already folded into `intake.ts`).
- **New: Pillar 1 → Pillar 4 activation bridge.** `packages/core/src/sacco-activation.ts`
  (`buildSaccoActivation`, `activationEvidence`, `memberSavingsProfiles`, `activationCreditPreview`,
  `isActivationReady`) + `test/sacco-activation.test.ts` (9 tests, green). Turns a Pillar-1-only
  group's captured record into a one-tap SACCO+ join with lender-evidence checklist, member savings
  history and pre-qualified credit.
- **Dashboard:** new **SACCO+ tab** in `apps/web/app/groups/[id]/GroupCockpit.tsx` +
  `activateSaccoFromPillar1Action` server action (opens account, seeds pooled savings).
- Core suite: 200 pass / 1 fail (the graduation bug above). See doc: `docs/PILLAR-1-COCKPIT.md`.

## Repo
- GitHub: `Bucrepinfo-lab/Stawi` (public). Base commit on origin: `46bf634`.
- Local history to push (patches in the Desktop handoff folders):
  `1018ea0` pillar-1 cockpit · `419625b` phone-first identity · `f10851e` mobile Expo ·
  `9ed18fe` mobile live API · `b00c231` Postgres + Clerk mobile auth · + this lock-up commit.
- Turborepo: `apps/web` (Next 15), `apps/mobile` (Expo/RN), `packages/core`, `packages/db`.

## What's built (Pillar 1 — the data-entry cockpit that feeds Pillars 2–4)
- **Core (pure, tested):** `charter.ts`, `minutes.ts`, `minutes-prose.ts` (deterministic
  informal→formal minute paraphraser), `statement.ts` (month-end reconcile), `identity.ts`
  (phone match / groups-by-phone). Tests: charter/minutes/statement/identity.
- **Web:** `/groups/[id]` cockpit (Charter · Minutes · Documents · Month-End), `/groups/new`,
  role-gated; phone-first sign-in/up; JSON API `apps/web/app/api/mobile/*`.
- **Mobile (Expo):** phone login (demo + **Supabase phone-OTP**), groups-by-phone, full
  cockpit, Table banking, SACCO+; `lib/api.ts` (live ⇄ offline seed), Live/Offline pill.
- **DB (live-on-key):** `GroupCharter`/`Meeting`/`MonthlyStatement` + phone-keyed
  memberships; repo helpers; RLS; seed creates Umoja charter + 2 meetings + phones.
- **Auth (session 3):** phone-first via **Supabase phone-OTP** (web + mobile), OTP SMS by
  Africa's Talking; enabled when `NEXT_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_URL` set,
  else demo/dev. Web + mobile share one Supabase identity. API auth precedence (mobile
  bridge): **Supabase JWT** (`SUPABASE_JWT_SECRET`) → `MOBILE_API_KEY` → open (dev only).
- **Production rule:** `DATABASE_URL` REQUIRED; no seed fall-back in prod (API → 503).

## Key env (updated session 3)
Web: `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SEND_SMS_HOOK_SECRET`, `SUPABASE_JWT_SECRET` (mobile-bridge JWT verify),
`AT_USERNAME`/`AT_API_KEY`/`AT_SENDER_ID`, `MOBILE_API_KEY`, `MPESA_*` (Daraja), `STRIPE_*`,
`CRON_SECRET`. Mobile (`apps/mobile/.env`): `EXPO_PUBLIC_SUPABASE_URL`,
`EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_API_BASE`, `EXPO_PUBLIC_API_KEY`.
See `.env.example`, `docs/PHONE_AUTH_MIGRATION.md`, `DB-SETUP.md`, `.do/app.yaml`.

## Verification note
Core logic unit-verified; all TS/TSX syntax-clean; imported symbols confirmed.
Sandbox cannot run `npm run build`/Expo/Postgres (blocked binaries) — those gates
run on Jacob's machine / DO.
