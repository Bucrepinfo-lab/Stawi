/**
 * Africa's Talking SMS — delivers the phone-login OTP (Supabase Send-SMS hook).
 * Sandbox endpoint when AT_USERNAME === 'sandbox'. Env: AT_USERNAME, AT_API_KEY, AT_SENDER_ID.
 */

/**
 * TRANSACTIONAL ONLY (owner 14/11/26): the "TELPEN" sender ID is approved for
 * transactional SMS only — sign-in codes and alerts about the person's own
 * account or payment. Newsletters, offers and other promotion go to members
 * through the app's own messaging, never by SMS. Every call names its purpose.
 */
export type SmsPurpose = 'otp' | 'transactional';
export const SMS_PURPOSES: readonly SmsPurpose[] = ['otp', 'transactional'];

export async function sendSms(to: string, message: string, purpose: SmsPurpose): Promise<{ ok: boolean; raw: unknown }> {
  if (!SMS_PURPOSES.includes(purpose)) return { ok: false, raw: { error: 'sms_transactional_only' } };
  const username = process.env.AT_USERNAME;
  const apiKey = process.env.AT_API_KEY;
  if (!username || !apiKey) return { ok: false, raw: { error: 'africastalking_not_configured' } };
  const base = username === 'sandbox' ? 'https://api.sandbox.africastalking.com' : 'https://api.africastalking.com';
  const body = new URLSearchParams({ username, to, message });
  const from = process.env.AT_SENDER_ID;
  if (from) body.set('from', from);
  const res = await fetch(`${base}/version1/messaging`, {
    method: 'POST',
    headers: { apiKey, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
  });
  const raw: unknown = await res.json().catch(() => ({}));
  const recipients = (raw as { SMSMessageData?: { Recipients?: { statusCode?: number; status?: string }[] } })?.SMSMessageData?.Recipients ?? [];
  const ok = res.ok && recipients.some((r) => r.statusCode === 101 || /success/i.test(r.status ?? ''));
  return { ok, raw };
}
