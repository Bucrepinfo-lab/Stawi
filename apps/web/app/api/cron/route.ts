import { NextResponse } from 'next/server';
import { saccoPlusEnabled } from '@/lib/features';

export const runtime = 'nodejs';

/**
 * GET/POST /api/cron — scheduled maintenance, called daily by a scheduler
 * (GitHub Actions cron — .github/workflows/cron.yml — or cron-job.org).
 * Guarded by CRON_SECRET (Authorization: Bearer <secret> or ?key=).
 *
 * Jobs:
 *  1. interest  — month-end SACCO+ deposit-interest accrual, ONLY when
 *     SACCO_PLUS_ENABLED=true (idempotent, first call of each month wins).
 *     Reports 'disabled' otherwise.
 *  2. dunning   — subscriptions past currentPeriodEnd flip ACTIVE → PAST_DUE.
 *  3. (reconciliation roll-ups are computed on read in @stawi/core
 *     accounting — nothing to materialize until reports move off-line.)
 *  4. attention — stalled group work is told to the officials it concerns in
 *     the group's own Messages, once per matter, person and level (owner
 *     20/11/26: no SMS). Off with ATTENTION_SMS=off (name kept for old secrets).
 *  5. round     — table banking round: the day before money is due back, one
 *     reminder in the group's own Messages (the member's private thread with
 *     the officials). No SMS, no money moved. Off with ROUND_REMINDERS=off.
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

  // 1) Month-end interest accrual — SACCO+ only (SACCO_PLUS_ENABLED). Off by
  //    default: no interest is ever computed or posted by a v1 deployment.
  const now = new Date();
  const lastDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
  if (!saccoPlusEnabled()) {
    out.interest = 'disabled';
  } else if (now.getUTCDate() === lastDay || url.searchParams.get('force') === 'interest') {
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

  // 4) Daily alerts for stalled work. A failure here never fails the other jobs.
  try {
    const { runAttentionNotices } = await import('@/lib/attention-notices');
    out.attention = await runAttentionNotices(now);
  } catch (e) {
    console.error('[cron] attention failed', e instanceof Error ? e.message : e);
    out.attention = 'failed';
  }

  // 5) Table banking round: return reminders. A failure here never fails the other jobs.
  try {
    const { runRoundReminders } = await import('@/lib/round-reminders');
    out.round = await runRoundReminders(now);
  } catch (e) {
    console.error('[cron] round reminders failed', e instanceof Error ? e.message : e);
    out.round = 'failed';
  }

  return NextResponse.json({ ok: true, ranAt: now.toISOString(), ...out });
}

export async function GET(req: Request) { return run(req); }
export async function POST(req: Request) { return run(req); }
