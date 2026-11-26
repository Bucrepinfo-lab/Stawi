import { describe, expect, it } from 'vitest';
import { alertUserIds, contributionAlert, correctionAlert, messageAlert } from '../src/alerts';

/** Owner 26/11/26: every member hears about new messages and new contributions. */
describe('group alerts', () => {
  it('contribution alert names the member, amount, way and total', () => {
    const a = contributionAlert({ groupId: 'g1', groupName: 'Umoja', memberName: 'Mary Wanjiru', amountCents: 250_000, way: 'Cash at the meeting', totalCents: 6_700_000 });
    expect(a.title).toBe('New contribution · Umoja');
    expect(a.body).toBe('Mary Wanjiru paid KES 2,500 (cash at the meeting). Group total now KES 67,000.');
    expect(a.url).toBe('/groups/g1/money');
  });
  it('correction alert says both entries stay', () => {
    expect(correctionAlert({ groupId: 'g', groupName: 'U', memberName: 'Peter', fromCents: 2_000_000, toCents: 1_000_000 }).body).toMatch(/KES 20,000 is now KES 10,000.*Both entries stay/);
  });
  it('whole-group message shows the words; a private one does not', () => {
    const open = messageAlert({ groupId: 'g', groupName: 'Umoja', senderName: 'Ann', body: 'Meeting moved to Saturday 2pm', channel: 'ALL' });
    expect(open.title).toBe('Ann · Umoja');
    expect(open.body).toBe('Meeting moved to Saturday 2pm');
    const priv = messageAlert({ groupId: 'g', groupName: 'Umoja', senderName: 'Ann', body: 'my loan problem', channel: 'OFFICIALS' });
    expect(priv.body).not.toMatch(/loan/);
    expect(priv.title).not.toMatch(/Ann/);
  });
  it('long messages are clipped', () => {
    expect(messageAlert({ groupId: 'g', groupName: 'U', senderName: 'A', body: 'x'.repeat(500), channel: 'ALL' }).body.length).toBe(140);
  });
  const members = [
    { membershipId: 'm1', userId: 'u1', role: 'CHAIRMAN' },
    { membershipId: 'm2', userId: 'u2', role: 'TREASURER' },
    { membershipId: 'm3', userId: 'u3', role: 'MEMBER' },
    { membershipId: 'm4', userId: null, role: 'MEMBER' },
    { membershipId: 'm5', userId: 'u5', role: 'MEMBER' },
  ];
  it('everyone with the app except the one who acted', () => {
    expect(alertUserIds({ members, exceptUserIds: ['u2'] })).toEqual(['u1', 'u3', 'u5']);
  });
  it('a private thread reaches officials and that member only', () => {
    expect(alertUserIds({ members, exceptUserIds: ['u3'], officialsThreadMemberId: 'm3' })).toEqual(['u1', 'u2']);
    expect(alertUserIds({ members, exceptUserIds: ['u1'], officialsThreadMemberId: 'm5' })).toEqual(['u2', 'u5']);
  });
});
