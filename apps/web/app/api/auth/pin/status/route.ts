import { NextResponse } from 'next/server';
import { maskPhone, pinLocked } from '@stawi/core';
import { currentDevice, pinFeatureEnabled } from '@/lib/pin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/auth/pin/status → may this browser sign in with a PIN? (no account data) */
export async function GET() {
  if (!pinFeatureEnabled()) return NextResponse.json({ enabled: false, device: null });
  const device = await currentDevice();
  if (!device) return NextResponse.json({ enabled: true, device: null });
  const { prisma, getAuthPin } = await import('@stawi/db');
  const pin = await getAuthPin(prisma, device.userId);
  if (!pin) return NextResponse.json({ enabled: true, device: null });
  return NextResponse.json({ enabled: true, device: { phoneHint: maskPhone(device.phone), locked: pinLocked(pin) } });
}
