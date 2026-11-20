import { describe, expect, it } from 'vitest';
import { addMember, emptyCharter, type GroupCharter } from '../src/charter';
import { emptyMeeting, type Meeting } from '../src/minutes';
import { findEscalations as findAll } from '../src/escalation';

// These tests follow one matter: the draft minutes.
const findEscalations = (input: Parameters<typeof findAll>[0]) => findAll(input).filter((f) => f.rule === 'minutes_not_posted');
import { attentionNoticeId, attentionSmsText, planAttentionNotices } from '../src/attention-notices';

function group(): GroupCharter {
  const c = emptyCharter('g1', 'Umoja Women Group', 'KE');
  c.constitution = 'Rules.';
  c.schedule.frequency = '';
  let m = c.members;
  m = addMember(m, { fullName: 'Amina', designation: 'Chairperson', phone: '0712345678' });
  m = addMember(m, { fullName: 'Grace', designation: 'Treasurer', phone: '0722000111' });
  m = addMember(m, { fullName: 'Faith', designation: 'Secretary', phone: '0733222333' });
  m = addMember(m, { fullName: 'David', designation: 'Member', phone: '0701222333' });
  m = addMember(m, { fullName: 'Brian', designation: 'Member', phone: '' });
  c.members = m;
  return c;
}

function draft(c: GroupCharter, date: string): Meeting {
  const m = emptyMeeting('g1', 1, c.members.map((x) => ({ memberId: x.id, name: x.fullName })));
  m.id = 'm1'; m.date = date; m.status = 'DRAFT';
  return m;
}

const id = (c: GroupCharter, name: string) => c.members.find((m) => m.fullName === name)!.id;

describe('daily alerts tell the right person once', () => {
  const c = group();
  const meetings = [draft(c, '2026-11-01')];

  it('level 1 tells only the responsible official', () => {
    const findings = findEscalations({ charter: c, meetings, today: '2026-11-06' });
    const plan = planAttentionNotices({ groupName: c.name, members: c.members, findings, alreadyTold: new Set() });
    expect(plan.map((p) => p.memberId)).toEqual([id(c, 'Faith')]);
    expect(plan[0]!.level).toBe(1);
    expect(plan[0]!.text).toContain('Umoja Women Group');
    expect(plan[0]!.text).toContain('Mkutano wa 1 haujakamilika');
  });

  it('never tells the same person twice about the same level', () => {
    const findings = findEscalations({ charter: c, meetings, today: '2026-11-06' });
    const told = new Set([attentionNoticeId(findings[0]!.key, 1, id(c, 'Faith'))]);
    expect(planAttentionNotices({ groupName: c.name, members: c.members, findings, alreadyTold: told })).toEqual([]);
  });

  it('when it climbs, the senior is told and the responsible person is told again at the new level', () => {
    const findings = findEscalations({ charter: c, meetings, today: '2026-11-12' });
    const told = new Set([attentionNoticeId(findings[0]!.key, 1, id(c, 'Faith'))]);
    const plan = planAttentionNotices({ groupName: c.name, members: c.members, findings, alreadyTold: told });
    expect(plan.map((p) => [p.memberId, p.level]).sort()).toEqual([[id(c, 'Amina'), 2], [id(c, 'Faith'), 2]].sort());
  });

  it('at level 4 only officials get an SMS — ordinary members see it in the app', () => {
    const findings = findEscalations({ charter: c, meetings, today: '2027-01-10' });
    expect(findings[0]!.level).toBe(4);
    const plan = planAttentionNotices({ groupName: c.name, members: c.members, findings, alreadyTold: new Set() });
    expect(plan.map((p) => p.memberId).sort()).toEqual([id(c, 'Amina'), id(c, 'Faith'), id(c, 'Grace')].sort());
    expect(plan.every((p) => p.level === 3)).toBe(true);
    expect(plan.map((p) => p.memberId)).not.toContain(id(c, 'David'));
  });

  it('an SMS about one member never carries that member’s name', () => {
    const text = attentionSmsText('Umoja', { rule: 'member_behind', level: 1, title: { en: 'Brian has missed 3 contributions', sw: 'Brian amekosa michango 3' } });
    expect(text).not.toContain('Brian');
    expect(text).toContain('A member has missed 3 contributions');
    expect(text.length).toBeLessThanOrEqual(300);
  });

  it('skips people with no phone number', () => {
    const noPhone = group();
    noPhone.members = noPhone.members.map((m) => (m.designation === 'Secretary' ? { ...m, phone: '' } : m));
    const findings = findEscalations({ charter: noPhone, meetings: [draft(noPhone, '2026-11-01')], today: '2026-11-06' });
    expect(planAttentionNotices({ groupName: 'x', members: noPhone.members, findings, alreadyTold: new Set() })).toEqual([]);
  });
});
