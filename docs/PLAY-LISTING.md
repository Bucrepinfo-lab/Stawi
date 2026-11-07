# Stawi — Google Play listing inputs

Prepared 07/11/26 for closed testing (~28/11/26) and production (~19/12/26).
Publisher: **Telpen Systems Ltd** (organisation account). App = Trusted Web
Activity of the web app; Android package **`ke.stawi.app`**.

> v1 ships **without lending**: SACCO+ (loans, credit scoring, deposit interest,
> withdrawals/remittances) is behind `SACCO_PLUS_ENABLED`, which is `"false"` in
> `fly.toml`. Do not mention loans, credit, interest or returns anywhere in the
> listing. Re-add only after a CBK digital-credit licence and a new Play review.

## URLs (replace `<host>` with the live domain, e.g. `stawi.fly.dev`)

| Field | Value |
|---|---|
| Privacy policy | `https://<host>/privacy` |
| Account deletion (Data safety → "delete account" URL) | `https://<host>/delete-account` |
| Terms | `https://<host>/terms` |
| Start URL (TWA) | `https://<host>/dashboard?source=twa` |
| Digital Asset Links | `https://<host>/.well-known/assetlinks.json` (set `ANDROID_CERT_FINGERPRINTS` = upload key + Play App Signing key SHA-256, comma-separated) |
| Support email | telpeninfo@gmail.com |

## Store listing

- **App name:** Stawi
- **Short description (≤80):** Chama records made simple: contributions, minutes and month-end statements.
- **Full description:**

  Stawi keeps your chama's records in one trusted place, on any phone.

  • Sign in with your phone number — your groups appear automatically.
  • Record members' contributions and see each member's share of the group's savings update instantly.
  • Treasurers can send an M-Pesa payment request (STK prompt) to a member; the member approves it on their own phone and the contribution is recorded when M-Pesa confirms.
  • Keep your group charter: officials, meeting schedule, constitution, mission and values.
  • Minute every meeting — attendance, agenda, fines and merry-go-round payouts — and turn your notes into clear, printable minutes.
  • Get a reconciled month-end statement for the group and for each member, with plain-language explanations.
  • Follow step-by-step guidance to register your group as a self-help group or society.
  • Officials edit; members view. Each group's records are private to that group.

  Stawi is record-keeping software. It does not hold your money, give loans or pay interest: M-Pesa payments are processed by Safaricom straight to your group's paybill.

  Made in Kenya by Telpen Systems Ltd.

- **Graphics:** icon `apps/web/public/icons/maskable-512.png` (512×512, full-bleed);
  smaller icons in the same folder. Feature graphic 1024×500 and phone screenshots
  still to capture from the live app (dashboard, group workspace, minutes, statement).

## Category — recommend **Finance**

Recommended: **Finance**. The app records group savings and initiates M-Pesa
payment requests, so Finance is the accurate category; listing a money-handling
app under Productivity risks a metadata/misrepresentation rejection, and the
Financial features declaration is required either way. Finance apps get a closer
review, which the v1 scope (no lending) is built to pass, and Telpen Systems Ltd
already publishes as an organisation. (Productivity would be defensible only for a
pure note-taking app, which Stawi is not.)

## Content rating (IARC questionnaire)

- Category: Utility / productivity / reference (not a game).
- Violence, sexuality, language, controlled substances, gambling: **none**.
- Users can interact or exchange content: **No** for v1 — records are visible only
  to members of the same private group; the community board is local-only and not
  shared; no public profiles or chat. (Answer "Yes" if group messaging is enabled later.)
- Shares user location: **No**. Digital purchases: **No** (no in-app purchases in v1).
- Expected rating: Everyone / PEGI 3 equivalent; audience is still set to adults below.

## Target audience & content

- Target age: **18 and over** only. Not designed for children; no child-directed content.
- Ads: **No ads**.
- News app: No. COVID/health: No. Government app: No.

## Data safety (matches the code as of 07/11/26)

