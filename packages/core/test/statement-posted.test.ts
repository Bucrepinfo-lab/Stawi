import { describe, it, expect } from 'vitest';
import { emptyMeeting, type Meeting } from '../src/minutes';
import { reconcileMonth, reconcilePostedMonth, postedMeetings } from '../src/statement';

const roster = [{ memberId: 'a', name: 'Amina Wanjiru' }, { memberId: 'b', name: 'Grace Otieno' }];
const charter = { name: 'Umoja', members: [{ id: 'a', fullName: 'Amina Wanjiru' }, { id: 'b', fullName: 'Grace Otieno' }] } as any;

function mk(date: string, no: number, cents: number, status: Meeting['status']): Meeting {
  const m = emptyMeeting('umoja', no, roster);
  m.date = date;
  m.status = status;
  m.attendance = m.attendance.map((x) => ({ ...x, status: 'present' }));
  m.tableBanking.contributions = [{ memberId: 'a', name: 'Amina Wanjiru', amountCents: cents }];
  return m;
}

describe('month-end statement counts posted meetings only (owner, 07/11/26)', () => {
  const posted1 = mk('2026-06-05', 1, 50000, 'POSTED');
  const posted2 = mk('2026-06-12', 2, 30000, 'POSTED');
  const draft = mk('2026-06-19', 3, 999900, 'DRAFT');
  const all = [posted1, posted2, draft];
  const june = { year: 2026, month: 6 };

  it('excludes the draft from meetings held and from every total', () => {
    const st = reconcilePostedMonth(all, charter, june);
    expect(st.meetingsHeld).toBe(2);
    expect(st.finance.contributionsCents).toBe(80000);
    expect(st.members.find((m) => m.memberId === 'a')!.contributedCents).toBe(80000);
    expect(Number.isInteger(st.finance.closingCents)).toBe(true);
  });

  it('equals reconcileMonth over the posted meetings, whatever drafts exist', () => {
    expect(reconcilePostedMonth(all, charter, june)).toEqual(reconcileMonth([posted1, posted2], charter, june));
    expect(reconcilePostedMonth([...all, mk('2026-06-26', 4, 1, 'DRAFT')], charter, june)).toEqual(reconcilePostedMonth(all, charter, june));
  });

  it('a month of drafts only shows no meetings and no money', () => {
    const st = reconcilePostedMonth([draft], charter, june);
    expect(st.meetingsHeld).toBe(0);
    expect(st.finance.contributionsCents).toBe(0);
  });

  it('postedMeetings keeps only POSTED', () => {
    expect(postedMeetings(all).map((m) => m.meetingNo)).toEqual([1, 2]);
  });
});
