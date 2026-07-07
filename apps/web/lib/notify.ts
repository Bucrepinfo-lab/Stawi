/**
 * Server-side notification delivery — SMS via Africa's Talking.
 *
 * Safe no-op when AT credentials are absent, so the app runs without them.
 * In-app notification *models* come from @stawi/core; this is the outbound SMS.
 */

const smsEnabled = () => !!(process.env.AT_USERNAME && process.env.AT_API_KEY);

/** Send an SMS to one or more Kenyan numbers (254...). Best-effort. */
export async function sendSms(to: string | string[], message: string): Promise<{ sent: boolean }> {
  if (!smsEnabled()) return { sent: false };
  const recipients = Array.isArray(to) ? to.join(',') : to;
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
