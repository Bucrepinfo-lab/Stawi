import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { dbEnabled } from '@/lib/data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Save (POST) or forget (DELETE) this phone's alert subscription for the
 * signed-in person (owner 26/11/26). An endpoint belongs to one person: saving
 * it again under another login moves it, so a shared phone alerts whoever
 * signed in last.
 */
function valid(body: unknown): body is { endpoint: string; keys: { p256dh: string; auth: string } } {
  const b = body as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null;
  return !!b && typeof b.endpoint === 'string' && /^https:\/\//.test(b.endpoint) && b.endpoint.length < 1000
    && typeof b.keys?.p256dh === 'string' && b.keys.p256dh.length < 200
    && typeof b.keys?.auth === 'string' && b.keys.auth.length < 100;
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ ok: false, error: 'Please sign in.' }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!valid(body)) return NextResponse.json({ ok: false, error: 'Bad subscription.' }, { status: 400 });
  if (!dbEnabled()) return NextResponse.json({ ok: true, saved: false });
  const { prisma } = await import('@stawi/db');
  const ua = (req.headers.get('user-agent') ?? '').slice(0, 200) || null;
  await prisma.pushSubscription.upsert({
    where: { endpoint: body.endpoint },
    create: { userId, endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth, userAgent: ua },
    update: { userId, p256dh: body.keys.p256dh, auth: body.keys.auth, userAgent: ua, lastUsedAt: new Date() },
  });
  return NextResponse.json({ ok: true, saved: true });
}

export async function DELETE(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { endpoint?: unknown } | null;
  if (!dbEnabled() || typeof body?.endpoint !== 'string') return NextResponse.json({ ok: true });
  const { prisma } = await import('@stawi/db');
  await prisma.pushSubscription.deleteMany({ where: { endpoint: body.endpoint, userId } });
  return NextResponse.json({ ok: true });
}
