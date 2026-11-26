# Stawi — Google Play listing inputs

Prepared 07/11/26 for closed testing (~28/11/26) and production (~19/12/26).
Publisher: **Telpen Systems Ltd** (organisation account). App = Trusted Web
Activity of the web app; Android package **`ke.stawi.app`**.

> v1 ships **without lending**: SACCO+ (loans, credit scoring, deposit interest,
> withdrawals/remittances) is behind `SACCO_PLUS_ENABLED`, which is `"false"` in
> `fly.toml`. Do not mention loans, credit, interest or returns anywhere in the
> listing. Re-add only after a CBK digital-credit licence and a new Play review.

## URLs (live host: `stawi.fly.dev`, checked 26/11/26)

| Field | Value |
|---|---|
| Privacy policy | `https://stawi.fly.dev/privacy` |
| Account deletion (Data safety → "delete account" URL) | `https://stawi.fly.dev/delete-account` |
| Terms | `https://stawi.fly.dev/terms` |
| Start URL (TWA) | `https://stawi.fly.dev/dashboard?source=twa` |
| Digital Asset Links | `https://stawi.fly.dev/.well-known/assetlinks.json` (set `ANDROID_CERT_FINGERPRINTS` = upload key + Play App Signing key SHA-256, comma-separated) |
| Support email | telpeninfo@gmail.com |

## Store listing

