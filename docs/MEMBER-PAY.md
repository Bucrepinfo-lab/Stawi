# Member pays their own contribution (20/11/26)

Owner order, 20/11/26: a member opens Stawi, finds "Pay my contribution", taps
Pay, and the M-Pesa request arrives on their phone. The way most people in the
country pay leads; the card is second.

## What is built
- `packages/core/src/contribution-pay.ts` — which way a country pays, the
  smallest and largest amount (KES 10 to KES 250,000), the quick amounts
  (KES 20, 50, 100, 200, 500, 1,000), the double-tap guard (90 seconds), the
  owner's switch.
- `GET/POST /api/contributions/pay` — the caller must be a member of the group
  and pays only for their own membership. The request goes to their sign-in
  phone, or another line they type. A PENDING contribution is stored; the
  existing M-Pesa callback confirms it and sends the receipt SMS.
- `PayContribution` card on the dashboard, English and Kiswahili. It draws
  nothing where paying is not switched on.

## Switched off until the owner decides — `MEMBER_PAY_ENABLED`
The request is sent to the one M-Pesa number in `MPESA_SHORTCODE`. Today that is
planned to be Telpen Systems' own Paybill, which is right for subscriptions but
would mean **Telpen holds a group's savings**. Holding other people's money is
regulated in Kenya (Central Bank of Kenya, National Payment System Act). This is
information, not legal advice: confirm with a lawyer before switching on.

Three ways to settle a group's money, for the owner to choose:

| Way | What it means | Trade-off |
|---|---|---|
| A. Each group's own Till or Paybill | Money lands in the group's own M-Pesa or bank account; Stawi only sends the request and records it | Cleanest. Each group must have a Till (free to open) and be linked once. Needs a per-group number in the database. |
| B. A licensed payment partner with a wallet per group | The partner holds the money under its licence and pays out to the group | Fast to roll out in many countries; the partner charges a fee per payment. |
| C. Telpen's Paybill, paid out to groups | One number for all | Telpen would hold members' money: needs a licence or a bank trust arrangement. Not recommended. |

Recommended: **A** for Kenya (Buy Goods is free for the payer, and since
07/08/26 free for the Till on payments up to KES 500), **B** through pawaPay for
the mobile money countries once the live account opens.

## Card
Not offered for contributions. Card payments go through Paddle, which sells
Stawi's subscription as merchant of record and may not collect a group's
savings. The card stays the second way to pay for the **subscription**.

## Other countries
`contributionPayOptions` already answers per country. Mobile money through
pawaPay needs its deposit call wired for contributions — next PR after the live
account opens.

## Owner decision 20/11/26 — a group's own Till; by hand meanwhile
The owner chose **each group's own Till** as the way contributions settle, and
asked that groups not ready for one keep working:

- **By hand, role-assigned:** only the group's Treasurer writes a payment in
  (server-checked, unchanged). The Treasurer now says how it came — cash, M-Pesa
  to the group's Till or Pochi, M-Pesa to an official's phone, or bank — and adds
  the M-Pesa code or bank reference when there is one. The same M-Pesa code
  cannot be written twice. The record keeps who wrote each entry.
- **Encouragement** ("A safer way to receive contributions", folded, under the
  Treasurer's form): Pochi la Biashara first (works on the line they already
  have, dial *334#), a Till when ready (Safaricom asks an individual for the
  form, a national ID and one week of daily receipts), and a plain word that
  writing payments in by hand is fine meanwhile. Facts from Safaricom's own
  pages, read 20/11/26, linked on screen.
- **Not claimed:** Safaricom's Pochi page does not say whether documents are
  needed, so the screen does not say "no documents". Safaricom's list has no
  category for chamas or self-help groups, so the screen does not promise a
  Till in the group's name.
- **Still to build:** a place for the group's own Till or Pochi number, so the
  "Pay my contribution" request can go there (needs a field on the group — a
  small additive database change), then switching member pay on.