Collected (all **encrypted in transit**; **not shared** with third parties — Supabase,
Africa's Talking, Safaricom and hosting act as service providers; **users can request
deletion** in-app and at `/delete-account`; no data is sold):

| Play data type | Collected? | Why (Play purpose) | Required? |
|---|---|---|---|
| Personal info → Phone number | Yes | App functionality, Account management, Fraud prevention & security | Required |
| Personal info → Name | Yes | App functionality, Account management | Required |
| Personal info → Other info (group role; ID number officials may enter on the roster) | Yes | App functionality | Optional |
| Financial info → Other financial info (contribution amounts, M-Pesa receipt numbers and request status) | Yes | App functionality | Required for groups that record contributions |
| Photos (group logo an official uploads; meeting-notes photo is parsed on the device) | Yes (logo only) | App functionality | Optional |
| Location, Contacts, Messages (SMS inbox), Calendar, Audio, Health, Web history | No | — | — |
| App activity / analytics, Device or other IDs, Crash logs | No (standard server logs only) | — | — |
| Financial info → payment card / bank account | No (we never see M-Pesa PINs or cards) | — | — |

Ephemeral processing: No. Data collection is not optional for phone and name (needed to sign in).

Sign-in (owner rule 07/11/26): phone number + 6-digit SMS code on a new device (valid 5 minutes,
single use, rate-limited per number and IP), then a 4-digit PIN on that trusted device; 5 wrong
PINs, a forgotten PIN or a new device need a new SMS code. The PIN is stored only as a bcrypt
hash; trusted devices can be signed out from Account → Sign out of all devices. No email needed.
These are authentication credentials, not a separate Data safety data type.

## Financial features declaration

- Select the option for **record keeping / group savings management** (support
  service) and, for payments, that the app **initiates M-Pesa payment requests that are
  processed by a licensed provider (Safaricom)**; Stawi never holds funds.
- **Personal loans / lending / credit lines / BNPL / interest-bearing accounts: NO.**
- Crypto, trading, insurance: No.
- Verify the exact option labels in Play Console → App content → Financial features.

## Reviewer access (App access → "All or some functionality is restricted")

Set on the server (Fly secrets), then run the demo seed once:

```bash
fly secrets set --app stawi PLAY_REVIEW_PHONE="<reviewer phone, e.g. 07XX XXX XXX>" \
  PLAY_REVIEW_CODE="<6-digit code>" SUPABASE_SERVICE_ROLE_KEY="<service role key>"
PLAY_REVIEW_PHONE="<same phone>" DATABASE_URL="<db url>" npx tsx packages/db/prisma/seed-demo.ts
```

Instructions to paste into Play Console:

> 1. Open the app and tap **Sign in**.
> 2. Enter phone number **<PLAY_REVIEW_PHONE>** and tap **Send code** (no SMS is sent to this test number).
> 3. Enter code **<PLAY_REVIEW_CODE>** and tap **Verify & continue**.
> 4. When asked to choose a 4-digit PIN, either set any PIN (e.g. 2580) for faster sign-in on this device, or tap **Skip for the demo account**.
> 5. You are the treasurer of the demo group "<demo group name>": record a contribution on the dashboard, open **Open group workspace** for the charter, minutes and **Month-End** statement.
> 6. Account → **Sign out of all devices**, and **Delete my account** (/account/delete; public steps at /delete-account).

Remove `PLAY_REVIEW_PHONE` / `PLAY_REVIEW_CODE` after review (`fly secrets unset`).

## Still to do (owner / Chrome)

- Fly app + secrets (DEPLOYMENT-RUNBOOK.md), then confirm `/api/health` and `/privacy` live.
- Build the TWA (Bubblewrap/PWABuilder) for `ke.stawi.app` with start URL above; add both
  SHA-256 fingerprints to `ANDROID_CERT_FINGERPRINTS`; keep the signing key files in email + Drive.
- Feature graphic + screenshots; closed-testing tester list.
