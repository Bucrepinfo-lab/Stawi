# Use only what you need — sections a group or business switches on and off (20/11/26)

Owner order, 20/11/26: Stawi must work for everyone, in parts. Some groups do
not want their officials' posts shown, or do not use agenda items. Some want
only well-run meetings and minutes and are happy with their bank or SACCO. Some
are a business with no group at all — a butchery, a shop, a bookshop, a hotel,
a pub, a guest house — and want only the books. Each must be made welcome, in
warm and honest words, and nobody is pushed towards savings and credit.

## The switches (`packages/core/src/modules.ts`)

| Switch | On | Off |
|---|---|---|
| Meetings and minutes | Meetings and Documents tabs | Hidden; stalled-meeting watches stop |
| Agenda items (needs meetings) | Agenda section in the minutes form | The form does not ask for agenda items |
| Show officials' posts | Members see who holds which post | Members get the list without posts (removed on the server); officials still see them; minutes still name who chaired; the "name your officials" watch stops |
| Contributions and money statements | Table money, pay card, month-end and money statement | No money asked for or shown; money watches stop |
| Business ideas | Ideas tab | Hidden |
| Business books | Books tab | Hidden |
| Savings and credit | Offered only where `SACCO_PLUS_ENABLED` is on | Nothing about it is shown to that group |

Switching off never deletes anything. The group's officials (chair, secretary,
treasurer) change the switches on the group page under "Choose what you use";
the server checks the role and stores the choice on the group (`Group.modules`,
a new nullable column — additive).

## Ways to start (`/groups/new`)
1. A group — meetings, money and more (everything on).
2. A group — meetings and minutes only (no money, no ideas, no books).
3. A business — the books only. No group is needed; the books open at once.

**Access change (tenancy, protected area — owner asked):** until now only an
account an administrator had set up could create a group. Now anyone signed in
can start one, up to three each (`MAX_SELF_STARTED`); the person becomes its
chairperson. Subscription rules are unchanged.

## The welcome ("An open door")
Three notes on the home page and the start page, a fourth only where savings and
credit is on. Each is true of the product and carries no pressure:
- Only want well-run meetings? Use them on their own.
- Happy with your bank or SACCO? Stay there; you do not have to move your money.
- Run a shop, a butchery, a hotel or a pub? Open the books with no group.
- (Savings and credit on) Thinking of bringing your savings here? The records
  you already keep count from the first day.

A test (`packages/core/test/modules.test.ts`) refuses pressure words and keeps
borrowing words out while savings and credit is off.

## Where the switches are applied
Group page tabs and minutes form, the "Needs attention" watches, the member
list sent to ordinary members, the home screen, the main tabs, the books page.

## Not yet
- Hiding the officials' posts on already-posted minutes (a posted record is not rewritten).
- The mobile app and `/api/mobile/*` do not read the switches yet (standing rule 2: fix everywhere) — next PR.
- A switch for messaging, when messaging is built.
