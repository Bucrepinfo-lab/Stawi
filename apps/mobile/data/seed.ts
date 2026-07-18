/**
 * Self-contained seed for the mobile cockpit — mirrors apps/web/lib/cockpit.ts.
 * Swap for a networked data provider once the mobile app gains auth + API access.
 */
import type { GroupCharter, Meeting, GroupDirectory } from '@stawi/core';

export const CHARTER: GroupCharter = {
  groupId: 'umoja',
  name: 'Umoja Women Group',
  schedule: { venue: 'At Zawadi Hotel, Kayole', days: ['Friday'], startTime: '4:00 PM', endTime: '6:00 PM', frequency: 'Weekly' },
  members: [
    { id: 'a', serial: 1, fullName: 'Amina Wanjiru', designation: 'Chairperson', phone: '0712345678', idNumber: '22345678' },
    { id: 'b', serial: 2, fullName: 'Grace Otieno', designation: 'Treasurer', phone: '0722000111', idNumber: '24567890' },
    { id: 'c', serial: 3, fullName: 'Faith Njeri', designation: 'Secretary', phone: '0733222333', idNumber: '26789012' },
    { id: 'd', serial: 4, fullName: 'Joseph Kamau', designation: 'Committee Member', phone: '0700111222' },
    { id: 'e', serial: 5, fullName: 'David Mwangi', designation: 'Member', phone: '0701222333' },
    { id: 'f', serial: 6, fullName: 'Brian Ouma', designation: 'Member', phone: '0702333444' },
  ],
  constitution:
    'The group shall be known as UMOJA WOMEN GROUP. Membership is open to women of good standing resident within Kayole ward. Each member shall contribute a minimum of KES 500 weekly. Officials shall be elected every two years. A member absent for three consecutive meetings without apology shall be fined.',
  motto: 'Together we rise',
  mission: 'To pool our savings, support one another, and grow member businesses.',
  vision: 'A financially independent, united community of women.',
  coreValues: ['Integrity', 'Unity', 'Diligence', 'Accountability'],
  countryCode: 'KE',
};

const roster = CHARTER.members.map((m) => ({ memberId: m.id, name: m.fullName, designation: m.designation }));
const att = (overrides: Record<string, 'present' | 'absent' | 'apology'> = {}) =>
  roster.map((r) => ({ memberId: r.memberId, name: r.name, designation: r.designation, status: (overrides[r.memberId] ?? 'present') as 'present' | 'absent' | 'apology' }));

export const MEETINGS: Meeting[] = [
  {
    id: 'm2', groupId: 'umoja', meetingNo: 2, date: '2026-06-12', day: 'Friday',
    venue: 'At Zawadi Hotel, Kayole', startTime: '4:00 PM', endTime: '6:00 PM', adjournmentTime: '6:10 PM',
    chairpersonName: 'Amina Wanjiru', secretaryName: 'Faith Njeri', nextMeetingDate: '2026-06-19', status: 'DRAFT',
    attendance: att({ f: 'absent' }),
    agendas: [{ id: 'ag1', order: 1, title: 'Purchase of meeting chairs', discussion: 'we need our own chairs for meetings', proposedBy: 'Faith Njeri', secondedBy: 'Grace Otieno', resolution: 'buy 20 plastic chairs before the next meeting' }],
    aobs: [],
    tableBanking: { openingBalanceCents: 50000, contributions: CHARTER.members.slice(0, 5).map((m) => ({ memberId: m.id, name: m.fullName, amountCents: 50000 })), fines: [{ memberId: 'f', name: 'Brian Ouma', reason: 'absence without apology', amountCents: 10000 }], payoutRecipient: 'Grace Otieno', payoutCents: 250000, otherIn: [], otherOut: [] },
  },
  {
    id: 'm1', groupId: 'umoja', meetingNo: 1, date: '2026-06-05', day: 'Friday',
    venue: 'At Zawadi Hotel, Kayole', startTime: '4:00 PM', endTime: '6:00 PM', adjournmentTime: '6:05 PM',
    chairpersonName: 'Amina Wanjiru', secretaryName: 'Faith Njeri', nextMeetingDate: '2026-06-12', status: 'POSTED',
    attendance: att(),
    agendas: [{ id: 'ag0', order: 1, title: 'Opening of the group account', discussion: 'we should open a bank account for the group', proposedBy: 'Grace Otieno', secondedBy: 'Faith Njeri', resolution: 'open a group bank account at the nearest bank' }],
    aobs: [],
    tableBanking: { openingBalanceCents: 0, contributions: CHARTER.members.map((m) => ({ memberId: m.id, name: m.fullName, amountCents: 50000 })), fines: [], payoutRecipient: 'Amina Wanjiru', payoutCents: 250000, otherIn: [], otherOut: [] },
  },
];

/** Rosters the phone-login screen matches against (one group here; extend freely). */
export const DIRECTORIES: GroupDirectory[] = [
  { groupId: CHARTER.groupId, groupName: CHARTER.name, members: CHARTER.members.map((m) => ({ name: m.fullName, phone: m.phone, designation: m.designation })) },
];
