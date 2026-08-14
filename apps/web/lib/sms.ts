/**
 * Africa's Talking SMS — delivers the phone-login OTP (Supabase Send-SMS hook).
 * Sandbox endpoint when AT_USERNAME === 'sandbox'. Env: AT_USERNAME, AT_API_KEY, AT_SENDER_ID.
 */
export async function sendSms(to: string, message: string): Promise<{ ok: boolean; raw: unknown }> {
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
