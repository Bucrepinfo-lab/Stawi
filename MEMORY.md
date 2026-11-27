# Stawi — session memory / start-here

## 27/11/26 — Moving the app to London (lhr), next to Supabase (eu-west-1)
- Supabase (database + sign-in) is in eu-west-1 (Ireland); the app ran in fra. `fly.toml` primary_region is now lhr, and the one-off manual workflow "Move the app to London" starts one lhr machine, waits until it is started with its health check passing, then removes the fra machines (fra keeps serving if lhr never turns healthy). Owner approved ("fix this suitably").

## 27/11/26 — Undo, clear and delete-and-restart (owner: "somebody could be talking of something out of context")
- Speak-or-type box (`DictateBox`, used by Write it for me and the minutes): "Undo last part" takes back the last spoken part (up to 10 steps), "Clear all" needs a second tap within 4 s and can itself be undone. English and Kiswahili.
- Write it for me result: "Undo my changes" returns to what Stawi wrote; "Delete and start again" (second tap to confirm) clears the document and the points and goes back to step 1. Nothing is stored, so nothing is left behind.

## 27/11/26 — Tables fit a phone (owner screenshot: "Decisions the group agreed" ran past its card)
- Group papers page: on phones the decisions table becomes one small card per decision (Date / Meeting / Matter / Decision stacked, `.doc-stack` with data-labels); every other table sits in `.doc-table-wrap` and scrolls inside its card, so the page never slides sideways (`.papers-page { overflow-x: clip }`). Phone padding tightened. Print and PDF unchanged.
- Same wrapper added to the tables in the group workspace (3), Books and the money summary.
## 27/11/26 — Empty shortlist slots now do something (owner: "not clickable")
- The three dashed "Save an idea to fill this slot…" boxes were plain text. Each is now a button, "Tap ☆ on an idea above to save it here": it scrolls to the ideas and pulses their ☆ for a moment. The ☆ buttons grew from 28 to 40 px for easier tapping on phones.
## 27/11/26 — Instant revisit of screens (owner: taps better but not much)
- Measured from the owner's browser after the per-request sign-in fix: network round trip alone ~0.18 s; pages 0.3–0.45 s, so the server does ~0.1–0.25 s per page now. JS ~540 KB (normal for Next + React).
- `experimental.staleTimes.dynamic = 30`: tapping back to a screen seen in the last 30 s shows it at once from the phone's router cache. Own writes refresh at once (revalidatePath / router.refresh); Stawi also refreshes on every group event (LiveRefresh), so money figures never wait on it.
- Found, not changed: Stawi's Supabase (database + sign-in) is in eu-west-1 (Ireland) while the Fly app runs in fra (Frankfurt), ~20 ms per query each way. Moving the Fly app to lhr (London) would cut that roughly in half; deploy config, owner decision.

## 27/11/26 — Witness lists leave out the recorder; minutes are the secretary's (owner screenshot + rules)
- Owner's screenshot: as Treasurer he recorded KES 8,000 cash with witnesses Mary Achieng and Fredrick Gathii (himself) and got "The person recording cannot be a witness". The rule was right; the list should never have offered him. Now `GroupAccount.myMemberIds` (all the caller's roster rows, unioned in `mergeGroupsById`) is passed to TableBanking and left out of both witness lists, with the member paying. Message now: "You are recording this payment, so you cannot also be a witness. Choose another member."
- Owner rules (27/11/26): only the treasurer records contributions (already: MONEY_ROLES); only the SECRETARY writes minutes (save, post, speech-to-minutes, mobile meeting/post-meeting), unless the chair or secretary names a stand-in for 1–30 days (like a Telpen Edu lesson cover). A group with no secretary lets the chair write. Rules in `@stawi/core` `minutes-access.ts` (+ tests); server `lib/minutes-access.ts`; new group table `MinutesStandIn` (RLS via the group-chained list in rls.sql; additive db push on release). Minutes tab shows "Secretary away?" for the chair/secretary and tells others who writes.
- Owner plan: rotate testers through roles (treasurer, secretary) in the demo chama so each feels the flow.

## 27/11/26 — Taps were slow (owner: "10 to 15 seconds"): measured and fixed
- Measured in Chrome (signed in): server pages answer in ~0.4 s alone, but taps took 0.6–4.3 s on desktop and pages fetched together queued (8 at once → all 1.6 s). Cause: `supabase.auth.getUser()` (a network round trip to Supabase Auth) ran up to five times per page (getUserId, getUserPhone, tenantCtx, getMyGroups, modules/messages); on a phone over 4G that stacks to many seconds. Also no page had a loading screen, so a tap showed nothing until the server finished.
- Fixes: `getSupabaseUser` and `tenantCtx` run once per request (`lib/request-cache.ts` → React `cache`, still verified with Supabase every request); `app/loading.tsx` shows an instant outline of cards on every tap (bottom bar stays); phone alerts re-save at most once a day per phone (was every visit: two extra calls).
- Judgement call: groups and modules are NOT cached per request, because an action that changes them re-renders in the same request and must show the new state.
- Ruled out: the service worker (network-only for pages), the live events stream (in-memory, light), page size (6–9 KB), Fly connection limits (200/250).

## 27/11/26 — Officials can start a private message to any member (owner screenshot: "no area to choose a member")
- "Ask the officials" was only an inbox for officials: they could open a conversation only after a member wrote first. It now opens with "Write privately to a member": a list of every other member, by name (no numbers), and Write. The conversation is the same private thread a member's own question uses (only that member and the officials read it), so `canSeeMessage` and `threadForNewMessage` are unchanged; the server lets an official open a thread with any member of the group (`lib/messages.ts`, `members` in the view).

## 27/11/26 — My email on My profile (owner: research, decide and customise)
- Optional email for receipts, statements and replies, never used to sign in (phone + PIN stays). Hidden on screen ("wa•••@gmail.com") with Show / Hide, editable, an empty box removes it.
- New per-user table `ProfileContact { userId, email, updatedAt }` like ProfilePhoto and AuthPin (kept out of Membership; no tenant column, so no RLS policy, same as those two). Additive `db push` on release.
- Rules in `@stawi/core` `contactEmail` / `hideEmail` (+ tests).

