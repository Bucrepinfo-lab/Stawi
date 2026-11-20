# One house, four rooms — papers written once, used everywhere (20/11/26)

Owner order, 20/11/26: a group that has worked in the group records (pillar 1)
and wants savings and credit (pillar 4), or a group in business (pillars 2
and 3), must not be sent back to fetch, stamp and sign documents Stawi already
holds. The four pillars are one house with four rooms; papers pass between them.

## How it works
- `packages/core/src/document-house.ts` lists the twelve papers a group holds —
  nine from its group records, three from its business books — with how
  complete each is and the dates it covers, back to the first year on record.
- Five purposes say what they need: register the group, open a group bank
  account, start a group business, show our records to a bank or a fund, start
  savings and credit (shown only when `SACCO_PLUS_ENABLED` is on).
- `checkPurpose` answers, for a purpose: which papers are ready, which are not,
  and how many more are needed. A paper is never asked for twice: every room
  reads the same record.
- `GET /api/groups/:id/papers` — members of the group only; counts and dates,
  no member's name, phone or ID number.
- `DocumentHouse` card ("Your papers, ready"): on the group page, the ideas page
  (opens on "Start a group business") and the books page (opens on "Show our
  records to a bank or a fund"). Each missing paper links to the place to finish it.
- `/groups/:id/papers?for=<purpose>` — the pack: cover list, officials and
  members (name, post, ID number, signature column — no phone numbers), rules,
  decisions, monthly money statements, the business month by month, the minutes
  themselves, and a signature page. Officials only. Print or save as PDF.

## What it does not claim
Inside Stawi the papers pass from section to section as they are. An outside
office (the registrar, a bank, a public fund) may still ask the officials to
sign or stamp a printed copy; the pack leaves room for that and says so. The
lists of what each purpose needs are indicative (Kenya first) and an office may
ask for more — verify against the office's current list.

## Next
- Savings and credit should read `checkPurpose('savings_credit')` in place of
  its own checklist (`activationEvidence`) so there is one list, not two.
  That file is in a protected area — owner to approve.
- A record of which pack was opened, by whom and when (needs a small table).
- Kiswahili on the printed pack.
- Per-country lists (Uganda, Tanzania, Rwanda).
