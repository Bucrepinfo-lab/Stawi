# Flow and escalation audit — Stawi (20/11/26)

Owner's brief (20/11/26): analyse the whole of Stawi and apply the escalation
where it fits, reusing the standing orders written for Telpen Edu instead of
starting again. Every section must have an actionable process, and when nothing
takes action the right senior must hear of it.

## How a matter climbs

Level 1 = the responsible official · 2 = the Chairperson (the Vice Chairperson
for the Chairperson's own duty) · 3 = all officials · 4 = every member, because
the members own the group. An empty post falls through (no Secretary → the
Chairperson acts first; no officials named → the whole group sees it), so a
matter never lands on nobody. Days are counted on the group's own country clock.

Privacy (standing rule 14): a person receives only their own duties and what has
climbed to them. A matter that names one member stops at level 3.

Code: `packages/core/src/escalation.ts` (pure, tested in
`packages/core/test/escalation.test.ts`), `apps/web/lib/attention.ts` (server
filter), `apps/web/components/AttentionCard.tsx` (the "Needs attention" card on
the group page).

## Section → who acts first → what is watched

| Pillar | Section | Actionable process | Acts first | If nothing happens |
|---|---|---|---|---|
| 1 | Member list | Name a Chairperson, Secretary and Treasurer | Chairperson | **officials_missing** (7 / 14 / 28 days) |
| 1 | Rules | Write down the group rules | Chairperson | **rules_missing** (14 / 28 / 56) |
| 1 | Meetings | Record each meeting on the group's rhythm | Secretary | **meeting_overdue** (3 days' grace, then 7 / 14 / 28) |
| 1 | Minutes | Finish and post a draft | Secretary | **minutes_not_posted** (3 days' grace, then 7 / 14 / 28) |
| 1 | Money at the table | Write every contribution | Treasurer | **contributions_not_recorded** (same) |
| 1 | Member arrears | Follow up three missed contributions | Treasurer | **member_behind** (stops at officials) |
| 1 | Attendance | Follow up three absences without apology | Secretary | **member_absent** (stops at officials) |
| 1 | Month-end statement | Close each month | Treasurer | not yet watched — see gaps |
| 2 | Business ideas | Choose and test an idea | Group | none by design (a choice, not a duty) |
| 3 | Books — stock | Reorder when low | Business owner | existing low-stock alerts (`notifications.ts`), no ladder yet — see gaps |
| 3 | Books — daily record | Write each day's sales | Business owner | not yet watched — see gaps |
| 3 | Tax dates | File and pay on time | Business owner | not yet watched — see gaps |
| 4 | Savings and credit (off) | Repayments, arrears, approvals | Credit committee | to be designed with SACCO+ before it is switched on |
| — | Subscription | Keep the group's plan paid | Treasurer | existing subscription-due notice; no ladder (billing is protected) |
| — | Logo, motto, goals, sharing | Optional | — | none by design |

## Gaps found

1. **Nothing told anybody when a group went quiet.** A group could stop meeting,
   leave minutes in draft for months or stop writing contributions and no one
   was told. Fixed in this change (rows in bold above).
2. **Alerts appear only when the person opens the group page.** Telpen Edu sends
   them daily (cron, notify once per person and level). Stawi needs a small
   table to remember what was sent and a scheduled job. Both are protected areas
   (database, schedules) — **owner decision needed**.
3. **Month-end statement, daily sales record and tax dates are not watched.**
   Each needs dates the current records do not hold in one place. Next PRs, one
   watch each.
4. **Books has no senior.** A business has an owner but no ladder. Proposed:
   owner → group Treasurer (when the business belongs to a group) → Chairperson.
   **Owner decision needed.**
5. **Level 4 tells every member.** This follows the research (hidden records are
   why groups lose money) but it is a policy choice — **owner to confirm**, or
   say stop at level 3.

## Telpen Edu standing orders — what was adopted

| Telpen Edu order | Fits Stawi? | Where |
|---|---|---|
| Live stays live; fix once, fix everywhere; escalate in protected areas; never weaken a test; ship small; money human-authorised; data protected; secrets; each country its own; phones; owner reports; schedules cost minutes | Already adopted 25/10/26 | rules 1–12 |
| Flow audit — every section has a process and a stall watch (10/10/26) | Yes | rule 13, this document |
| Least privilege on the server (02/11/26); escalation lists private (09/11/26) | Yes | rule 14 |
| Three examples in every tab (23/10/26) | Yes, as a rule; the CI guard is a later PR | rule 15 |
| Approval audit before a country goes live (24/10/26) | Yes | rule 16 |
| The way most people pay comes first (19/11/26) | Yes | rule 17 |
| Default-policy rule; curriculum packs; band and level gates; Play closed-testing roster | No — school-specific | — |