## 27/11/26 — Same tester, two more: business ideas start from the group's real capital; profile phone hidden
- `/match` started at a fixed KES 120,000 while the group had KES 75,650. It now starts from the group's recorded capital (sum of members' totals), names it ("Stawi Demo Chama has KES 75,650 recorded") and offers "Use this amount" when the member typed another figure. 120,000 stays only for someone with no group. The saved shortlist is now kept per group (`stawi.match.v1:<groupId>`).
- My profile showed the full sign-in number. It now shows "07•• ••• 678" with a Show/Hide button. Judgement call: a small local `hidePhone` in the profile page rather than importing `maskPhone` from `pin-policy.ts`, which is server-side sign-in code (protected) and not exported for the browser.

## 27/11/26 — Tester (+254 789 334508): shortlist kept between tabs; "Money: what do I do?" on the member home
- Business ideas (`/match`): the shortlist was only in page memory, so leaving the tab reset it to 0/3. It is now kept on the phone (`stawi.match.v1`, read back through `readSavedMatch` in `@stawi/core`, which drops malformed entries and never returns more than three). A line under the shortlist explains how to change it: × to take one off, ☆ to add another, and Write the funding proposal to edit name, cost and plan.
- Judgement call: kept per phone, not shared with the group, because a shared shortlist would need a new table (database is a protected area). Ask the owner before making it a group list.
- Member home: three drawn cards, Pay my contribution (jumps to Pay, or to the group money table where that country cannot take payments yet), Borrow from the group, Take my money out. Borrowing and withdrawing are explained as agreed at the meeting and written in the minutes; Stawi does not lend or pay out. English and Kiswahili (`components/MoneyHowTo.tsx`).

## 27/11/26 — Actions trimmed (owner: trim the bill)
- CI ran on every PR push and again on the push to main (49 duplicate runs in a week). Now pull requests only (plus by hand), docs-only changes skipped, superseded PR runs cancelled. Deploy and the PR image build also skip docs-only changes.

## 27/11/26 — Moderation no longer blocks everyday chama sentences (owner "go ahead")
- Found while testing: `moderateText` blocked "We will slaughter three goats", "burn charcoal", "kill pests in the maize", "eliminate the debt", "exterminate rats" (incitement/hate) and "I hate mosquitoes", because the patterns accepted any object. Minutes (now often spoken), messages, proposals and names go through it.
- Fix (`packages/core/src/moderation.ts`): violence and hate patterns need a human target (them / those people / tribes, clans, communities, members, named ethnic groups…), plus "burn their houses / the church…" and "lynch". The existing tests pass unchanged; new tests both ways.

## 26/11/26 — Homepage path for non-technical visitors; audit clean-up (owner 22:29)
- Landing now: hero with "Open my group" and "How it works" → "What would you like to do?" (run my chama's money, speak our minutes, find a business to start, keep my shop's books) → How it works (sign in with phone + PIN → join or start your group → record, and everyone sees → grow together) → the existing value banners, vision and "why groups stall" → Help (email). Phones get a fixed dock with "Open my group". English and Kiswahili (`components/HomeFlow.tsx`).
- Header: a "Sign in" button; the theme toggle is a drawn sun/moon with the word (was an emoji, standing rule 13).
- Clean-up: removed the mobile `lib/tokenCache.ts` (Clerk leftover) and the unused `expo-secure-store` package. The inert public Clerk webhook `app/api/webhooks/clerk/route.ts` is removed in a separate PR (sign-in area, owner yes needed).

## 26/11/26 — "A minimum, not a maximum" (owner: encourage members who can to put in more, so the group reaches its capital sooner)
- Research: in the standard savings-group model (CARE VSLA) members buy one to five shares a meeting and the share price is set low enough that everyone can buy at least one; studies of peer savings groups (Chile, Kenya) found public goal setting and group monitoring raise savings. Balance noted: CARE Malawi saw disparities where some members bought up to 100 shares, so the card keeps "nobody is pushed, one member one vote".
- Lit card under the capital on the home screen (`components/GrowCapitalCard.tsx`, English/Kiswahili by My language): the minimum keeps everyone in; anything above it is yours (raises your share of capital and profit); paying more shows trust in the plan and the members; nobody is pushed. "See how much sooner you get there": capital needed, agreed minimum, meetings a month, members who can add more and how much → months with the minimum only vs with some adding more, from the group's own total and member count (saved on the phone per group). "Send this to my group on WhatsApp". Sums and words in `@stawi/core` `grow-capital.ts` (+ tests).

## 26/11/26 — Record feedback always visible (owner: "the feedback message is not popping up when you record")
- Confirmed live: the "Contribution recorded / not recorded" banner was drawn inside the group-total card ABOVE the form, so after tapping Record it appeared off the top of the phone screen (on a computer it sat under the top tab bar). Now the treasurer form's banner floats pinned at the TOP of the screen (owner: the keyboard hides the bottom; top catches the eye) in solid green (done) or solid red (not done) with white words (`FeedbackBanner float`, `.fb-float`), so it shows wherever the page is scrolled.
- Seen in the same live check: the Search button (from the audit) sat on top of the "Me" tab on phones — the tab bar's backdrop blur makes it the frame for fixed children. Search is now rendered outside the bar, pinned top-right on every screen size.
- The "Record this contribution?" check now opens on older phone browsers too (no `showModal`: opened as a pinned box with a dark backdrop).

