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

**Open owner decisions (protected areas — escalated, not changed):**
- `packages/db/src/repo.ts#provisionRosterMemberships` does not add newly created phone keys to
  its `have` set inside the loop, so a roster carrying one phone twice creates two membership
  rows (now blocked at charter save; existing duplicates, if any, need a data check).
- `packages/core/src/pos.ts#ledgerCsv` writes ISO (yyyy-mm-dd) dates; `receipt.ts`/`pos.ts`
  `dateDisplay` use en-KE medium on the server/device clock (the screens now override display).
  Decide whether CSV exports should be dd/mm/yyyy (spreadsheet locale risk) or stay ISO.
- `/receipt/[ref]` builds the receipt from URL query values, not a stored contribution — anyone
  can print a receipt with any group/member/amount. Should load the contribution by id and check
  membership.
- Who may write to a group business's books (now: any member of that group) — officials or
  treasurer only?
- `reconcileMonth` includes DRAFT meetings in a posted statement; should only POSTED count?
- Native `<input type="date">` still renders in the device locale on Android (a dd/mm/yyyy echo
  is shown beside it); a custom day-first picker is a design decision.

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
