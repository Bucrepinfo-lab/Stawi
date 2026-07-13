import { describe, it, expect } from 'vitest';
import { normalizePhone, phoneKey, phoneMatches, findMemberGroups, viewerRoleFromLinks, isOfficialInGroup, type GroupDirectory } from '../src/identity';

describe('phone normalisation & matching', () => {
  it('normalises local to international', () => {
    expect(normalizePhone('0712345678', 'KE')).toBe('254712345678');
    expect(normalizePhone('+254712345678')).toBe('254712345678');
  });
  it('keys tolerate formatting differences', () => {
    expect(phoneKey('0712345678')).toBe('712345678');
    expect(phoneKey('254712345678')).toBe('712345678');
    expect(phoneKey('+254 712 345 678')).toBe('712345678');
  });
  it('matches the same line across formats', () => {
    expect(phoneMatches('0712345678', '+254712345678')).toBe(true);
    expect(phoneMatches('0712345678', '0722000111')).toBe(false);
  });
});

const dirs: GroupDirectory[] = [
  { groupId: 'umoja', groupName: 'Umoja Women Group', members: [
    { name: 'Amina Wanjiru', phone: '0712345678', designation: 'Chairperson' },
    { name: 'Grace Otieno', phone: '0722000111', designation: 'Treasurer' },
  ] },
  { groupId: 'mboga', groupName: 'Mama Mboga Hub', members: [
    { name: 'Amina W.', phone: '254712345678', designation: 'Member' },
    { name: 'Esther', phone: '0700999888', designation: 'Chairperson' },
  ] },
  { groupId: 'vijana', groupName: 'Vijana SACCO', members: [
    { name: 'Peter', phone: '0733111000', designation: 'Chairperson' },
  ] },
];

describe('findMemberGroups', () => {
  it('links a phone to every group it appears in, across formats', () => {
    const links = findMemberGroups('+254712345678', dirs);
    expect(links.map((l) => l.groupId).sort()).toEqual(['mboga', 'umoja']);
  });
  it('carries the roster designation and official flag', () => {
    const links = findMemberGroups('0712345678', dirs);
    const umoja = links.find((l) => l.groupId === 'umoja')!;
    expect(umoja.designation).toBe('Chairperson');
    expect(umoja.isOfficial).toBe(true);
    const mboga = links.find((l) => l.groupId === 'mboga')!;
    expect(mboga.isOfficial).toBe(false);
  });
  it('returns nothing for an unknown number', () => {
    expect(findMemberGroups('0799999999', dirs)).toHaveLength(0);
  });
  it('viewerRole is OFFICIAL if official anywhere, else MEMBER', () => {
    expect(viewerRoleFromLinks(findMemberGroups('0712345678', dirs))).toBe('OFFICIAL'); // chair in umoja
    expect(viewerRoleFromLinks(findMemberGroups('0722000111', dirs))).toBe('OFFICIAL'); // treasurer
  });
  it('isOfficialInGroup is per-group', () => {
    expect(isOfficialInGroup('0712345678', dirs[0]!)).toBe(true);  // chair in umoja
    expect(isOfficialInGroup('0712345678', dirs[1]!)).toBe(false); // plain member in mboga
  });
});
