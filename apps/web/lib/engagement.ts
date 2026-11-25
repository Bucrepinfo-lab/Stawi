import { engagementDay, summariseEngagement, type EngagementHit, type EngagementRow, type EngagementSummaryLine } from '@stawi/core';

/**
 * Engagement counters (server-only). Counts only — no user, phone, group,
 * tenant or IP is stored (see packages/core/src/engagement.ts).
 *
 * With a database: one row per day + event + key, incremented in place.
 * Without one (seed mode): an in-memory tally for this server process.
 */

const g = globalThis as unknown as { __stawiEngagement?: Map<string, EngagementRow> };
const memory: Map<string, EngagementRow> = (g.__stawiEngagement ??= new Map());
const MEMORY_MAX_KEYS = 5_000;

const dbEnabled = () => !!process.env.DATABASE_URL;

export async function recordEngagement(hit: EngagementHit, at: Date = new Date()): Promise<void> {
  const day = engagementDay(at);
  if (dbEnabled()) {
    try {
      const { prisma } = await import('@stawi/db');
      await prisma.engagementCount.upsert({
        where: { day_event_key: { day, event: hit.event, key: hit.key } },
        create: { day, event: hit.event, key: hit.key, count: 1 },
        update: { count: { increment: 1 } },
      });
      return;
    } catch {
      // Counting must never break a page: fall through to memory.
    }
  }
  const id = `${day}|${hit.event}|${hit.key}`;
  const row = memory.get(id);
  if (row) row.count += 1;
  else if (memory.size < MEMORY_MAX_KEYS) memory.set(id, { day, event: hit.event, key: hit.key, count: 1 });
}

/** Totals per key for the last `days` days (today included), most viewed first. */
export async function engagementSummary(days = 7, now: Date = new Date()): Promise<EngagementSummaryLine[]> {
  const since = engagementDay(new Date(now.getTime() - (Math.max(1, days) - 1) * 86_400_000));
  let rows: EngagementRow[] = [];
  if (dbEnabled()) {
    try {
      const { prisma } = await import('@stawi/db');
      rows = await prisma.engagementCount.findMany({
        where: { day: { gte: since } },
        select: { day: true, event: true, key: true, count: true },
        take: 5_000,
      });
    } catch {
      rows = [];
    }
  }
  if (!rows.length) rows = [...memory.values()].filter((r) => r.day >= since);
  return summariseEngagement(rows);
}