## 26/11/26 — Audit, live refresh per group, "Me" tab and Search (owner: "complete audit … dashboard, settings, search tab")
- Audit: typecheck, core and db tests, and web build all green; every web component, lib and core module is used (checked by imports); removed the unused `jsonwebtoken` and `@types/jsonwebtoken`. (A package-based dead-code scanner was blocked from running here; the check was done by hand.)
- Bug fixed: live refresh. Every write was published to the shared "public" channel, so ONE contribution refreshed every open page of every user in every group (each refresh re-reads the database). Now writes publish to `g:<groupId>` (`groupChannel` in `lib/events.ts`) and the home screen, group page and money record listen only to their own group; `/api/events` accepts several channels. Writes that used a tenant channel no longer miss pages listening on "public".
- Navigation (research: Material navigation bar = three to five destinations; low-literacy research: pictures with words, simple consistent navigation): five tabs — My group (the home dashboard), Ideas, Books, Messages, **Me** (new drawn picture; My profile = settings: name, photo, phone, PIN, language, alerts, chamas, payments, records, sign-in, and Share moved here). **Search** is a button above the tabs on every tabbed screen (drawn picture + word), not a sixth tab. Judgement call: no separate "Settings" tab — for these users one personal place is simpler. New pictures should be checked with testers (standing rule).
- `/search`: members, payments (by name, M-Pesa code or amount), meeting agenda text, whole-group messages — only in the caller's own chamas (private officials threads excluded) — plus the app's own places by name in English or Kiswahili ("loan", "lugha", "PIN"). Rules in `@stawi/core` `search.ts` (+ tests). Tab test updated for Me/Search labels (same strength).
- Tab bar now also shows on profile, search, write and proposal pages.
- Bug fixed (sign-in area): `linkMembershipsByPhone` re-pointed EVERY roster row carrying a number to whoever proved it — including rows another login already held (shared family phones, a director who also teaches). It now claims only unclaimed `pending:` rows (+ db test).

## 26/11/26 — Speak the minutes (Kiswahili or English) + My language (owner: members who cannot write but speak well)
- Research (26/11/26): the browser's speech recognition (Web Speech API) runs in Chrome incl. Android and the Play app, with "partial support" (caniuse) and reports of flaky results on Android Chrome; Google voice typing (Gboard keyboard mic) supports Swahili (Kenya, Tanzania) and Kikuyu; for paid cloud speech-to-text Swahili is GA on Azure (sw-KE, sw-TZ), preview on Google Chirp 3, and offered by Soniox / ElevenLabs Scribe (vendors claim low error rates). Chosen now: phone speech recognition first, keyboard mic as the always-works fallback, no new cost. A paid Swahili speech service (recorded audio → text) is an owner decision (cost, key, data protection).
- `components/DictateBox.tsx`: pick Kiswahili / English (remembered as the app language), big "Tap and speak" button (continuous, live words shown), editable box, clear messages when the phone cannot listen or the mic is blocked (then the keyboard mic). Used in the minutes form ("🎙 Speak the minutes (Kiswahili or English)" next to photo import) and in Write it for me.
- "Turn into minutes →" (`groups/[id]/speech-actions.ts`, officials only): with `ANTHROPIC_API_KEY` Claude turns the spoken words (Kiswahili, English, Sheng, mixed) into formal English minutes fields — date, present, absent, apologies, agenda items with resolutions, amounts, and the group's plans/objectives as their own item — using the roster to fix names; else the existing notes parser. The form is pre-filled; the official corrects everything and posts as usual. Rules: `@stawi/core` `dictation.ts` (+ tests).
- My language / Lugha yangu in My profile (Kiswahili / English, saved on the phone, same key as the home page choice). Honest: only some screens have Kiswahili words yet.

## 26/11/26 — "Write the funding proposal for me" (owner: groups seeking credit cannot write technical proposals)
- `/proposal` (officials only; server-checked): from the business chosen in Business Matching (new "Write the funding proposal" button on each shortlisted business; or typed in), the group's own records (members, officials from the charter or roles, every confirmed contribution: total, contributors, first/last date, months, monthly average) and a few answers (own contribution from savings, lender, goal, months, the yearly rate the lender quoted, expected sales if known, security) it writes the complete proposal: 1 Summary, 2 About the group, 3 Savings record, 4 The business, 5 Budget and funding (budget split by kind of business, adds up exactly), 6 Repayment plan (reducing balance, monthly instalment, total interest, how many times profit covers the instalment), 7 Risks and how we will manage them (by kind of business plus governance risks answered by Stawi's own safeguards), 8 Request; letterhead; "Electronically signed by <official>, <post>, on <date>, after confirming the details are true" (tick required) plus signature lines for the other officials. Save as PDF / Print, Download Word file (.doc built on the phone), Back bar.
- AI: with `ANTHROPIC_API_KEY`, Claude polishes the wording (shared spend cap with Write it for me); kept only if every heading and every KES figure survives unchanged (`parsePolished`), else the plain version. Expected sales left empty = a careful estimate (one sixth of start-up cost a month), said so in the text.
- Checks: cannot put in more than saved; no loan if savings already cover it; 3–60 months; rate 0–60%; a goal sentence. Lender is typed (suggestions list; Uwezo/Women/Youth funds are being merged into a Biashara Fund — status unsettled in 2026, so both names are suggested). Nothing is sent to any lender.
- Also: "Write the funding proposal for me" next to "＋ Add a member" on the home screen for officials. Rules in `@stawi/core` `funding-proposal.ts` (+ tests).

## 26/11/26 — "Write it for me": a photo of notes becomes a formal document (owner: "for those who cannot type … let the OCR read, analyze and write a very formal document")
- `/write`: choose what you need (letter, notice to members, meeting minutes, group rules, complaint/report, request/application), the group it is for, then "Take a photo of my notes" (or choose a photo, or type/dictate a few words). The result is editable, then Save as PDF / Print (clean print layout), Copy, Share on WhatsApp; Back bar after printing.
- With `ANTHROPIC_API_KEY` set on Fly (Stawi does NOT have it yet — owner adds it; Claude never handles keys): Claude (`claude-sonnet-5-5`, `FORMAL_WRITER_MODEL` to change) reads the photo itself, handwriting and Kiswahili included, and writes the document using only facts in the notes (blanks "_____" for anything missing; notes treated as data, never instructions). Spend cap in memory: 10 a person and 300 in all per day (`FORMAL_WRITER_DAILY_PER_USER`, `FORMAL_WRITER_DAILY_TOTAL`); `FORMAL_WRITER_PROVIDER=off` turns it off. Without the key: the photo is read on the phone (Tesseract, English + Kiswahili, never leaves the phone) and the words get a formal frame (title, group, date, salutation, numbered points, signature lines). Output screened like all text; nothing stored. The page says which of the two read the photo.
- Ways in: "Write it for me" card on the home screen and the group page, a small one on Messages (notice), and in My profile for complaints. Rules in `@stawi/core` `formal-writer.ts` (+ tests); `lib/formal-writer-ai.ts`; `app/api/write/route.ts`.

