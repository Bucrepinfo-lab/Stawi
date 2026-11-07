import { describe, it, expect } from 'vitest';
import {
  uniqueBy,
  mergeGroupsById,
  pickAllowedId,
  duplicateRosterPhones,
  meetingRefsOutsideRoster,
  allowedMeetingRefs,
  checkMeetingDates,
  statementMonths,
  checkStatementMonth,
  pickStatementMonth,
  parsePeriod,
  entriesInPeriod,
  canWriteBooks,
} from '../src/scope';
import { emptyMeeting } from '../src/minutes';
import { computePnL, reconcile, type LedgerEntry, type Period } from '../src/accounting';

const NOW = new Date('2026-11-07T09:00:00Z'); // 12:00 in Nairobi

describe('unique options', () => {
  it('uniqueBy keeps the first of each key and drops blanks', () => {
    const out = uniqueBy([{ k: 'a', n: 1 }, { k: 'b', n: 2 }, { k: 'a', n: 3 }, { k: '', n: 4 }], (x) => x.k);
    expect(out.map((x) => x.n)).toEqual([1, 2]);
  });

  it('mergeGroupsById lists a group once, with the most privileged role', () => {
    const merged = mergeGroupsById([
      { id: 'g1', myRole: 'Member', name: 'Umoja' },
      { id: 'g2', myRole: 'Member', name: 'Vijana' },
      { id: 'g1', myRole: 'Treasurer', name: 'Umoja' },
      { id: 'g1', myRole: 'Member', name: 'Umoja' },
    ]);
    expect(merged.map((g) => g.id)).toEqual(['g1', 'g2']);
    expect(merged[0]!.myRole).toBe('Treasurer');
  });

  it('pickAllowedId never selects an id outside the caller’s own list', () => {
    expect(pickAllowedId('g2', ['g1', 'g2'])).toBe('g2');
    expect(pickAllowedId('someone-elses-group', ['g1', 'g2'])).toBe('g1');
    expect(pickAllowedId(null, [])).toBe('');
  });

  it('flags roster phones entered twice, whatever the format', () => {
    expect(duplicateRosterPhones([{ phone: '0712345678' }, { phone: '+254712345678' }, { phone: '0722000111' }])).toEqual(['712345678']);
    expect(duplicateRosterPhones([{ phone: '' }, { phone: '' }])).toEqual([]);
  });
});

describe('meeting references — the server rejects members outside the group', () => {
  const roster = [{ id: 'a', fullName: 'Amina Wanjiru' }, { id: 'b', fullName: 'Grace Otieno' }];
  const base = () => {
    const m = emptyMeeting('umoja', 3, roster.map((r) => ({ memberId: r.id, name: r.fullName })));
    m.tableBanking.contributions = [{ memberId: 'a', name: 'Amina Wanjiru', amountCents: 50000 }];
    m.tableBanking.payoutRecipient = 'Grace Otieno';
    return m;
  };

  it('accepts a meeting that only references roster members', () => {
    expect(meetingRefsOutsideRoster(base(), allowedMeetingRefs(roster))).toEqual([]);
  });

  it('rejects a contribution, fine, attendance mark or payout for someone not on the roster', () => {
    const m = base();
    m.tableBanking.contributions.push({ memberId: 'outsider', name: 'Not a member', amountCents: 999 });
    m.tableBanking.fines = [{ memberId: 'x2', name: 'Other group', reason: 'late', amountCents: 100 }];
    m.attendance.push({ memberId: 'x3', name: 'Stranger', status: 'present' });
    m.tableBanking.payoutRecipient = 'Someone Else';
    expect(meetingRefsOutsideRoster(m, allowedMeetingRefs(roster))).toEqual([
      'attendance:x3',
      'contribution:outsider',
      'fine:x2',
      'payout:Someone Else',
    ]);
  });

  it('rejects everything when the group has no saved roster', () => {
    expect(meetingRefsOutsideRoster(base(), allowedMeetingRefs([])).length).toBeGreaterThan(0);
  });

  it('still lets old minutes be re-saved after a member leaves the roster', () => {
    const stored = base();
    stored.attendance.push({ memberId: 'left', name: 'Former Member', status: 'present' });
    const resave = { ...stored };
    expect(meetingRefsOutsideRoster(resave, allowedMeetingRefs(roster, stored))).toEqual([]);
  });

  it('matches the payout recipient by name, ignoring case and spaces', () => {
    const m = base();
    m.tableBanking.payoutRecipient = '  grace otieno ';
    expect(meetingRefsOutsideRoster(m, allowedMeetingRefs(roster))).toEqual([]);
  });
});

