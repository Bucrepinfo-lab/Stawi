import { describe, expect, it } from 'vitest';
import { addMember, emptyCharter, type GroupCharter } from '../src/charter';
import { emptyMeeting, type Meeting } from '../src/minutes';
import {
  ESCALATION_RULES, escalationLadder, escalationLevel, escalationToday, findEscalations,
  memberIdForPhone, summariseEscalations, visibleEscalations,
} from '../src/escalation';

function group(): GroupCharter {
  const c = emptyCharter('g1', 'Umoja', 'KE');
  c.constitution = 'Our rules.';
  let m = c.members;
  m = addMember(m, { fullName: 'Amina', designation: 'Chairperson', phone: '0712345678' });
  m = addMember(m, { fullName: 'Grace', designation: 'Treasurer', phone: '0722000111' });
  m = addMember(m, { fullName: 'Faith', designation: 'Secretary', phone: '0733222333' });
  m = addMember(m, { fullName: 'Joseph', designation: 'Signatory', phone: '0700111222' });
  m = addMember(m, { fullName: 'David', designation: 'Member', phone: '0701222333' });
  m = addMember(m, { fullName: 'Brian', designation: 'Member', phone: '0702333444' });
  c.members = m;
  return c;
}

function meeting(c: GroupCharter, no: number, date: string, over: Partial<Meeting> = {}): Meeting {
  const m = emptyMeeting('g1', no, c.members.map((x) => ({ memberId: x.id, name: x.fullName, designation: x.designation })));
  m.id = `m${no}`;
  m.date = date;
  m.status = 'POSTED';
  m.attendance = m.attendance.map((a) => ({ ...a, status: 'present' }));
  m.tableBanking.contributions = c.members.map((x) => ({ memberId: x.id, name: x.fullName, amountCents: 50_000 }));
  return { ...m, ...over };
}

const id = (c: GroupCharter, name: string) => c.members.find((m) => m.fullName === name)!.id;

describe('the ladder never lands on nobody', () => {
  it('puts the duty holder first and the Chairperson above', () => {
    const c = group();
    const l = escalationLadder(c.members, 'secretary');
    expect(l.responsible.map((m) => m.fullName)).toEqual(['Faith']);
    expect(l.level2.map((m) => m.fullName)).toEqual(['Amina']);
    expect(l.level3.map((m) => m.fullName).sort()).toEqual(['Amina', 'Faith', 'Grace', 'Joseph']);
  });

  it('falls through when a post is empty', () => {
    const c = group();
    c.members = c.members.filter((m) => m.designation !== 'Secretary');
    expect(escalationLadder(c.members, 'secretary').responsible.map((m) => m.fullName)).toEqual(['Amina']);
    c.members = c.members.filter((m) => m.designation === 'Member');
    expect(escalationLadder(c.members, 'treasurer').responsible).toEqual([]);
  });

  it('climbs with time and stops at the rule ceiling', () => {
    const r = ESCALATION_RULES.minutes_not_posted;
    expect([0, 6, 7, 14, 28, 400].map((d) => escalationLevel(r, d))).toEqual([1, 1, 2, 3, 4, 4]);
    expect(escalationLevel(ESCALATION_RULES.member_behind, 400)).toBe(3);
    expect(escalationLevel(ESCALATION_RULES.member_absent, 400)).toBe(3);
  });
});

