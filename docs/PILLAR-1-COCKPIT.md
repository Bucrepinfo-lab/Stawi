# Pillar 1 — Data-Entry Cockpit

The point-of-capture that feeds every other pillar. Built for informal groups —
including members who don't write formal English. Everything is light to fill;
Stawi does the paraphrasing and reconciliation.

## What officials get

An official (Chairperson / Secretary / Treasurer / Signatory) can **create a New
Group** and open its **workspace** (`/groups/[id]`), a role-gated cockpit with four tabs:

1. **Charter** — a standardized, editable profile: name, optional logo, meeting
   place / day(s) / time, an auto-incrementing roster of members & officials with
   designations and phones, constitution & by-laws (write or upload), motto,
   mission, vision, core values, and free notes. A live completeness meter and a
   self-directing "Next:" prompt guide the user to done.
2. **Minutes** — a self-directing meeting form: attendance by tapping
   Present → Apology → Absent; agenda items (proposed → agreed); AOBs; a
   table-banking sheet (per-member contributions, fines/penalties, merry-go-round
   payout, opening balance) that reconciles live; adjournment and next-meeting
   date. One tap generates **professional minutes**.
3. **Documents** — the paraphrased, bank-ready minutes with a signature block,
   printable to PDF. Officials **edit the wording before posting**.
4. **Month-End** — one tap harmonises every meeting in a month into a downloadable
   **Month-End Statement**: attendance %, contributions, fines, the money trail
   (opening → closing), and every resolution passed, with an editable narrative.

Posted documents are proof of the group's existence and disciplined activity — the
supporting evidence a bank or microfinance institution asks for before extending
credit.

## The paraphrasing "OS"

`@stawi/core/minutes-prose.ts` deterministically recasts informal entries into
formal minute prose — e.g. "buy chairs" → *"RESOLVED THAT the group shall buy
chairs."*; attendance and finance become proper paragraphs; a title, meta line and
signature block are assembled. It runs offline with no keys (private by default,
works on a cheap phone). An optional live-on-key AI pass can polish further, but the
group is never blocked on it, and an official always edits before posting.

## Core modules (pure, tested)

- `charter.ts` — charter model, auto-increment roster, completeness scoring.
- `minutes.ts` — meeting model, attendance tally, table-banking reconciliation,
  self-directing completeness.
- `minutes-prose.ts` — the paraphraser (`paraphraseMinutes`) + formatting helpers.
- `statement.ts` — `reconcileMonth`: month-end harmonisation.

Test suites: `test/charter.test.ts`, `test/minutes.test.ts`, `test/statement.test.ts`.

## Persistence (live-on-key)

Prisma models `GroupCharter`, `Meeting`, `MonthlyStatement` (+ `MeetingStatus`
enum), tenant-scoped repo helpers (`getGroupCharter`, `upsertGroupCharter`,
`listMeetings`, `upsertMeeting`, `postMeeting`, `saveMonthlyStatement`) and RLS
coverage. Runs on seed/in-memory data until `DATABASE_URL` is set; server actions
in `apps/web/app/actions.ts` write through when the DB is live.

## Feeds the other pillars

The charter roster + capital feed Pillar 2 (matching); officials + registration
intent feed Pillar 3 (accounting/compliance/admin); the constitution + roster feed
Pillar 4 (SACCO+). One point of entry, reused everywhere.

## SACCO+ opt-in activation (added 2026-07-18)

Many groups subscribe for the Pillar-1 cockpit alone (charter, minutes,
statements, identity, notes intake) and are not initially interested in Stawi's
savings & credit services. Because they are *already enrolled* through Pillar 1,
joining Stawi SACCO+ later is a one-tap **activation**, never a re-registration.

`@stawi/core/sacco-activation.ts` (pure, tested) builds a `SaccoActivationPacket`
from the group's captured record:

- **Signatories** auto-filled from the charter officials (Chair / Secretary / Treasurer).
- **Member savings history** — cumulative deposits, months active and saving
  streak — distilled from the reconciled month-end statements.
- **Lender-evidence checklist** — the exact documents a bank / DT-SACCO asks for
  before extending credit (registration certificate, officials list, constitution,
  board resolution, recent minutes, financial statements, member KYC), each marked
  satisfied straight from Pillar 1, with a `readinessPct` and a `missing[]` list.
- **Pre-qualified credit** — `activationCreditPreview` runs each member's deposits
  through the real `credit.ts` engine so the group sees loan headroom before they commit.

Surfaced in the dashboard as the **SACCO+ tab** in the group cockpit
(`apps/web/app/groups/[id]/GroupCockpit.tsx`) with a "Join Stawi SACCO now" button,
wired to `activateSaccoFromPillar1Action` — which opens the group's SACCO+ account
and seeds it with the proven pooled savings (no-op success in seed mode). Modules:
`buildSaccoActivation`, `activationEvidence`, `memberSavingsProfiles`,
`activationCreditPreview`, `isActivationReady`; tests in `test/sacco-activation.test.ts`.

## Phone-first identity (added 2026-07-13)

Phone number is the primary auth credential — many members have no email. The
number a member is registered with in the charter roster **is** their identity;
when they download the app and sign up with that same number, they are linked to
every group whose roster carries it, with the role their designation implies.

- **Core:** `identity.ts` — `normalizePhone`, `phoneKey` (last-9 match key, tolerant
  of `07…`/`2547…`/`+2547…`), `phoneMatches`, `findMemberGroups(phone, directories)`,
  `viewerRoleFromLinks`, `isOfficialInGroup`. Tested in `test/identity.test.ts`.