## 26/11/26 — A way back after printing or saving a PDF (owner: screenshot of Save as PDF on the group papers)
- After the phone's print / Save-as-PDF screen the person was left deep on the paper with the only Back link at the top. `components/ReturnBar.tsx`: a "Back to <group / My profile>" bar fixed at the bottom of the screen on the papers pack, payment history and receipts (never printed; sits above the tab bar), and when the print screen closes (`afterprint`) it lights up with "Saved or printed. Your paper is in your phone's Downloads." `PrintReturn` (in the root layout) gives the same lit Back on every other page that prints (minutes, books).
- The receipt link under the group total no longer opens a new tab: in the Play app a new tab has no way back.
## 26/11/26 — One phone number, many chamas: "Switch chama" (owner request)
- Already true underneath: one phone + PIN is one account, and every chama whose roster carries that (proven) number shows on the home screen. What was missing: the switcher only appeared with 2+ groups and was easy to miss, and someone already signed in had no way to add a second chama that added their number (the joining-code screen is only on sign-in and would make them choose a new PIN).
- `GroupSwitcher` is now always a clear "Switch chama" / "My chamas" button (name, your role, how many chamas), with each chama one tap away plus "＋ Join another chama (joining code)" and "＋ Start a new group"; Esc closes; full width on phones.
- New `/api/auth/join-more` (signed in, sign-in area): type the new chama's joining code; same checks as sign-in codes (this phone, once, 48 h, 5 tries, throttled); links the roster rows carrying the number to this account and marks the phone proven; session and PIN unchanged. "Join another chama" card in My profile (`/profile#join`); My profile lists every chama with "Open".

