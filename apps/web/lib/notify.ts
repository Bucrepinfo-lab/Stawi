import { toSmsRecipient } from '@stawi/core';
import { SMS_PURPOSES, type SmsPurpose } from './sms';

/**
 * Server-side notification delivery — SMS via Africa's Talking.
 *
 * Safe no-op when AT credentials are absent, so the app runs without them.
 * In-app notification *models* come from @stawi/core; this is the outbound SMS.
 */

const smsEnabled = () => !!(process.env.AT_USERNAME && process.env.AT_API_KEY);

/** Send an SMS to one or more numbers (any of 254…, +254…, 07…). Best-effort. */
export async function sendSms(to: string | string[], message: string, purpose: SmsPurpose): Promise<{ sent: boolean }> {
  if (!smsEnabled() || !SMS_PURPOSES.includes(purpose)) return { sent: false };
  // Africa's Talking needs "+<country><number>"; stored numbers are often "2547…" or "07…".
  const recipients = (Array.isArray(to) ? to : [to])
    .map((n) => toSmsRecipient(n))
    .filter((n): n is string => n !== null)
    .join(',');
  if (!recipients) return { sent: false };
  try {
    const res = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        apiKey: process.env.AT_API_KEY as string,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        username: process.env.AT_USERNAME as string,
        to: recipients,
        message,
      }).toString(),
    });
    return { sent: res.ok };
  } catch {
    return { sent: false };
  }
}