describe('stalled work is found', () => {
  it('a healthy group has nothing to raise', () => {
    const c = group();
    c.schedule.frequency = 'Weekly';
    const meetings = [meeting(c, 1, '2026-11-06'), meeting(c, 2, '2026-11-13')];
    expect(findEscalations({ charter: c, meetings, today: '2026-11-18' })).toEqual([]);
  });

  it('a draft left unposted goes to the Secretary, then climbs', () => {
    const c = group();
    const meetings = [meeting(c, 1, '2026-11-01', { status: 'DRAFT' })];
    const early = findEscalations({ charter: c, meetings, today: '2026-11-03' });
    expect(early).toEqual([]);
    const l1 = findEscalations({ charter: c, meetings, today: '2026-11-06' });
    expect(l1.map((f) => [f.rule, f.level])).toEqual([['minutes_not_posted', 1]]);
    expect(l1[0]!.audienceIds).toEqual([id(c, 'Faith')]);
    const l2 = findEscalations({ charter: c, meetings, today: '2026-11-12' })[0]!;
    expect(l2.level).toBe(2);
    expect(l2.audienceIds.sort()).toEqual([id(c, 'Faith'), id(c, 'Amina')].sort());
    const l4 = findEscalations({ charter: c, meetings, today: '2026-12-10' })[0]!;
    expect(l4.level).toBe(4);
    expect(l4.everyone).toBe(true);
  });

  it('a missed meeting is noticed from the group rhythm', () => {
    const c = group();
    c.schedule.frequency = 'Weekly';
    const meetings = [meeting(c, 1, '2026-11-01')];
    expect(findEscalations({ charter: c, meetings, today: '2026-11-11' })).toEqual([]);
    const f = findEscalations({ charter: c, meetings, today: '2026-11-12' });
    expect(f.map((x) => x.rule)).toEqual(['meeting_overdue']);
    expect(f[0]!.detail.en).toContain('08/11/26');
  });

  it('attended meeting with no money written goes to the Treasurer', () => {
    const c = group();
    const m = meeting(c, 1, '2026-11-01');
    m.tableBanking.contributions = [];
    const f = findEscalations({ charter: c, meetings: [m], today: '2026-11-06' });
    expect(f.map((x) => [x.rule, x.duty])).toEqual([['contributions_not_recorded', 'treasurer']]);
    expect(f[0]!.audienceIds).toEqual([id(c, 'Grace')]);
  });

  it("a member's arrears and absences stay among the officials", () => {
    const c = group();
    const brian = id(c, 'Brian');
    const miss = (m: Meeting) => {
      m.tableBanking.contributions = m.tableBanking.contributions.filter((x) => x.memberId !== brian);
      m.attendance = m.attendance.map((a) => (a.memberId === brian ? { ...a, status: 'absent' } : a));
      return m;
    };
    const meetings = [1, 2, 3].map((n) => miss(meeting(c, n, `2026-10-0${n}`)));
    const f = findEscalations({ charter: c, meetings, today: '2027-06-01' }).filter((x) => x.key.endsWith(brian));
    expect(f.map((x) => x.rule).sort()).toEqual(['member_absent', 'member_behind']);
    for (const x of f) {
      expect(x.level).toBe(3);
      expect(x.everyone).toBe(false);
      expect(x.audienceIds).not.toContain(brian);
      expect(x.audienceIds).not.toContain(id(c, 'David'));
    }
  });

  it('set-up gaps go to the Chairperson', () => {
    const c = group();
    c.constitution = '';
    c.members = c.members.filter((m) => m.designation !== 'Treasurer');
    const f = findEscalations({ charter: c, meetings: [], today: '2026-11-20' });
    expect(f.map((x) => x.rule).sort()).toEqual(['officials_missing', 'rules_missing']);
    expect(f.every((x) => x.level === 1 && x.audienceIds.includes(id(c, 'Amina')))).toBe(true);
    expect(f.find((x) => x.rule === 'officials_missing')!.detail.en).toContain('Treasurer');
  });

  it('an empty new group raises nothing', () => {
    expect(findEscalations({ charter: emptyCharter('g2', 'New'), meetings: [], today: '2026-11-20' })).toEqual([]);
  });
});

describe('least privilege', () => {
  const c = group();
  c.schedule.frequency = ''; // no set rhythm: only the draft is watched here
  const meetings = [meeting(c, 1, '2026-11-01', { status: 'DRAFT' })];
  const l1 = findEscalations({ charter: c, meetings, today: '2026-11-06' });
  const l2 = findEscalations({ charter: c, meetings, today: '2026-11-12' });

  it('colleagues do not see each other’s lists', () => {
    expect(visibleEscalations(l1, { memberId: id(c, 'Faith') })).toHaveLength(1);
    expect(visibleEscalations(l1, { memberId: id(c, 'Grace') })).toEqual([]);
    expect(visibleEscalations(l1, { memberId: id(c, 'Amina') })).toEqual([]);
    expect(visibleEscalations(l1, { memberId: id(c, 'David') })).toEqual([]);
    expect(visibleEscalations(l1, {})).toEqual([]);
  });

  it('the senior sees it once it has climbed; support sees all', () => {
    expect(visibleEscalations(l2, { memberId: id(c, 'Amina') })).toHaveLength(1);
    expect(visibleEscalations(l2, { memberId: id(c, 'Grace') })).toEqual([]);
    expect(visibleEscalations(l1, { overseer: true })).toHaveLength(1);
  });

  it('matches a signed-in phone to the member list and counts', () => {
    expect(memberIdForPhone(c.members, '+254733222333')).toBe(id(c, 'Faith'));
    expect(memberIdForPhone(c.members, '0799')).toBeNull();
    expect(summariseEscalations(l1, id(c, 'Faith'))).toEqual({ total: 1, mine: 1, raised: 0, highest: 1 });
    expect(summariseEscalations(l2, id(c, 'Amina'))).toEqual({ total: 1, mine: 0, raised: 1, highest: 2 });
  });
});

describe('each country keeps its own clock', () => {
  it('uses the country time zone for today', () => {
    const lateUtc = new Date('2026-11-20T22:30:00Z');
    expect(escalationToday('KE', lateUtc)).toBe('2026-11-21');
    expect(escalationToday('GH', lateUtc)).toBe('2026-11-20');
    expect(escalationToday(undefined, lateUtc)).toBe('2026-11-21');
  });

  it('every text has Kiswahili and no jargon', () => {
    const c = group();
    c.constitution = '';
    const all = findEscalations({ charter: c, meetings: [meeting(c, 1, '2026-01-01', { status: 'DRAFT' })], today: '2026-11-20', groupCreated: '2026-01-01' });
    expect(all.length).toBeGreaterThan(1);
    for (const f of all) {
      for (const t of [f.title, f.detail, f.action]) {
        expect(t.en.length).toBeGreaterThan(3);
        expect(t.sw.length).toBeGreaterThan(3);
        expect(`${t.en} ${t.sw}`).not.toMatch(/escalat|KPI|workflow|dashboard|SLA/i);
      }
    }
  });
});
