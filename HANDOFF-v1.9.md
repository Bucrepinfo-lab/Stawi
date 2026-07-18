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