- **App name:** Stawi
- **Short description (≤80):** Chama records made simple: contributions, minutes and month-end statements.
- **Full description:**

  Stawi keeps your chama's records in one trusted place, on any phone.

  • Sign in with your phone number and your own 4-digit PIN — no SMS codes. Your groups appear automatically.
  • Record members' contributions and see each member's share of the group's savings update instantly.
  • Treasurers can send an M-Pesa payment request (STK prompt) to a member; the member approves it on their own phone and the contribution is recorded when M-Pesa confirms.
  • Keep your group charter: officials, meeting schedule, constitution, mission and values.
  • Minute every meeting — attendance, agenda, fines and merry-go-round payouts — and turn your notes into clear, printable minutes.
  • Get a reconciled month-end statement for the group and for each member, with plain-language explanations.
  • Follow step-by-step guidance to register your group as a self-help group or society.
  • Ask the officials or the whole group a question inside the app, without phone calls.
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
- Users can interact or exchange content: **Yes** (since 20/11/26) — group messages and "Ask the officials",
  only between members of the same private group; every message passes the safety screen, and
  members can Report any message (a pre-filled email to telpeninfo@gmail.com) and Block a member
  on their own phone (hides that member's messages in "Whole group"; kept on the device only). No public profiles, no strangers.
- Shares user location: **No**. Digital purchases: **No** (no in-app purchases in v1).
- Expected rating: Everyone / PEGI 3 equivalent; audience is still set to adults below.

## Target audience & content

- Target age: **18 and over** only. Not designed for children; no child-directed content.
- Ads: **No ads**.
- News app: No. COVID/health: No. Government app: No.

## Data safety (matches the code as of 26/11/26)

Collected (all **encrypted in transit**; **not shared** with third parties — Supabase,
Safaricom, Anthropic (only when a group turns on statement explanations) and hosting act as service providers; **users can request
deletion** in-app and at `/delete-account`; no data is sold):

| Play data type | Collected? | Why (Play purpose) | Required? |
|---|---|---|---|
| Personal info → Phone number | Yes | App functionality, Account management, Fraud prevention & security | Required |
| Personal info → Name | Yes | App functionality, Account management | Required |
| Personal info → Other info (group role; ID number officials may enter on the roster) | Yes | App functionality | Optional |
| Financial info → Other financial info (contribution amounts, M-Pesa receipt numbers and request status) | Yes | App functionality | Required for groups that record contributions |
| Photos (group logo an official uploads; meeting-notes photo is read on the phone and never uploaded) | Yes (logo only) | App functionality | Optional |
| Messages → Other in-app messages (group messages and "Ask the officials") | Yes | App functionality | Optional |
| Location, Contacts, Messages (SMS inbox / emails), Calendar, Audio, Health, Web history | No | — | — |
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
  PLAY_REVIEW_PIN="<4-digit PIN, not 1234>" SUPABASE_SERVICE_ROLE_KEY="<service role key>"
PLAY_REVIEW_PHONE="<same phone>" DATABASE_URL="<db url>" npx tsx packages/db/prisma/seed-demo.ts
```

Instructions to paste into Play Console:

> 1. Open the app and tap **Sign in**.
> 2. Enter phone number **<PLAY_REVIEW_PHONE>** and PIN **<PLAY_REVIEW_PIN>**, then tap **Sign in**. No SMS or one-time code is used: members sign in with their phone number and their own PIN.
> 3. You are the treasurer of the demo group "<demo group name>": record a contribution on the dashboard, open **Open group workspace** for the charter, minutes and **Month-End** statement.
> 4. Account → **Sign out of all devices**, and **Delete my account** (/account/delete; public steps at /delete-account).

Keep `PLAY_REVIEW_PHONE` / `PLAY_REVIEW_PIN` while the app is in review or testing: Google re-checks
App access on every new release. The owner sets them and types the PIN into Play Console; Claude never
handles it.

## Status 26/11/26 (closed testing)
- Live: `/api/health` ok; `/privacy`, `/terms`, `/delete-account`, manifest (start URL `/dashboard?source=twa`) all 200.
- `/.well-known/assetlinks.json` returns `[]`: `ANDROID_CERT_FINGERPRINTS` is set only after the Android build
  (upload key) and the first upload (Play App Signing key).
- Play Console (26/11/26, Claude in Chrome, Telpen Edu developer account, app id 4975422423018163256):
  created `ke.stawi.app` (owner's yes to the two declarations); store listing (text, 512 icon, feature
  graphic, 4 phone screenshots), category Finance, contact telpeninfo@gmail.com + https://stawi.fly.dev;
  privacy policy, ads No, government No, health None, advertising ID No, financial features "Other"
  (record keeping + M-Pesa requests processed by Safaricom), Data safety (draft, imported from CSV),
  content rating done (owner's yes to the IARC terms; Everyone, "users interact"); closed testing
  "Alpha": Kenya, testers list "Telpen Closed Testers" (48), feedback telpeninfo@gmail.com, release 1
  (1.0.0.0, version code 1, target SDK 36) saved as a draft.
- Android build: PWABuilder, signing "New"; package files in Downloads "Stawi - Google Play package
  26-11-26" and Drive folder of the same name (aab, signing-key-info.txt, assetlinks.json).
- Fingerprints for `ANDROID_CERT_FINGERPRINTS` (both are public):
  upload key `66:B7:6D:DD:D6:65:4F:DA:28:14:95:98:46:27:C5:74:11:28:CB:5A:EF:9B:F3:31:27:33:99:2B:E5:CD:54:D9`,
  Play App Signing key `1A:0C:B3:1A:D0:5A:56:F4:50:25:67:1E:D1:0B:59:D4:B4:87:2C:2D:AD:6C:F0:A1:CF:B8:6A:90:54:A9:A1:3F`.
- Owner-only steps left (credentials, signing keys and secrets are never handled by Claude):
  1. Fly secrets `PLAY_REVIEW_PHONE` + `PLAY_REVIEW_PIN`, then `seed-demo.ts` once; Play Console → App
     content → Sign in details: phone + PIN + the instructions below. Then Target audience (18+) unlocks.
  2. Fly secret `ANDROID_CERT_FINGERPRINTS` = both fingerprints above, comma-separated.
  3. Copy `signing.keystore` from the Downloads folder into the Drive folder (Drive refused it by reference).
  4. Publishing overview → Send changes for review.

## Still to do (owner / Chrome)

- Fly app + secrets (DEPLOYMENT-RUNBOOK.md), then confirm `/api/health` and `/privacy` live.
- Build the TWA (Bubblewrap/PWABuilder) for `ke.stawi.app` with start URL above; add both
  SHA-256 fingerprints to `ANDROID_CERT_FINGERPRINTS`; keep the signing key files in email + Drive.
- Feature graphic + screenshots; closed-testing tester list.
