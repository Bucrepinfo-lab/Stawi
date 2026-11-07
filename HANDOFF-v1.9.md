# Update 07/11/26 — scoped pickers, day-first dates, consistent filters

Sweep of the Telpen Edu bug classes (a)–(e) applied to Stawi (see MEMORY.md, Session 5).
Not deployed yet (no Fly app / `FLY_API_TOKEN`), so there is no `/api/health` to confirm.

**Retest once deployed (375 px phone width too):**
1. `/dashboard` — group switcher lists each group once with your highest role; switching sets
   `?group=`; refresh keeps it; a `?group=` for a group you are not in falls back to your own.
2. `/groups/<id>?tab=minutes` — meeting list dates read dd/mm/yyyy; new meeting: date held
   cannot be after today, label echoes dd/mm/yyyy; next meeting cannot be before it; payout and
   fines pickers list roster members once; posting a future-dated meeting is refused.
3. `/groups/<id>?tab=statement` — month select lists only months with meetings (newest first);
   `?month=` survives refresh; posting saves server-computed totals.
4. `/groups/<id>?tab=documents` — buttons show dd/mm/yy.
5. `/books?group=<id>&period=month` — period kept in the URL; Ledger CSV and Tax CSV match the
   period on screen (file names carry the period); a refused entry is removed and explained.
6. `/receipt/<ref>` and the Books receipt — date dd/mm/yy HH:mm (Nairobi).
7. `/account/security` — last-used dates dd/mm/yy.
8. Mobile app — minutes list dates dd/mm/yyyy; Month-End shows the newest month with
   meetings and a month chooser (was fixed to June 2026); groups list shows each group once.
9. Charter — entering the same phone twice on the roster is refused on save.

**Owner decisions (07/11/26) — implemented in the follow-up PR:**
1. **Duplicate memberships.** `provisionRosterMemberships` is now idempotent (one row per group +
   phone; upsert on `(groupId, "pending:<key>")`; never deletes or merges). A read-only check lists
   any duplicates already in the database — **nothing is changed; the owner approves any clean-up
   after reading its output.** Run it from the repo root against the target database:
   ```
   npm install && npm run generate --workspace @stawi/db
   DATABASE_URL="<connection string>" npm run check:duplicates --workspace @stawi/db
   ```
   On Fly (once deployed): `fly ssh console -a stawi -C "npm run check:duplicates --workspace @stawi/db"`
   (DATABASE_URL is already set there). It prints group id, kind (phone|user), a masked key and the
   membership ids — no names or full phones.
2. **Receipts.** `/receipt/[ref]` loads the stored CONFIRMED contribution by id (query values are
   ignored), scoped to the caller's tenant, visible to that member or the group's chair, secretary or
   treasurer; anything else is 404. The dashboard links `/receipt/<id>` only after a stored
   contribution (no receipt link in demo mode).
3. **Books.** Only chair, secretary and treasurer add ledger entries (server: `addLedgerEntryAction`;
   UI: form hidden, read-only note for members and signatories).
4. **Statements count POSTED meetings only** — totals, the month list and the server recompute.
5. **CSV dates stay ISO** (comment beside `ledgerCsv` in `packages/core/src/pos.ts`).
6. **Native date inputs unchanged** (dd/mm/yyyy label beside them stays).

**Retest additions:** `/receipt/<id>` as the paying member (opens), as another member (404), signed
out (404), with `?amount=` added (ignored); `/books` as a member (no add form) and as treasurer (form);
Month-End with a draft meeting (not counted, its month not offered unless it has a posted meeting).

# Stawi — v1.9 (import written notes + per-country phone length)

Seven commits on GitHub base `46bf634`. Latest: **f378b96**.
Full repo + full-history bundle + all 7 patches in this folder. Tree clean, still
LOCKED for DigitalOcean deployment.

## See it now
Open `design/pillar1-cockpit-prototype.html`:
- Login: pick a country (flag) — the phone field's digit limit adapts (Kenya = 10).
- Open a group → Minutes → **Import written notes** → take a photo or upload a file →
  the recognised text pre-fills a new meeting → Generate → edit → Post.

## What's new
- **Core** `intake.ts` — `parseImportedNotes` (attendance / agendas / resolutions /
  dates / KES from raw text) + `validateUpload`. `identity.ts` — `PHONE_RULES`,
  `phoneRule`, `isValidPhoneLength` (per-country digit limits).
- **Web** — `NotesImport` in the minutes form (photo OCR via Tesseract.js, file read,
  review box → prefill); roster phone inputs use per-country `maxLength`.
- **Mobile** — `NotesImport` (expo-image-picker / expo-document-picker), login inputs
  use per-country `maxLength`. New deps: `expo-image-picker`, `expo-document-picker`.

## Push (from your authenticated clone)
```
cd /path/to/your/Stawi ; git checkout main
git am 0001-*.patch 0002-*.patch 0003-*.patch 0004-*.patch 0005-*.patch 0006-*.patch 0007-*.patch
git push origin main
```
Or: `git clone stawi-full.bundle Stawi`.

## Next = DigitalOcean deployment (unchanged)
PRE-DEPLOY-CHECKLIST.md (1–15) + DEPLOYMENT-RUNBOOK.md + DB-SETUP.md. First: confirm
your DigitalOcean account.

Note: production photo/file OCR should upload to DigitalOcean Spaces + a server OCR
step; the client falls back to manual typing when offline, so nothing is blocked.
