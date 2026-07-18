/**
 * Pillar 1 data-entry cockpit provider.
 *
 * Serves a group's charter + meetings to the UI. When DATABASE_URL is set it reads
 * from @stawi/db; otherwise it returns self-contained seed data so the workspace
 * is fully demonstrable offline. Writes go through server actions (see actions.ts).
 */

import {
  addMember,
  emptyCharter,
  emptyMeeting,
  addAgenda,
  type GroupCharter,
  type Meeting,
} from '@stawi/core';
import { dbEnabled } from './data';
import { MY_GROUPS } from './groups';

export interface Cockpit {
  groupId: string;
  groupName: string;
  charter: GroupCharter;
  meetings: Meeting[];
}

function seedUmojaCharter(): GroupCharter {
  let c = emptyCharter('umoja', 'Umoja Women Group');
  c.logoUrl = undefined;
  c.schedule = { venue: 'At Zawadi Hotel, Kayole', days: ['Friday'], startTime: '4:00 PM', endTime: '6:00 PM', frequency: 'Weekly' };
  c.constitution =
    'The group shall be known as UMOJA WOMEN GROUP. Membership is open to women of good standing resident within Kayole ward. ' +
    'Each member shall contribute a minimum of KES 500 weekly. Officials shall be elected every two years by simple majority. ' +
    'A member absent for three consecutive meetings without apology shall be fined. Funds shall be banked and withdrawals ' +
    'require the signatures of the Chairperson, Treasurer and Secretary.';
  c.motto = 'Together we rise';
  c.mission = 'To pool our savings, support one another, and grow member businesses.';
  c.vision = 'A financially independent and united community of women.';
  c.coreValues = ['Integrity', 'Unity', 'Diligence', 'Accountability'];
  c.registeredNumber = undefined;
  let m = c.members;
  m = addMember(m, { fullName: 'Amina Wanjiru', designation: 'Chairperson', phone: '0712345678', idNumber: '22345678' });
  m = addMember(m, { fullName: 'Grace Otieno', designation: 'Treasurer', phone: '0722000111', idNumber: '24567890' });
  m = addMember(m, { fullName: 'Faith Njeri', designation: 'Secretary', phone: '0733222333', idNumber: '26789012' });
  m = addMember(m, { fullName: 'Joseph Kamau', designation: 'Committee Member', phone: '0700111222', idNumber: '20987654' });
  m = addMember(m, { fullName: 'David Mwangi', designation: 'Member', phone: '0701222333' });
  m = addMember(m, { fullName: 'Brian Ouma', designation: 'Member', phone: '0702333444' });
  c.members = m;
  return c;
}

function roster(c: GroupCharter) {
  return c.members.map((m) => ({ memberId: m.id, name: m.fullName, designation: m.designation }));
}

