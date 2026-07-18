import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * GET/POST /api/cron — scheduled maintenance, called daily by a scheduler
 * (DigitalOcean App Platform job, GitHub Actions cron, or cron-job.org).
 * Guarded by CRON_SECRET (Authorization: Bearer <secret> or ?key=).
 *
 * Jobs:
 *  1. interest  — month-end SACCO+ deposit-interest accrual (idempotent,
 *     first call of each calendar month wins; 10% p.a. from @stawi/core).
 *  2. dunning   — subscriptions past currentPeriodEnd flip ACTIVE → PAST_DUE.
 *  3. (reconciliation roll-ups are computed on read in @stawi/core
 *     accounting — nothing to materialize until reports move off-line.)
 */
async function run(req: Request) {
  const url = new URL(req.url);
  const provided =
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? url.searchParams.get('key') ?? '';
  const secret = process.env.CRON_SECRET;
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: true, skipped: 'no database configured' });
  }

  const { prisma, accrueMonthlyInterest } = await import('@stawi/db');
  const out: Record<string, unknown> = {};

  // 1) Month-end interest accrual (safe to call daily — idempotent per month).
  const now = new Date();
  const lastDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
  if (now.getUTCDate() === lastDay || url.searchParams.get('force') === 'interest') {
    out.interest = await accrueMonthlyInterest(prisma);
  } else {
    out.interest = 'not month-end';
  }

  // 2) Subscription dunning.
  const dunned = await prisma.subscription.updateMany({
    where: { status: 'ACTIVE', currentPeriodEnd: { lt: now } },
    data: { status: 'PAST_DUE' },
  });
  out.dunning = { pastDue: dunned.count };

  return NextResponse.json({ ok: true, ranAt: now.toISOString(), ...out });
}

export async function GET(req: Request) { return run(req); }
export async function POST(req: Request) { return run(req); }
