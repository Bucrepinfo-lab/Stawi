import { describe, expect, it } from 'vitest';
import { addMember, canEditRoster, cleanRoster, removeMember, rosterAccessChanges, rosterMemberProblem, sameRoster } from '../src/charter';

const base = addMember(addMember([], { fullName: 'Amina Wanjiru', designation: 'Chairperson', phone: '0712345678' }), { fullName: 'Grace Otieno', designation: 'Treasurer', phone: '0722000111' });

describe('who keeps the member list (owner 28/11/26)', () => {
  it('the secretary and the chairperson; not the treasurer or a member', () => {
    expect(canEditRoster('SECRETARY')).toBe(true);
    expect(canEditRoster('CHAIRMAN')).toBe(true);
    expect(canEditRoster('TREASURER')).toBe(false);
    expect(canEditRoster('MEMBER')).toBe(false);
    expect(canEditRoster(null)).toBe(false);
  });
  it('empty rows from tapping "Add member" are not members', () => {
    const withBlanks = addMember(addMember(base));
    expect(cleanRoster(withBlanks)).toHaveLength(2);
    expect(sameRoster(withBlanks, base)).toBe(true);
  });
  it('a removal or a role change is a change to the list', () => {
    expect(sameRoster(removeMember(base, base[1]!.id), base)).toBe(false);
    expect(sameRoster(base.map((m, i) => (i === 1 ? { ...m, designation: 'Chairperson' as const } : m)), base)).toBe(false);
  });
  it('a new member needs a name and a phone not already on the list', () => {
    expect(rosterMemberProblem({ fullName: 'J', phone: '0700111222' }, base)).toMatch(/full name/);
    expect(rosterMemberProblem({ fullName: 'Joseph Kamau', phone: '0700' }, base)).toMatch(/phone/);
    expect(rosterMemberProblem({ fullName: 'Joseph Kamau', phone: '+254 712 345 678' }, base)).toMatch(/already/);
    expect(rosterMemberProblem({ fullName: 'Joseph Kamau', phone: '0700111222' }, base)).toBeNull();
  });
});

it('taking a member off the list means they leave; putting them back gives access again', () => {
  const off = removeMember(base, base[1]!.id);
  expect(rosterAccessChanges(base, off)).toEqual({ left: ['722000111'], onList: ['712345678'] });
  expect(rosterAccessChanges(off, base).left).toEqual([]);
  expect(rosterAccessChanges(off, base).onList).toContain('722000111');
  // A blank row or a changed name is not someone leaving.
  expect(rosterAccessChanges(base, addMember(base)).left).toEqual([]);
});
