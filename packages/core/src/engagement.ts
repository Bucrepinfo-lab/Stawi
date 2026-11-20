/**
 * Engagement — what people look at, open, tap and share (owner brief 20/11/26).
 *
 * Privacy by design: we count, we do not follow. An event is just a kind
 * ('view', 'open', …) and a short key ('p1-minutes', 'tab-books'). No user id,
 * phone, group, tenant or IP is ever part of it, and counts are stored per day.
 * Also here: share messages and countdown maths for the badges.
 * Pure: no I/O.
 */

export const ENGAGEMENT_EVENTS = ['view', 'open', 'cta', 'share', 'tab', 'sort', 'source'] as const;
export type EngagementEvent = (typeof ENGAGEMENT_EVENTS)[number];

/** Lowercase letters, digits, dot, dash, underscore; 1–48 chars; starts with a letter or digit. */
const KEY_RE = /^[a-z0-9][a-z0-9._-]{0,47}$/;

export interface EngagementHit {
  event: EngagementEvent;
  key: string;
}

/** Accept only a known event with a safe key; anything else is dropped (null). */
export function sanitizeEngagement(input: unknown): EngagementHit | null {
  if (!input || typeof input !== 'object') return null;
  const { event, key } = input as { event?: unknown; key?: unknown };
  if (typeof event !== 'string' || typeof key !== 'string') return null;
  if (!(ENGAGEMENT_EVENTS as readonly string[]).includes(event)) return null;
  if (!KEY_RE.test(key)) return null;
  return { event: event as EngagementEvent, key };
}

/** UTC day bucket, "2026-11-20". */
export function engagementDay(at: Date = new Date()): string {
  return at.toISOString().slice(0, 10);
}

export interface EngagementRow {
  day: string;
  event: string;
  key: string;
  count: number;
}

export interface EngagementSummaryLine {
  key: string;
  views: number;
  opens: number;
  taps: number;
  shares: number;
}

/** Roll daily rows up to one line per key, most viewed first. */
export function summariseEngagement(rows: EngagementRow[]): EngagementSummaryLine[] {
  const by = new Map<string, EngagementSummaryLine>();
  for (const r of rows) {
    const line = by.get(r.key) ?? { key: r.key, views: 0, opens: 0, taps: 0, shares: 0 };
    if (r.event === 'view') line.views += r.count;
    else if (r.event === 'open') line.opens += r.count;
    else if (r.event === 'share') line.shares += r.count;
    else line.taps += r.count; // cta, tab, sort, source
    by.set(r.key, line);
  }
  return [...by.values()].sort((a, b) => b.views - a.views || b.taps - a.taps || a.key.localeCompare(b.key));
}

// ── Sharing ───────────────────────────────────────────────────────────────

export type ShareChannel = 'whatsapp' | 'sms' | 'copy' | 'device';

/** Add where the visit came from (?via=whatsapp). Never a person's identity. */
export function shareLink(baseUrl: string, channel: ShareChannel): string {
  const clean = baseUrl.replace(/[?#].*$/, '').replace(/\/+$/, '');
  return `${clean}/?via=${channel}`;
}

const SHARE_TEXT = {
  en: 'Our group keeps its contributions, minutes and business records in Stawi, where every member can see them. First month free:',
  sw: 'Kikundi chetu huweka michango, kumbukumbu na rekodi za biashara ndani ya Stawi, ambapo kila mwanachama anaweza kuona. Mwezi wa kwanza ni bure:',
} as const;

export function shareMessage(lang: 'en' | 'sw', url: string): string {
  return `${SHARE_TEXT[lang]} ${url}`;
}

export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function smsShareUrl(text: string): string {
  return `sms:?&body=${encodeURIComponent(text)}`;
}

// ── Countdowns ────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;

/** Whole days left until `until` (0 on the day or after; null if no date). */
export function daysLeft(until: Date | null | undefined, now: Date = new Date()): number | null {
  if (!until) return null;
  const ms = until.getTime() - now.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / DAY_MS);
}

/** Days left of a free trial that started on `startedAt` and runs `trialDays`. */
export function trialDaysLeft(startedAt: Date | null | undefined, trialDays: number, now: Date = new Date()): number | null {
  if (!startedAt || !(trialDays > 0)) return null;
  return daysLeft(new Date(startedAt.getTime() + trialDays * DAY_MS), now);
}

export type CountdownTone = 'calm' | 'soon' | 'last' | 'ended';

/** How urgent a countdown should look. */
export function countdownTone(days: number | null): CountdownTone {
  if (days === null) return 'calm';
  if (days <= 0) return 'ended';
  if (days <= 3) return 'last';
  if (days <= 7) return 'soon';
  return 'calm';
}
