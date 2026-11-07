/**
 * Option scoping — what a signed-in person may pick, and what the server
 * accepts back.
 *
 * Owner rule (02/11/26, least privilege) + Telpen Edu fix sweep (07/11/26):
 * every picker offers only the caller's own records that are valid right now,
 * offers each option once, and the server rejects anything outside that set
 * (hiding an option is never the only guard). Pure helpers, shared by the web
 * server actions, the mobile API and the UI so both sides use one rule.
 */

import type { Meeting } from './minutes';
import type { CharterMember } from './charter';
import { periodStart, type LedgerEntry, type Period } from './accounting';
import { phoneKey } from './identity';
import { dateParts, todayIso } from './dates';
import { postedMeetings } from './statement';

// ───────────────────────── Unique options ─────────────────────────

/** Keep the first item for each key (order preserved). Blank keys are dropped. */
export function uniqueBy<T>(items: readonly T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of items) {
    const k = key(it);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}

/** Most → least privileged per-group role, as shown in the UI (title case). */
export const GROUP_ROLE_RANK = ['Chairman', 'Treasurer', 'Secretary', 'Signatory', 'Member'] as const;

function roleRank(role: string): number {
  const i = GROUP_ROLE_RANK.findIndex((r) => r.toLowerCase() === (role ?? '').toLowerCase());
  return i === -1 ? GROUP_ROLE_RANK.length : i;
}

/**
 * One entry per group. A person can match a group twice (linked login row +
 * phone roster row); the switcher must list it once, with the most privileged
 * role — the same rule the server uses (`groupRoleFor`).
 */
export function mergeGroupsById<T extends { id: string; myRole: string }>(groups: readonly T[]): T[] {
  const byId = new Map<string, T>();
  for (const g of groups) {
    if (!g?.id) continue;
    const have = byId.get(g.id);
    if (!have || roleRank(g.myRole) < roleRank(have.myRole)) byId.set(g.id, have ? { ...have, myRole: g.myRole } : g);
  }
  return [...byId.values()];
}

/** The requested id when it is one of the caller's own, else the first allowed id. */
export function pickAllowedId(requested: string | null | undefined, allowedIds: readonly string[]): string {
  if (requested && allowedIds.includes(requested)) return requested;
  return allowedIds[0] ?? '';
}

// ───────────────────────── Charter roster ─────────────────────────

/** Phones that appear on more than one roster row (by the tolerant 9-digit key). */
export function duplicateRosterPhones(members: readonly Pick<CharterMember, 'phone'>[]): string[] {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const m of members) {
    const k = phoneKey(m?.phone ?? '');
    if (!k) continue;
    if (seen.has(k)) dup.add(k);
    seen.add(k);
  }
  return [...dup];
}

// ───────────────────────── Meetings ─────────────────────────

export interface RosterRef {
  id: string;
  fullName: string;
}

/**
 * Member references in a meeting that are not on the group's roster.
 * `allowedIds`/`allowedNames` = the saved charter roster, plus whatever the
 * stored copy of this same meeting already referenced (so a member removed
 * later does not block re-saving old minutes). Empty list = all good.
 */
export function meetingRefsOutsideRoster(
  meeting: Pick<Meeting, 'attendance' | 'tableBanking'>,
  allowed: { ids: Iterable<string>; names: Iterable<string> },
): string[] {
  const ids = new Set(allowed.ids);
  const names = new Set([...allowed.names].map((n) => n.trim().toLowerCase()).filter(Boolean));
  const bad: string[] = [];
  for (const a of meeting.attendance ?? []) if (!ids.has(a?.memberId)) bad.push(`attendance:${a?.memberId ?? '?'}`);
  for (const c of meeting.tableBanking?.contributions ?? []) if (!ids.has(c?.memberId)) bad.push(`contribution:${c?.memberId ?? '?'}`);
  for (const f of meeting.tableBanking?.fines ?? []) if (!ids.has(f?.memberId)) bad.push(`fine:${f?.memberId ?? '?'}`);
  const payee = meeting.tableBanking?.payoutRecipient?.trim().toLowerCase();
  if (payee && !names.has(payee)) bad.push(`payout:${meeting.tableBanking.payoutRecipient}`);
  return bad;
}

/** Ids and names a meeting may reference, from the roster plus a stored meeting. */
export function allowedMeetingRefs(
  roster: readonly RosterRef[],
  stored?: Pick<Meeting, 'attendance' | 'tableBanking'> | null,
): { ids: Set<string>; names: Set<string> } {
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const r of roster) {
    if (r?.id) ids.add(r.id);
    if (r?.fullName?.trim()) names.add(r.fullName.trim());
  }
  if (stored) {
    for (const a of stored.attendance ?? []) if (a?.memberId) ids.add(a.memberId);
    for (const c of stored.tableBanking?.contributions ?? []) if (c?.memberId) ids.add(c.memberId);
    for (const f of stored.tableBanking?.fines ?? []) if (f?.memberId) ids.add(f.memberId);
    if (stored.tableBanking?.payoutRecipient?.trim()) names.add(stored.tableBanking.payoutRecipient.trim());
  }
  return { ids, names };
}