function seedUmojaMeetings(c: GroupCharter): Meeting[] {
  const r = roster(c);
  const ids = c.members.map((m) => m.id);

  // Meeting 1 — earlier in the month
  let m1 = emptyMeeting('umoja', 1, r);
  m1.date = '2026-06-05'; m1.day = 'Friday'; m1.venue = 'At Zawadi Hotel, Kayole';
  m1.startTime = '4:00 PM'; m1.endTime = '6:00 PM'; m1.adjournmentTime = '6:05 PM';
  m1.chairpersonName = 'Amina Wanjiru'; m1.secretaryName = 'Faith Njeri'; m1.nextMeetingDate = '2026-06-12';
  m1.tableBanking.openingBalanceCents = 0;
  m1.tableBanking.contributions = ids.map((id, i) => ({ memberId: id, name: c.members[i]!.fullName, amountCents: 50000 }));
  m1.tableBanking.payoutRecipient = 'Amina Wanjiru'; m1.tableBanking.payoutCents = 250000;
  m1.agendas = addAgenda(m1.agendas, { title: 'Opening of the group account', discussion: 'we should open a bank account for the group', proposedBy: 'Grace Otieno', secondedBy: 'Faith Njeri', resolution: 'open a group bank account at the nearest bank' });
  m1.status = 'POSTED';

  // Meeting 2 — later, with a fine
  let m2 = emptyMeeting('umoja', 2, r);
  m2.date = '2026-06-12'; m2.day = 'Friday'; m2.venue = 'At Zawadi Hotel, Kayole';
  m2.startTime = '4:00 PM'; m2.endTime = '6:00 PM'; m2.adjournmentTime = '6:10 PM';
  m2.chairpersonName = 'Amina Wanjiru'; m2.secretaryName = 'Faith Njeri'; m2.nextMeetingDate = '2026-06-19';
  m2.attendance = m2.attendance.map((a) => (a.memberId === ids[5] ? { ...a, status: 'absent' } : a));
  m2.tableBanking.openingBalanceCents = 50000;
  m2.tableBanking.contributions = ids.slice(0, 5).map((id, i) => ({ memberId: id, name: c.members[i]!.fullName, amountCents: 50000 }));
  m2.tableBanking.fines = [{ memberId: ids[5]!, name: 'Brian Ouma', reason: 'absence without apology', amountCents: 10000 }];
  m2.tableBanking.payoutRecipient = 'Grace Otieno'; m2.tableBanking.payoutCents = 250000;
  m2.agendas = addAgenda(m2.agendas, { title: 'Purchase of meeting chairs', discussion: 'we need our own chairs for meetings', proposedBy: 'Faith Njeri', secondedBy: 'Grace Otieno', resolution: 'buy 20 plastic chairs before the next meeting' });
  m2.status = 'DRAFT';

  return [m2, m1];
}

export async function getCockpit(groupId: string): Promise<Cockpit | null> {
  if (!dbEnabled()) {
    const g = MY_GROUPS.find((x) => x.id === groupId);
    if (groupId === 'umoja') {
      const charter = seedUmojaCharter();
      return { groupId, groupName: 'Umoja Women Group', charter, meetings: seedUmojaMeetings(charter) };
    }
    // Other seed groups (or a freshly created one): start with a blank, self-directing charter.
    const name = g?.name ?? 'New Group';
    return { groupId, groupName: name, charter: emptyCharter(groupId, name), meetings: [] };
  }
  // DB mode
  const db = await import('@stawi/db');
  const [charterRow, meetingRows] = await Promise.all([
    db.getGroupCharter(db.prisma, groupId),
    db.listMeetings(db.prisma, groupId),
  ]);
  const group = MY_GROUPS.find((x) => x.id === groupId);
  const name = charterRow?.name ?? group?.name ?? 'Group';
  const charter: GroupCharter = charterRow
    ? {
        groupId,
        name: charterRow.name,
        logoUrl: charterRow.logoUrl ?? undefined,
        schedule: charterRow.schedule as any,
        members: charterRow.members as any,
        constitution: charterRow.constitution,
        constitutionFileUrl: charterRow.constitutionFileUrl ?? undefined,
        motto: charterRow.motto,
        mission: charterRow.mission,
        vision: charterRow.vision,
        coreValues: (charterRow.coreValues as any) ?? [],
        notes: charterRow.notes ?? undefined,
        registeredNumber: charterRow.registeredNumber ?? undefined,
        countryCode: charterRow.countryCode,
      }
    : emptyCharter(groupId, name);
  const meetings: Meeting[] = meetingRows.map((r: any) => ({
    id: r.id,
    groupId,
    date: r.date,
    venue: r.venue,
    day: r.day,
    startTime: r.startTime,
    endTime: r.endTime,
    meetingNo: r.meetingNo,
    chairpersonName: r.chairpersonName,
    secretaryName: r.secretaryName,
    attendance: r.attendance ?? [],
    agendas: r.agendas ?? [],
    aobs: r.aobs ?? [],
    tableBanking: r.tableBanking ?? { contributions: [], fines: [] },
    adjournmentTime: r.adjournmentTime,
    nextMeetingDate: r.nextMeetingDate ?? undefined,
    status: r.status,
  }));
  return { groupId, groupName: name, charter, meetings };
}