- **Provisioning:** saving a charter seeds `Membership` rows from the roster
  (phone-keyed, `clerkUserId = pending:<key>`), so members exist before they ever
  sign in (`provisionRosterMemberships`).
- **Linking:** the Clerk webhook `user.created`/`user.updated` calls
  `linkMembershipsByPhone` to attach pending roster rows to the real user by phone.
- **Discovery:** `getMyGroups` unions the user's linked memberships with a live
  phone match (`getGroupsByPhone`) so groups show up even before the webhook fires.
- **Auth config (Clerk dashboard):** set **Phone number** as the primary identifier
  and enable **SMS code**; email optional. Sign-in/up pages carry phone-first copy.

Prototype: `design/pillar1-cockpit-prototype.html` — a self-contained, dependency-free
demo (phone login → group discovery by number → charter/minutes/document/month-end),
inlining the exact `@stawi/core` algorithms so it renders in any viewer.

## Mobile (Expo) parity (added 2026-07-13)

Full React Native screens for the cockpit, phone-first end to end:
- `apps/mobile/screens/PhoneLoginScreen.tsx` — phone-number entry → `findMemberGroups`.
- `apps/mobile/screens/GroupsHomeScreen.tsx` — groups discovered by the number, role badges.
- `apps/mobile/screens/CockpitScreen.tsx` — tabbed **Charter · Minutes · Documents ·
  Month-End**: tap-cycle attendance, agenda + contribution capture, live paraphrase
  → official edit → post, printable document view, reconciled month-end statement.
- `apps/mobile/screens/TableBankingScreen.tsx` — capital view (extracted from the old home).
- `apps/mobile/data/seed.ts` — self-contained charter + meetings + directories.
- `App.tsx` — navigator: **login → groups → group** (Records / Table banking / SACCO+),
  reusing the same `@stawi/core` engines as web. No new dependencies.

## Mobile ⇄ live data (added 2026-07-13)

React Native can't call Next.js server actions, so the app talks to JSON routes:

- **API (web):** `apps/web/app/api/mobile/*` — `GET groups?phone=`, `GET cockpit?groupId=`,
  `POST charter`, `POST meeting`, `POST post-meeting`. CORS + optional shared-key
  auth (`MOBILE_API_KEY` ⇄ `x-stawi-mobile-key`); reuse the same repo + core logic;
  seed responses when no `DATABASE_URL`. Public in `middleware.ts`.
- **Client (mobile):** `apps/mobile/lib/api.ts` — base URL from `EXPO_PUBLIC_API_BASE`
  (+ `EXPO_PUBLIC_API_KEY`). Every call falls back to `null` on error, so screens use
  the bundled seed and the app is always usable offline. A **Live / Offline** pill in
  the header shows which is active.
- **Wiring:** `App.tsx` loads groups-by-phone and the cockpit from the API (seed
  fallback); the Minutes flow **Save draft** and **Post** persist via the API.
- **Production:** put Clerk mobile session verification in front of the write routes;
  the shared key is a stop-gap for pilots.

## Persistence + Clerk mobile auth (added 2026-07-13)

- **Postgres:** `docker-compose.yml` (local), `packages/db` `push`/`generate`/`seed`
  scripts, and `DB-SETUP.md` (local + DigitalOcean paths). Seed now creates the
  Umoja **charter + two meetings** and **phone-numbered memberships**, so DB-mode
  phone login and the cockpit have real data. Set `DATABASE_URL` and writes persist.
- **Clerk mobile auth (optional):** set `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` and the
  app uses Clerk phone-OTP (`ClerkPhoneLogin`, `@clerk/clerk-expo` +
  `expo-secure-store` token cache); the API client sends the Clerk session token as
  a bearer. The web API `guard()` verifies it with `@clerk/backend` + `CLERK_SECRET_KEY`.
  Without the key, the app keeps the self-contained demo login — nothing breaks.
- **Auth precedence on `/api/mobile/*`:** Clerk bearer token → shared `MOBILE_API_KEY`
  → open (only when neither is configured). Configure Phone number as the primary
  Clerk identifier + SMS code in the dashboard.

## Import written notes + customizable phone length (added 2026-07-14)

Many groups already keep minutes on paper or in a file. Two ways in, both feeding
the same paraphraser:
- **Photo** — snap/scan the written minutes; best-effort OCR (Tesseract.js on web +
  prototype; camera/library via `expo-image-picker` on mobile) fills a review box.
- **File** — upload PDF / Word / text; text files read inline, others attach for
  server-side extraction in production.
Then `parseImportedNotes` (core `intake.ts`) makes a structured guess — attendance
(Present/Absent/Apologies), agenda titles, resolutions, dates, KES amounts — and
pre-fills the minutes form. The official reviews and generates as normal. Uploads
are validated by `validateUpload` (type + 15 MB cap). Web: `NotesImport` in the
minutes form. Mobile: `NotesImport` in `CockpitScreen`. Prototype: "Import written
notes" on the Minutes screen.

**Customizable phone length:** `PHONE_RULES` (core `identity.ts`) holds per-country
dial code, flag, national digit count and input max length (KE, UG, TZ, RW, NG, GH,
ZA — extend freely). `phoneRule()` / `isValidPhoneLength()` drive `maxLength` and
validation on every phone input (charter roster, mobile + Clerk login, prototype
login with a country picker). The typed limit now adapts to the country.

**Production upload/OCR:** wire `MinutesImport` uploads to DigitalOcean Spaces and a
server OCR/text-extraction step (e.g. Tesseract server or a cloud OCR) — the client
degrades to manual entry when unavailable, so nothing is blocked.