describe('checkMeetingDates — minutes are for meetings already held', () => {
  it('accepts today and past dates', () => {
    expect(checkMeetingDates({ date: '2026-11-07' }, NOW)).toBeNull();
    expect(checkMeetingDates({ date: '2026-06-12', nextMeetingDate: '2026-06-19' }, NOW)).toBeNull();
  });
  it('rejects a missing, invalid or future date', () => {
    expect(checkMeetingDates({ date: '' }, NOW)).toMatch(/date/);
    expect(checkMeetingDates({ date: '2026-02-30' }, NOW)).toMatch(/date/);
    expect(checkMeetingDates({ date: '2026-11-08' }, NOW)).toMatch(/already been held/);
  });
  it('uses the Nairobi clock: late on 06/11 UTC is already 07/11', () => {
    expect(checkMeetingDates({ date: '2026-11-07' }, new Date('2026-11-06T22:30:00Z'))).toBeNull();
  });
  it('rejects a next-meeting date before the meeting', () => {
    expect(checkMeetingDates({ date: '2026-06-12', nextMeetingDate: '2026-06-05' }, NOW)).toMatch(/before/);
  });
});

describe('statement months — only months with posted meetings, never the future', () => {
  const P = 'POSTED' as const;
  const meetings = [
    { date: '2026-06-05', status: P }, { date: '2026-06-12', status: P }, { date: '2026-10-30', status: P },
    { date: '2026-12-04', status: P }, // scheduled ahead — not statement-able yet
    { date: '', status: P }, { date: 'bad', status: P },
    { date: '2026-09-11', status: 'DRAFT' as const }, // draft only — September is not offered
  ];

  it('drafts never make a month eligible (owner, 07/11/26)', () => {
    expect(statementMonths(meetings, NOW)).not.toContain('2026-09');
    expect(checkStatementMonth(meetings, 2026, 9, NOW)).toMatch(/posted meetings/);
    expect(statementMonths([{ date: '2026-10-02', status: 'DRAFT' }], NOW)).toEqual([]);
  });

  it('offers each month once, newest first', () => {
    expect(statementMonths(meetings, NOW)).toEqual(['2026-10', '2026-06']);
  });

  it('server rejects a month with no meetings, a future month or junk', () => {
    expect(checkStatementMonth(meetings, 2026, 6, NOW)).toBeNull();
    expect(checkStatementMonth(meetings, 2026, 7, NOW)).toMatch(/posted meetings/);
    expect(checkStatementMonth(meetings, 2026, 12, NOW)).toMatch(/posted meetings/);
    expect(checkStatementMonth(meetings, 2026, 13, NOW)).toMatch(/Choose/);
  });

  it('a URL month outside the offered set falls back to the newest month', () => {
    const offered = statementMonths(meetings, NOW);
    expect(pickStatementMonth('2026-06', offered)).toBe('2026-06');
    expect(pickStatementMonth('2026-12', offered)).toBe('2026-10');
  });
});

describe('books period filter — totals and CSV describe the same entries', () => {
  const ref = new Date(2026, 10, 7, 12, 0); // Sat 07/11/26 local
  const at = (y: number, mo: number, d: number) => new Date(y, mo - 1, d, 10, 0);
  const entries: LedgerEntry[] = [
    { id: '1', type: 'SALE', description: 'today', amountCents: 1000, occurredAt: at(2026, 11, 7) },
    { id: '2', type: 'EXPENSE', description: 'this week', amountCents: 300, occurredAt: at(2026, 11, 3) },
    { id: '3', type: 'PURCHASE', description: 'this month', amountCents: 200, occurredAt: at(2026, 11, 1) },
    { id: '4', type: 'SALE', description: 'this year', amountCents: 5000, occurredAt: at(2026, 2, 1) },
    { id: '5', type: 'SALE', description: 'last year', amountCents: 7000, occurredAt: at(2025, 12, 31) },
  ];

  it('parsePeriod accepts only known periods', () => {
    expect(parsePeriod('month')).toBe('month');
    expect(parsePeriod('decade')).toBe('day');
    expect(parsePeriod(null)).toBe('day');
  });

  it.each(['day', 'week', 'month', 'year'] as Period[])('%s: the P&L of the filtered entries equals reconcile()', (p) => {
    expect(computePnL(entriesInPeriod(entries, p, ref))).toEqual(reconcile(entries, p, ref));
  });

  it('selects the expected entries per period', () => {
    expect(entriesInPeriod(entries, 'day', ref).map((e) => e.id)).toEqual(['1']);
    expect(entriesInPeriod(entries, 'week', ref).map((e) => e.id)).toEqual(['1', '2']);
    expect(entriesInPeriod(entries, 'month', ref).map((e) => e.id)).toEqual(['1', '2', '3']);
    expect(entriesInPeriod(entries, 'year', ref).map((e) => e.id)).toEqual(['1', '2', '3', '4']);
  });
});

describe('books write access — officials only (owner, 07/11/26)', () => {
  it('chair, secretary and treasurer may add entries, in either spelling', () => {
    for (const r of ['CHAIRMAN', 'SECRETARY', 'TREASURER', 'Chairman', 'Secretary', 'Treasurer']) expect(canWriteBooks(r)).toBe(true);
  });
  it('members, signatories and strangers are read-only', () => {
    for (const r of ['MEMBER', 'Member', 'SIGNATORY', 'Signatory', '', null, undefined, 'ADMIN']) expect(canWriteBooks(r)).toBe(false);
  });
});
