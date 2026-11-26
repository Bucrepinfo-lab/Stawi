import { NextResponse } from 'next/server';
import { pushReady, vapidPublicKey } from '@/lib/push';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The public half of the alert key (safe to share). `ready: false` hides the "Turn on alerts" button. */
export async function GET() {
  const ready = pushReady();
  return NextResponse.json({ ready, publicKey: ready ? vapidPublicKey() : null });
}