/**
 * Minutes record a meeting that has happened: the date must be a real date not
 * after today (country clock), and the next-meeting date must not precede it.
 * Returns an error message, or null.
 */
export function checkMeetingDates(
  meeting: Pick<Meeting, 'date' | 'nextMeetingDate'>,
  now: Date = new Date(),
  timeZone?: string,
): string | null {
  if (!meeting.date || !/^\d{4}-\d{2}-\d{2}$/.test(meeting.date) || !dateParts(meeting.date)) return 'Enter the date the meeting was held.';
  if (meeting.date > todayIso(now, timeZone)) return 'Minutes can only be posted for a meeting that has already been held.';
  if (meeting.nextMeetingDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(meeting.nextMeetingDate) || !dateParts(meeting.nextMeetingDate)) return 'The next meeting date is not a valid date.';
    if (meeting.nextMeetingDate < meeting.date) return 'The next meeting cannot be before this meeting.';
  }
  return null;
}

// ───────────────────────── Month-end statement months ─────────────────────────

/**
 * Months a statement can be prepared for: months that have at least one dated
 * POSTED meeting (drafts never count — owner, 07/11/26), up to and including
 * the current month (country clock). Newest first, each once — "yyyy-mm".
 */
export function statementMonths(meetings: readonly Pick<Meeting, 'date' | 'status'>[], now: Date = new Date(), timeZone?: string): string[] {
  const current = todayIso(now, timeZone).slice(0, 7);
  const months = new Set<string>();
  for (const m of postedMeetings(meetings)) {
    if (!m?.date || !dateParts(m.date)) continue;
    const ym = m.date.slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(ym) && ym <= current) months.add(ym);
  }
  return [...months].sort().reverse();
}

/** Server check for a statement post: the month must be one `statementMonths` offers. */
export function checkStatementMonth(
  meetings: readonly Pick<Meeting, 'date' | 'status'>[],
  year: number,
  month: number,
  now: Date = new Date(),
  timeZone?: string,
): string | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return 'Choose a statement month.';
  const ym = `${year}-${String(month).padStart(2, '0')}`;
  if (!statementMonths(meetings, now, timeZone).includes(ym)) return 'A statement can only be posted for a past or current month that has posted meetings.';
  return null;
}

/** Parse a "yyyy-mm" URL value to the offered month, else the newest offered (or ''). */
export function pickStatementMonth(requested: string | null | undefined, offered: readonly string[]): string {
  return pickAllowedId(requested ?? null, offered);
}

// ───────────────────────── Books write access ─────────────────────────

/**
 * Who may add entries to a group business's books (owner, 07/11/26): the
 * group's officials — chair, secretary, treasurer. Ordinary members (and
 * signatories) read only. Accepts the DB enum (TREASURER) or the UI's title
 * case (Treasurer).
 */
export const BOOKS_WRITER_ROLES: readonly string[] = ['CHAIRMAN', 'SECRETARY', 'TREASURER'];

export function canWriteBooks(role: string | null | undefined): boolean {
  return !!role && BOOKS_WRITER_ROLES.includes(role.trim().toUpperCase());
}

// ───────────────────────── Books period filter ─────────────────────────

export const BOOK_PERIODS: readonly Period[] = ['day', 'week', 'month', 'year'];

/** URL value → a valid period (default 'day'). */
export function parsePeriod(raw: string | null | undefined): Period {
  return (BOOK_PERIODS as readonly string[]).includes(raw ?? '') ? (raw as Period) : 'day';
}

/**
 * The ledger entries inside the period containing `ref` — the same window the
 * P&L (`reconcile`) uses, so the on-screen totals, the tax lines and the CSV
 * export all describe the same entries.
 */
export function entriesInPeriod<T extends Pick<LedgerEntry, 'occurredAt'>>(entries: readonly T[], period: Period, ref: Date = new Date()): T[] {
  const start = periodStart(ref, period);
  const end = new Date(start);
  if (period === 'day') end.setDate(end.getDate() + 1);
  else if (period === 'week') end.setDate(end.getDate() + 7);
  else if (period === 'month') end.setMonth(end.getMonth() + 1);
  else end.setFullYear(end.getFullYear() + 1);
  return entries.filter((e) => e.occurredAt >= start && e.occurredAt < end);
}
