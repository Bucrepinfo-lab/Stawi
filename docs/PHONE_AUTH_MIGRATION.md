# Stawi — Phone-OTP Login (Clerk → Supabase)

Web auth moved from Clerk to **Supabase phone-OTP**, with **Africa's Talking**
delivering the OTP SMS. M-Pesa was already built (Daraja STK at `/api/mpesa/stk` +
callback), so this migration is auth-only. The phone you sign in with is the same
number your group's roster is keyed by — so your groups surface automatically.

## What changed (apps/web)

- **Identity source swap, not a schema change.** Clerk's `userId` was used as an
  opaque string identity throughout (`getTenantContext(prisma, userId)`, stored in
  `clerkUserId` / `ownerClerkId` columns). A new `lib/auth.ts#getUserId()` now
  returns the **Supabase user id**; every `auth()` call-site (`app/actions.ts`,
  `lib/data.ts`, `api/mpesa/stk`, `api/billing/checkout`) uses it. The DB columns
  keep their names (they now hold Supabase ids) — no Prisma migration required.
- `lib/supabase/{server,client,middleware}.ts` — SSR clients (Next 15 async cookies).
- `middleware.ts` — Supabase session guard, **preserving** the tenant-slug
  resolution (`x-stawi-tenant-slug`).
- `app/sign-in` + `app/sign-up` — phone → SMS OTP (`components/phone-auth.tsx`);
  `ClerkProvider` removed from the root layout.
- `app/api/auth/send-sms` — Supabase Send-SMS hook → Africa's Talking (HMAC-verified).
- Phone-first group linking already existed (`getGroupsByPhone`); `lib/data.ts` now
  reads the phone from the Supabase user (`getUserPhone`).
- `@clerk/nextjs` dropped for `@supabase/ssr` + `@supabase/supabase-js`.
- Shared `toE164` added to `@stawi/core`.

## Mobile (apps/mobile) — follow-up

The Expo app still uses `@clerk/clerk-expo`, and the web's mobile bridge
(`lib/mobileApi.ts`) still verifies Clerk bearer tokens via `@clerk/backend`
(kept for that reason). **Migrate the mobile app to Supabase phone-OTP next** so
both clients share one identity namespace — until then, a person signing in on web
(Supabase id) vs mobile (Clerk id) is treated as two users.

## Env

```
NEXT_PUBLIC_SUPABASE_URL=...          # blank keeps you in the prior behaviour
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SEND_SMS_HOOK_SECRET=v1,whsec_...
AT_USERNAME=... AT_API_KEY=... AT_SENDER_ID=...
CLERK_SECRET_KEY=...                  # mobile bridge only, until mobile migrates
SUPER_ADMIN_CLERK_IDS=...             # now Supabase user ids (var name unchanged)
```

## Validate

```
npm install
npm run -w @stawi/db build   # prisma generate (needs network for the engine)
npm run -w @stawi/web typecheck && npm run -w @stawi/web build
```

Verified in review: `@stawi/core` typechecks (incl. the new phone util) and every
new/edited web file is type-clean; the remaining errors are only `@stawi/db`
awaiting `prisma generate`. The OTP SMS + M-Pesa STK ring real phones once the
Africa's Talking account is live.
