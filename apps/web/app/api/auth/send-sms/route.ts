import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { sendSms } from '@/lib/sms';

/** Supabase Send-SMS hook → Africa's Talking (Standard-Webhooks HMAC verified). */
export const runtime = 'nodejs';

function verify(rawBody: string, headers: Headers, secret: string): boolean {
  const id = headers.get('webhook-id') ?? '';
  const timestamp = headers.get('webhook-timestamp') ?? '';
  const sigHeader = headers.get('webhook-signature') ?? '';
  if (!id || !timestamp || !sigHeader) return false;
  const b64 = secret.replace(/^v1,/, '').replace(/^whsec_/, '');
  const key = Buffer.from(b64, 'base64');
  const expected = crypto.createHmac('sha256', key).update(`${id}.${timestamp}.${rawBody}`).digest('base64');
  return sigHeader.split(' ').some((part) => {
    const sig = part.split(',')[1] ?? part;
    try {
      return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    } catch {
      return false;
    }
  });
}

export async function POST(req: Request) {
  const secret = process.env.SUPABASE_SEND_SMS_HOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'hook not configured' }, { status: 500 });
  const rawBody = await req.text();
  if (!verify(rawBody, req.headers, secret)) return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  let payload: { user?: { phone?: string }; sms?: { otp?: string } };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'bad payload' }, { status: 400 });
  }
  const phone = payload.user?.phone;
  const otp = payload.sms?.otp;
  if (!phone || !otp) return NextResponse.json({ error: 'missing phone or otp' }, { status: 400 });
  const result = await sendSms(phone, `${otp} is your Stawi verification code. It expires in 10 minutes. Do not share it.`);
  if (!result.ok) return NextResponse.json({ error: 'sms_send_failed', detail: result.raw }, { status: 502 });
  return NextResponse.json({});
}
