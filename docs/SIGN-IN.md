# Signing in to Stawi — phone + PIN, no SMS (owner 20/11/26)

Replaces the SMS-code sign-in (Africa's Talking via the Supabase Send-SMS hook).
SMS cost money on every new device, forgotten PIN and lockout, and Africa's
Talking reaches only some African countries. Google Play does not require
two-step sign-in for an app's users; it requires reviewer credentials that work
without a one-time code (Play Console → App access).

## The two steps
1. **Phone number** — the one on the group's member list (also the M-Pesa number).
2. **The person's own 4-digit PIN** — on any phone or browser. Easy PINs (1234,
   0000) are refused; 5 wrong PINs lock it.

## First time, forgotten or locked PIN: a joining code
- A group official (chairperson, secretary or treasurer — checked on the server)
  opens the group → Charter → Members & officials → **Joining codes** → *Give a
  joining code* beside the member. They hand it over face to face or with *Send
  on WhatsApp* / *Copy message*.
- The member opens *Sign in → First time, or forgot your PIN?*, enters their
  phone and the 6-digit code, then chooses a PIN.
- A code is tied to that group and that phone, works once, expires after 48
  hours and is burned after 5 wrong tries. Only a keyed hash
  (`AUTH_DEVICE_SECRET`) is stored (`JoinCode` table). A new code voids the old one.
- Redeeming a code **proves** the phone: the account then reaches every group
  whose member list carries that number.

## Starting a group or books
*Sign up* (or *Open an account*): phone + new PIN. Refused if the number already
has an account, or if any group has already added it (then a joining code is
needed). The phone stays **unproven** (`app_metadata.phone_proved = false`): the
person reaches the groups and books they create, never another group's list by
phone. Accounts from before 20/11/26 (verified by SMS) count as proven.

## Google Play reviewer
`PLAY_REVIEW_PHONE` + `PLAY_REVIEW_PIN` (Fly secrets) sign in on the normal phone
+ PIN screen. Paste both into Play Console → App access (`docs/PLAY-LISTING.md`).

## Where it lives
- Rules (pure, tested): `packages/core/src/join-code.ts`, `pin-policy.ts`,
  `review-access.ts`; guard test `packages/core/test/no-sms.test.ts`.
- Server: `apps/web/app/api/auth/pin/sign-in`, `auth/join`, `auth/start`,
  `api/groups/[id]/join-code`; helpers in `apps/web/lib/pin.ts`, `lib/auth.ts`
  (`getUserPhone` = proven phone only; `getLoginPhone` for M-Pesa prompts).
- Screens: `apps/web/components/phone-auth.tsx`, `app/groups/[id]/JoiningCodes.tsx`,
  mobile `apps/mobile/screens/SupabasePhoneLogin.tsx`.

## Messages instead of SMS
Daily alerts about stalled duties are posted in the group's own Messages
("Ask the officials" thread of the person concerned, sender "Stawi"). Payment
receipts show in the app; M-Pesa sends the payer its own confirmation SMS.
