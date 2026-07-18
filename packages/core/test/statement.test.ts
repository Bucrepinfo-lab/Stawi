import { describe, it, expect } from 'vitest';
import { emptyMeeting, addAgenda, type Meeting } from '../src/minutes';
import { reconcileMonth } from '../src/statement';

const roster = [
  { memberId: 'a', name: 'Amina Wanjiru' },
  { memberId: 'b', name: 'Grace Otieno' },
  { memberId: 'c', name: 'Faith Njeri' },
];
const charter = { name: 'Umoja Women Group', motto: 'Together we rise', members: [
  { id: 'a', fullName: 'Amina Wanjiru' }, { id: 'b', fullName: 'Grace Otieno' }, { id: 'c', fullName: 'Faith Njeri' },
] } as any;

function mk(date: string, no: number, opening: number, contribs: [string, string, number][], present: string[]): Meeting {
  const m = emptyMeeting('umoja', no, roster);
  m.date = date; m.venue = 'At Zawadi Hotel'; m.startTime = '4:00 PM'; m.endTime = '6:00 PM'; m.adjournmentTime = '6:00 PM';
  m.chairpersonName = 'Amina Wanjiru'; m.secretaryName = 'Faith Njeri';
  m.attendance = m.attendance.map((a) => ({ ...a, status: present.includes(a.memberId) ? 'present' : 'absent' }));
  m.tableBanking.openingBalanceCents = opening;
  m.tableBanking.contributions = contribs.map(([memberId, name, amountCents]) => ({ memberId, name, amountCents }));
  return m;
}

describe('reconcileMonth — month-end statement', () => {
  const w1 = mk('2026-06-05', 10, 0, [['a', 'Amina', 50000], ['b', 'Grace', 50000], ['c', 'Faith', 50000]], ['a', 'b', 'c']);
  w1.agendas = addAgenda(w1.agendas, { title: 'Chairs', resolution: 'buy 20 chairs' });
  const w2 = mk('2026-06-12', 11, 150000, [['a', 'Amina', 50000], ['b', 'Grace', 50000]], ['a', 'b']);
  const w3 = mk('2026-06-19', 12, 250000, [['a', 'Amina', 50000], ['b', 'Grace', 50000], ['c', 'Faith', 50000]], ['a', 'b', 'c']);
  const july = mk('2026-07-03', 13, 0, [['a', 'Amina', 99999]], ['a']);
  const st = reconcileMonth([w1, w2, w3, july], charter);

  it('scopes to the month and excludes others', () => {
    expect(st.period.label).toBe('June 2026');
    expect(st.meetingsHeld).toBe(3);
  });
  it('rolls up finance opening→closing', () => {
    expect(st.finance.contributionsCents).toBe(400000);
    expect(st.finance.openingCents).toBe(0);
    expect(st.finance.closingCents).toBe(400000);
  });
  it('computes per-member attendance and contribution', () => {
    expect(st.members.find((m) => m.memberId === 'c')!.attendancePct).toBe(67);
    expect(st.members.find((m) => m.memberId === 'a')!.contributedCents).toBe(150000);
    expect(st.avgAttendancePct).toBe(89);
  });
  it('collects resolutions and a narrative', () => {
    expect(st.resolutions).toHaveLength(1);
    expect(st.narrative.join(' ')).toContain('convened 3 meetings');
    expect(st.topContributor?.name).toBe('Amina Wanjiru');
  });
});
