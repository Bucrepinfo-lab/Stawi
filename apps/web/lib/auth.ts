import { perRequest } from './request-cache';
import { phoneIsProven, toE164 } from '@stawi/core';
import { createSupabaseServerClient } from './supabase/server';

/**
 * The Supabase-authenticated user for this request, or null.
 * `getUser()` is a network round trip to Supabase Auth; a page used to make it
 * up to five times (user id, phone, groups, modules, messages). Cached per
 * request (owner 27/11/26: taps had become slow), so it runs once per request.
 * Still verified with Supabase every request — never trusted from the cookie.
 */
export const getSupabaseUser = perRequest(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * The app's user identity (Supabase UUID). Stored in the `*clerkUserId` columns —
 * kept under that name to avoid a schema churn; it now holds a Supabase id. Null
 * when signed out.
 */
export async function getUserId(): Promise<string | null> {
  const user = await getSupabaseUser();
  return user?.id ?? null;
}

/**
 * The signed-in user's PROVEN E.164 phone, or null. This is what matches a
 * person to a group's roster by phone, so it is returned only when the phone
 * was proven by a joining code (or an older SMS code). A founder who opened
 * their own account with a PIN reaches their groups by account instead.
 */
export async function getUserPhone(): Promise<string | null> {
  const user = await getSupabaseUser();
  if (!user?.phone || !phoneIsProven(user.app_metadata, user.phone_confirmed_at)) return null;
  return toE164(user.phone);
}

/** The phone the user signs in with, proven or not: for the M-Pesa prompt and the PIN screen. */
export async function getLoginPhone(): Promise<string | null> {
  const user = await getSupabaseUser();
  return user?.phone ? toE164(user.phone) : null;
}