## 26/11/26 — My profile: one place for everything that is mine (owner request)
- Owner could not find the name edit (it was only on each group page) and asked for one personal place: name, photo, phone number, "what is not working", payment history and a download of all personal records.
- `/profile` ("My profile" button at the top of the home screen, drawn person icon; the old "Account" button): photo (picked photo shrunk on the phone to a 256 px JPEG, stored in new table `ProfilePhoto`, never in the roster — the lesson from Telpen Edu's 346 GB; served by `/api/photo/<userId>` only to the person and people who share a group with them; `Membership.photoUrl` holds the short link); one name for every group; change phone number (current PIN required; refused when the number has another Stawi account or a group has it for someone else; updates the Supabase login, the PIN row, my roster rows and my devices); change PIN (current PIN, new twice, sign-in lock rules); my payments in every group with links to each history; "Download all my records" (`/api/me/records`, CSV: name, phone, groups and roles, every payment, total); "Something not working?" (email shown as text plus a mail button); sign-in devices and delete account.
- Judgement calls: changing the number cannot be proven without an SMS, so it needs the current PIN and is refused for numbers another member or account holds; no emoji in the new button (drawn icon, words kept).
- Rules in `@stawi/core` `profile.ts` (+ tests).

## 26/11/26 — My payment history: print, save as PDF, download (owner request)
- Every member has their own page `/groups/<id>/history`: every contribution in their name (date dd/mm/yy, way, reference, witnessed n of 2, amount, running total, total and number of payments); corrections show as their own line. "Save as PDF / Print" (print layout hides the app bars) and "Download for Excel (CSV)" (`/groups/<id>/history/csv`, UTF-8 with BOM, text cells guarded against spreadsheet formulas).
- Who sees what: a member sees only their own; the Chairperson, Secretary and Treasurer can pick any member of the group (server-checked in `history/access.ts`).
- Links: under the group total on the home screen ("My payment history (download)"), on the Money record page, and mentioned on the group page card. Rules in `@stawi/core` `member-history.ts` (+ tests).

## 26/11/26 — Testers can open an account from "Sign in"; Add a member; Back on every page (owner request)
- Testers (e.g. Akina, Benedict) typed their own phone and a PIN on the Sign in screen and were refused: they had no account yet, and the screen only said "phone and PIN do not match … ask for a joining code". Now a number Stawi has never seen, that no group has added, gets "Welcome! This number is new to Stawi. Type the same PIN again" on the same screen and the account opens (the agreed "no PIN yet → choose one"). A number a group added still needs that group's joining code; an existing account with a wrong PIN is unchanged (5-try lock). Judgement call: this tells a caller that a number is new to Stawi; the per-IP and per-phone limits stay.
- After opening an account the person lands on the home screen (welcome + "Join the demo chama"), no longer straight on "Start a group".
- "＋ Add a member" on the home screen for the Chairperson, Secretary and Treasurer → the group's charter roster (`/groups/<id>?tab=charter#members`, scrolls there), with the hint to save and hand over the joining code.
- Back on every page: `components/BackLink.tsx` (goes back inside Stawi, else to a safe page; never leaves the app) on formalize, books, community, match (Ideas), messages, sacco, admin, subscribe, terms, the legal pages, receipts and account deletion; existing back links share the same `.back-link` look (40 px tap target).

## 26/11/26 — Signing in with phone + PIN on a new phone (owner: "taking too long to open … confirm and fix")
- Found: a PIN sign-in on a phone Stawi had not seen before did not mark that phone as trusted, so the first app page sent the person to /pin/setup, which (no joining code just used) sent them back to sign-in asking for a code. On the owner's own phones it worked because they were already trusted. Fix: a correct phone + own PIN now trusts that phone (same as after choosing a PIN), in `app/api/auth/pin/sign-in/route.ts`.
- Also: after a correct PIN the screen does one clean page load instead of two (was router.push + refresh) and the button reads "Opening your groups…" until the page shows, so nobody taps again thinking it froze.
- Measured live from Chrome (Kenya → Frankfurt): health ~0.2 s, sign-in answer ~0.7 s, dashboard ~1 s server time, ~3.9 s full load.

## 26/11/26 — Phone alerts: new messages and new contributions (owner: "so that the app is not going to remain dormant")
- Every member who turns alerts on gets a phone alert (Web Push, works in the Play app through the TWA and in the browser) when: a whole-group message is posted (sender + first 140 characters); a private member–officials message is posted (officials + that member only, and no words on the lock screen); a contribution is recorded by the treasurer, or an M-Pesa payment confirms (member, amount, way, new group total); a correction is approved by the five. The person who acted is never alerted about their own action. A tap opens the money record or the messages.
- "Turn on alerts" card on the dashboard and the group page (asks only from a tap; blocked phones get the Settings path; once on, one quiet line). Existing permission is re-saved on each visit.
- Pieces: core `alerts.ts` (+ tests: words and who gets them); `lib/push.ts` (send, prune dead phones, quiet no-op without keys); `lib/group-alerts.ts` (members → user ids, including roster rows whose person signs in with phone + PIN); `/api/push/key`, `/api/push/subscribe` (signed-in only); `public/sw.js` push + notificationclick + pushsubscriptionchange; new table `PushSubscription` (per user, not per group, like AuthPin — not in the group RLS array).
- Keys: `.github/workflows/push-keys.yml` (run once by hand after merge) generates the VAPID pair and stores it straight into Fly secrets (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`); no person sees the private key; re-running does nothing unless "replace" is ticked.
- Judgement calls: contribution alerts show the amount and name, as asked (every member already sees each member's total in the app); private officials' messages never show their words on a lock screen; no SMS (owner 20/11/26 rule stands).
## 26/11/26 — Your name in the group (owner: "yes, fix it")
- The founder of a new group showed as "Group founder" with no way to change it. Now every member can change the name they show in a group ("Your name in this group" on the group page; it opens by itself while the name is still "Group founder"). `updateMyNameAction` changes only the caller's own membership rows in that group (login or verified phone), never role or money; text is moderated; rules in `@stawi/core` `display-name.ts` (+ tests).
- A new group now starts with the founder's name from another group they belong to, falling back to "Group founder".
- Judgement call: the name in the charter roster (written by the officials) is a separate record and is not changed by this; officials edit it in the charter as before.

## 26/11/26 — Trust in the money record + check before you record (owner request; money + database = protected, owner merges)
- Owner: "make it very difficult for somebody to edit the figure which has already been entered"; corrections need the Chairperson, Secretary, Treasurer, a neutral member and the member whose money it is; collection in front of witnesses. Choices: neutral picked at random by Stawi (re-picked after 3 days with no answer); witnessed cash counts at once, clearly marked, flagged after 7 days.
- Rules in `@stawi/core` `money-trust.ts` (+ 14 tests): witnesses (2 different members, not the recorder, not the payer) for `CASH` and `MPESA_PHONE`; approval seats (each official once, the member, a random neutral; a missing official or an official who is the member is replaced by one more neutral; at least 3 different people who can sign in); one "no" stops it; 14-day expiry.
- Database (additive): `ContributionWitness`, `ContributionCheck`, `ContributionCorrection` (seats as JSON), `CorrectionDecision`, nullable `Contribution.correctionOfId`; all four added to the RLS array in `rls.sql`. Nothing edits or deletes a contribution: an approved correction writes a NEW adjustment entry (corrected − current, may be negative) inside one transaction, guarded so a double tap cannot write it twice. `paid` now means total > 0 (a correction to zero cancels it).
- Server: `app/money-actions.ts` (witness answer, "that's mine / that's wrong", ask for a correction, approve / say no — each approval re-checks the person's own PIN with the sign-in lock rule; the Play review account uses its configured PIN), `lib/money-trust.ts` (load, lazy expiry and neutral re-pick, alerts), `myMembershipIds` in `lib/group-access.ts`. `recordContributionAction` takes `witnessIds` and writes the entry and its witnesses in one transaction.
- Screens: treasurer form asks for two witnesses when the way is cash or M-Pesa to a phone; new page `/groups/<id>/money` ("Money record", every member, nobody else) with "Waiting for you", corrections with each approver's name and answer, and every entry with badges; a card on the group page shows the member's tasks and alerts (7-day overdue witnesses, disputes for officials).
- Check before you record (owner 26/11/26 16:59): "Record this contribution?" sheet reads back member, amount (large), way, reference and witnesses with "Yes, record it" / "Cancel", and warns when the amount is 5× or more what the member has on record ("check the zeros"). The M-Pesa request gets the same step ("Send this M-Pesa request?"). `components/ConfirmSheet.tsx` (native dialog: Esc cancels, focus kept), `contributionConfirm` / `stkConfirm` in core `feedback.ts` (+ tests), `.cf-*`, `.wit-pick`, `.mr-*` CSS.
- Judgement calls: approvals re-ask the PIN (not a code) so a phone left unlocked cannot approve; the mobile app has no cash recording, so nothing to change there; STK and member-pay entries need no witnesses (M-Pesa itself is the witness). Not built: SMS/email alerts to members (the alerts show in the app).
- Local note: `prisma generate` works offline here with `PRISMA_QUERY_ENGINE_LIBRARY` and `PRISMA_SCHEMA_ENGINE_BINARY` pointed at empty placeholder files plus `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1`; with that the web typecheck is fully clean.

## 26/11/26 — "Contribution recorded" banner for the treasurer (owner request)
- After recording a contribution the treasurer sees a highlighted green banner: "Contribution recorded" — KES amount, member, how it was paid, the new group total, and that every share is updated. A failure shows a red "Contribution not recorded" with the reason (before, errors showed in the same small green line). The button shows "Recording…" and ignores a second tap until the first finishes.
- `components/FeedbackBanner.tsx` (reusable: success / error / info, role=status or alert, closable, stays 7–9 s) + `.fb-*` CSS (brand tokens, dark mode, reduced motion); words from `@stawi/core` `feedback.ts` (+ test).

## 26/11/26 — One demo chama for every tester, and a welcome that sells the value (owner request)
- Owner: all testers (and he, and the Play reviewer) in ONE registered group; people not yet in any group get a space that markets the value, without ever seeing another group's details.
- "Join the demo chama" (`joinDemoGroupAction`, `components/DemoChamaCard.tsx`): anyone signed in joins the group set in `STAWI_DEMO_GROUP_ID` as an ordinary MEMBER with one tap, no joining code (sample money only). Shown as "Tester 482" (last three digits), phone stored empty, so testers never see each other's numbers. Never changes a role already held there. Officials stay the people the owner chose. Unset env = the card does not appear.
- Judgement call: one tap instead of adding 47 phone numbers to the roster and handing out 47 joining codes (we hold testers' emails, not their numbers; roster rows would also show their numbers to other members).
- No group yet: a colourful welcome (hero + four cards: Your group, Business matching, Simple business books, Savings and credit "Coming soon"), global wording (savings groups, chamas, stokvels), first month free and the starting price kept; all value banners below with the first one open. Only Stawi's own story: no other group's members, money or business.
- CSS: `.welcome-*` cards with pillar colours, hover lift, dark mode via tokens, reduced-motion respected; share buttons lift on hover.
- Owner steps: set `STAWI_DEMO_GROUP_ID` on Fly to the demo group's id (from its address /groups/<id>); make sure his own number is its chairperson.

## 26/11/26 — Share where people are: WhatsApp, Facebook, X, Telegram, LinkedIn, SMS, email (owner: "come up with the most popular tools")
- Owner saw the computer's own share box (OneNote, Outlook, Copilot). `ShareBar` (landing, subscribe, dashboard) now leads with WhatsApp and Facebook (most used in Kenya: Media Council of Kenya 2026, Communications Authority, GeoPoll 2025), then X, Telegram, LinkedIn, SMS, email, "TikTok, Instagram & more" (phone share sheet on phones; copy link + hint on computers) and Copy link; English and Kiswahili. Each button keeps its own `?via=` so engagement counts show which works (`ShareChannel` extended).
- The tab-bar Share uses the phone's share sheet on phones and opens our panel on computers.
- `@stawi/core` `share-targets.ts` (+ test), named `socialShareMessage`/`SocialChannel` here to avoid clashing with the existing share helpers; a private link only ever gets WhatsApp, SMS and email.

## 26/11/26 — Joining code wording: clearly never an SMS code (owner: "Keep it for group members", "correct wording")
- A tester elsewhere was asked for a "sent code"; the owner wants no app to suggest a code is sent. Stawi keeps the joining code for members a group already added and for a forgotten PIN (owner 26/11/26), because it stops a stranger typing a member's number and opening the group's money records. New people open an account with phone + PIN only.
- Every screen and message now says the code is handed over in person or on WhatsApp and never sent by SMS; the sign-in links read "Your group added you, or forgot your PIN?" and "New to Stawi? Open an account (phone + PIN, no code)". Phone app: the same link text; the offline prototype no longer says "We'll text a one-time code". `docs/PLAY-LISTING.md` sign-in note updated (it still described the old SMS code).
- Not done, needs the owner: a solo account (own books, no group) that forgets its PIN has no one to give it a code; Stawi has no support tool to clear a PIN safely yet (the /admin page is a demo board without staff sign-in checks).

## 26/11/26 (12:10) — Sent to Google for closed-testing review
- Owner set PLAY_REVIEW_PHONE + a 4-digit PLAY_REVIEW_PIN (6 digits is refused by `isReviewPinLogin`), signed in and made the demo group "Stawi Demo Chama" through the app; entered the phone + PIN in Play Console Sign in details (Claude filled the name and instructions). `ANDROID_CERT_FINGERPRINTS` live with both fingerprints (assetlinks checked).
- Claude: target audience 18+, Data safety submitted, content rating redone (block + report + moderated chat), PR #50 merged, then Publishing overview → 14 changes sent for review (closed testing Alpha, Kenya, Telpen Closed Testers). Google's review usually takes up to 7 days; then 12 testers × 14 days before production.

## 26/11/26 — Seen by Google: robots.txt and sitemap.xml
- Audit: getstawi.com (+ *.getstawi.com) and stawi.fly.dev serve Stawi with Issued certificates; health ok; assetlinks has both fingerprints. `/robots.txt` and `/sitemap.xml` redirected to sign-in (middleware), so Google saw a login page.
- `app/robots.ts` replaces `public/robots.txt` (adds the sitemap line and keeps private areas out); `app/sitemap.ts` lists public pages; middleware lets both through. Canonical host: `NEXT_PUBLIC_APP_URL`, else getstawi.com.

## 26/11/26 — Reviewer seed runs inside the live image
- `seed-demo.ts` failed on Fly (`@stawi/core` is not in the standalone image): phone formatting is now inlined, and it no longer falls back to "the first group" (that could have made the reviewer treasurer of a real customer's group). It only uses the demo group `org_umoja` and stops otherwise.

## 26/11/26 — Closed-testing audit (owner: "streamline everything for the Stawi project … submit to closed testing")
- Live checked: `/api/health` ok; privacy, terms, delete-account and manifest load. `assetlinks.json` is `[]` until the Android build.
- `docs/PLAY-LISTING.md` brought up to date: phone + PIN sign-in (no SMS), in-app messages (content rating "users interact: Yes", Data safety "Other in-app messages"), Africa's Talking gone, live host, status and owner-only steps.
- Landing: the last two emoji (door, gift) replaced by a drawn picture / plain words (standing rule 19).
- Play Console filled and closed-testing release 1 saved as a draft (details and owner-only steps: `docs/PLAY-LISTING.md` → Status 26/11/26). Screenshots are of public pages only; retake from a signed-in phone later.
- Messages: every message from someone else has a Report link (pre-filled email to telpeninfo@gmail.com) — Play's user-generated-content policy needs an in-app way to report. Tab emoji there replaced by drawn pictures.
- Block (owner 26/11/26 "fix it"): each message from another member in "Whole group" has Block; it hides that member's messages on this phone only (`@stawi/core` `message-blocks.ts`, localStorage per group, tests). Nothing on the server, the member is not told, "Ask the officials" stays readable. A server-side block that follows the person to every phone needs a new table (database = protected area): owner decision. After this is live, update the content rating answer "ability to block" to Yes.

## 25/11/26 — PRD v3 restructure merged (owner: "Two draft pull requests sitting idle fix them appropriately")
- PR #28 is brought up to date with main and merged as the plan of record. Nothing new is built. The open decisions in `docs/PRD-V3-RESTRUCTURE.md` §7 and `docs/PRICING-PROPOSAL-2026-11.md` still need the owner's yes, and prices in code are unchanged.

## 25/11/26 — Paper minutes read in English and Kiswahili, self-hosted (owner standing rule: best OCR and photo tools, all projects)
- "Import written notes" (GroupCockpit) used Tesseract.js 5.1.0 from a third-party CDN, English only. It now uses Tesseract.js 7 with English + Kiswahili compact models, served from our own site (/ocr, copied at build by `apps/web/scripts/copy-ocr-assets.mjs`, git-ignored). The photo never leaves the phone; members check the words before "Use these notes". The middleware skips .gz/.wasm files.
- Handwriting: Tesseract reads printed text well and neat handwriting fairly; messy handwriting still needs typing. The text box stays editable for that reason.

## 24/11/26 — Drawn tab pictures replace emoji (owner: "go ahead and implement your recommendations"; standing rule 19)
- `apps/web/components/TabPictures.tsx`: five of Stawi's own drawings on a light tile, brand palette only: My group (members round the pot, a coin inside), Ideas (seedling growing from a coin), Books (open exercise book and coins), Messages (speech bubble), Share (megaphone). `AppTabs.tsx` uses them; words stay underneath in English/Kiswahili. Same on every phone, offline, light and dark. Current tab: gold ring round the tile, bold label, gentle pop.
- Why (researched 24/11/26): emoji are drawn differently per phone maker and Android version, and Android 11 and lower cannot update the emoji font (about 10% of Kenyan Android phones are on 11, StatCounter mid-2026); emoji are read differently by age and culture (PLOS One 2024); hand-drawn, semi-abstract pictures were best understood by people who read little (Medhi et al., Microsoft Research India); Material guidance pairs icons with labels.
- New standing rule 19 in `docs/STANDING_RULES.md` (all products). Member test script: `docs/PICTURE-TEST.md`; picture sheet: `design/stawi-tab-pictures.svg`. Guard: `packages/core/test/tab-pictures.test.ts` (no emoji in the tab bar, every picture drawn, words kept, brand colours only).
- Same day, owner: "Fix them also" (emoji inside pages). `apps/web/components/Pictures.tsx` is now the picture library: 34 drawings (the five tab pictures plus note, agenda, badge, moneybag, handshake, bank, eye, office, certificate, mic, compass, hourglass, basket, box, receipt, purse, lock, scales, folder, envelope, link, clipboard, page, chart, growth, cash, shop, phone, pencil). The shared data in `@stawi/core` still names pictures by emoji (the phone app reads it), so `pictureFor` maps emoji to drawing and `<Pic icon>` falls back to the emoji if one is not drawn yet. Used in: module switches, value banners, "open door" needs, new-group start cards, the Share bar, the group record tabs (Charter, Minutes, Documents, Month-End, SACCO+), the documents list and the collection tips. Sheet: `design/stawi-pictures.svg`. The guard test also checks every picture the shared data names has a drawing.
- Left as they are: arrows and ticks (ordinary text characters every phone draws); country flags; the collection-way dropdown (a dropdown cannot hold a drawing); emoji typed inside sentences and messages; the phone app (apps/mobile) still shows the emoji from the shared data.
- NOT done yet: the member test itself (owner or a field official runs it; a picture under two in three right is redrawn; watch the lock, which research found some people read as "not allowed"); hold-to-hear the tab name (needs a Kiswahili voice on the phone; second step).
## 24/11/26 — Builds install exactly the lockfile (owner: "Yes, go ahead")
- `.github/workflows/ci.yml` and the Dockerfile deps stage now run `npm ci` (was `npm install`). Every build gets the packages in `package-lock.json`; a package.json change without a lockfile update now fails CI instead of silently resolving new versions. After changing any package.json, run `npm install` (npm 10.9.8 via packageManager) and commit the lockfile in the same change.
- Checked before the switch: the Dockerfile's deps layout (root + four workspace manifests + lockfile + .npmrc) installs with `npm ci` under npm 10.8.2, the npm that ships with CI's Node 20.

## 24/11/26 — package-lock.json synced with package.json (owner: "fix all these appropriately")
- Regenerated from a clean clone with the repo's npm 10.9.8 (`npm install --package-lock-only`): 144 packages out (the Clerk tree; package.json had already moved to Supabase), 25 in (Supabase, async-storage, url-polyfill and their deps), 18 transitive consolidations; async-storage pinned to 1.23.1 as apps/mobile asks (Expo 51). Next, React, Prisma, TypeScript, Expo and React Native versions unchanged. `npm ci` now works; lint and tests (core 444, db 13) pass.
- Not changed (deploy config, protected): CI (`ci.yml`) and the Dockerfile use `npm install`, which re-resolves on every build; proposed to the owner to switch both to `npm ci`.

## 24/11/26 — Tabs and touch feel (owner: tabs and icons responsive and attractive)
- `apps/web/app/globals.css` closing block, CSS only: no grey tap flash anywhere; the gold keyboard ring on every control (it was only on some); buttons and "Go" links press in slightly; value-banner pills gain a hover (pillar border, lift) and smooth colour change; banner and section tab strips snap, never wrap a label, and the banner strip fades at the right edge on phones; "Go" links deepen on hover; the bottom-tab picture pops gently when its tab becomes current; on a computer the tab pictures warm to gold on hover. Reduced motion still switches everything off.
- Judgement call: the bottom tabs keep their emoji pictures (owner 20/11/26: pictures and plain words, for people who do not read menus); only their motion changed.
- Local check: package-lock.json on main does not match apps/mobile (async-storage and Supabase packages added without a lock update), so `npm ci` fails; flagged, not changed here.

## 24/11/26 — Supabase keep-alive (owner yes 24/11/26)
- Supabase emailed (23/11) that the free project `stawi` was about to be paused for inactivity, which would stop sign-in. The database is Neon, so the daily `/api/cron` and Fly health checks never reach Supabase.
- Activity made by hand on 24/11 at the owner's request (read-only `select now();` in the SQL editor). New `.github/workflows/supabase-keepalive.yml`: every third day at 08:17 Nairobi, two read-only requests (Auth health and Auth settings; the REST root refuses the anon key with 401, seen on the first run 24/11) with the existing `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` GitHub variables. Writes nothing; a failed run emails the owner. If Supabase warns again despite green runs, the next step is a read-only RPC.

## 20/11/26 (19:00) — Sign-in reopened: secret fallback and owner bootstrap (fix forward)
- Production had no `AUTH_DEVICE_SECRET`, so after #40 sign-in said "not set up". The secret now falls back to one derived from `SUPABASE_SERVICE_ROLE_KEY`; a session password that no longer matches is set again after the PIN/code check.
- Accounts from before PINs have none: `OWNER_PHONES` + `OWNER_BOOTSTRAP_CODE` (Fly secrets) let the owner redeem a fixed code once, set a PIN, then give joining codes to others.
- `SUPABASE_SEND_SMS_HOOK_SECRET` deleted from Fly (staged until this deploy).

## 20/11/26 (18:40) — Sign-in without SMS: phone + PIN, joining codes (owner approved; awaiting merge)
- Owner: no paid SMS codes (Africa's Talking is not global); phone + own PIN; officials give a
  joining code the first time; no alerts or codes from Africa's Talking — the app's Messages instead.
- Sign-in: phone + 4-digit PIN on any device (`/api/auth/pin/sign-in`). First time / forgotten /
  locked: joining code from an official (`/api/groups/[id]/join-code`, `/api/auth/join`), 6 digits,
  one group + phone, once, 48 h, 5 tries, keyed hash in new `JoinCode` table (RLS). Founders open an
  account with phone + PIN (`/api/auth/start`); their phone stays unproven (no roster match by phone).
- Removed: `/api/auth/otp/*`, `/api/auth/send-sms`, `lib/sms.ts`, `lib/notify.ts`, `toSmsRecipient`,
  the M-Pesa receipt SMS, the Clerk mobile screen. Daily alerts post in group Messages.
- Play reviewer: `PLAY_REVIEW_PHONE` + `PLAY_REVIEW_PIN`. Subscriptions already Daraja STK.
- Owner/Chrome after merge: Fly secret `PLAY_REVIEW_PIN`; unset `AT_*`, `SUPABASE_SEND_SMS_HOOK_SECRET`,
  `PLAY_REVIEW_CODE`; turn off the Supabase Send SMS hook; update Play App access text.
- Docs: `docs/SIGN-IN.md`.

## 20/11/26 (18:10) — Buttons and wording checked, unused code removed (awaiting owner merge)
- Removed code nothing used: `components/sign-out-button.tsx` (sign-out lives in Account → Security),
  `lib/paystack.ts` and `lib/flutterwave.ts` (Paystack runs through `lib/local-providers.ts`),
  core `automation.ts` (mock eTIMS invoice, never on a screen) and `rotation.ts`, with their tests.
- Live check of the public pages (landing, /subscribe, /terms, /privacy, /sign-in, /delete-account):
  every link opens; signed-in links send to sign-in; /sacco stays 404 while SACCO+ is off.
- /subscribe in Kenya showed three size tiers all at "KES 10 a member" with member caps that are
  not enforced: now one "Your group" card (price, meetings-only price, plain features) plus Enterprise.
  Display only; the checkout amount is unchanged. Enterprise features in plain words.
- Share bar: when a phone refuses the clipboard, the link shows in a box to copy by hand.
- Landing footer says "for every group and business" instead of "multi-tenant SaaS".
- Signed-in screens still need a walk-through once the owner signs in to Stawi in Chrome.

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

## 20/11/26 (afternoon) — PRD v3 restructure drafted (awaiting owner approval)
- Owner brief: serve informal, non-literate table-banking groups first; members type a few points or **speak** (owner confirmed voice) and Stawi writes formal minutes; group goals; per-member contribution tracker; decision toolkit for business ideas; survival layer for businesses; loan-readiness pack so lenders' documents come out in one tap; fill every failure gap of groups, businesses and SACCOs and copy what strong SACCOs do.
- Research, gap analysis, 15-point MVP and build order in `docs/PRD-V3-RESTRUCTURE.md`; nothing built yet. Open owner decisions listed in its §7.

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
  receipts, CSV exports, acknowledgeable stock alerts, **M-Pesa/cash/card payment prompts**). All in `/books`. (`automation.ts` was never wired
  in and was removed 20/11/26.)
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
- 27/11/26 Second London machine (owner "yes"): manual workflow `.github/workflows/scale-london.yml` (input count 1–3, default 2) runs `flyctl scale count N --region lhr`; with auto_stop "stop" + min_machines_running 1 the second machine is a sleeping standby.
