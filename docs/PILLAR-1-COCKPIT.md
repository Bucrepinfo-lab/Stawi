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
