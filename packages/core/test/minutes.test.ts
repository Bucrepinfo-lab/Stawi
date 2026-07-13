import { describe, it, expect } from 'vitest';
import { emptyMeeting, addAgenda, attendanceTally, tableBankingSummary, meetingCompleteness, type Meeting } from '../src/minutes';
import { paraphraseMinutes, formalResolution, cleanClause, formatKes, ordinal, formatDateLong } from '../src/minutes-prose';

const roster = [
  { memberId: 'a', name: 'Amina Wanjiru', designation: 'Chairperson' },
  { memberId: 'b', name: 'Grace Otieno', designation: 'Treasurer' },
  { memberId: 'c', name: 'Faith Njeri', designation: 'Secretary' },
  { memberId: 'd', name: 'David Mwangi' },
];

function seedMeeting(): Meeting {
  let m = emptyMeeting('umoja', 12, roster);
  m.attendance[3].status = 'absent';
  m.attendance[2].status = 'apology';
  m.date = '2026-06-12'; m.venue = 'At Zawadi Hotel'; m.day = 'Friday';
  m.startTime = '4:00 PM'; m.endTime = '6:00 PM'; m.adjournmentTime = '6:00 PM';
  m.chairpersonName = 'Amina Wanjiru'; m.secretaryName = 'Faith Njeri';
  m.nextMeetingDate = '2026-06-19';
  m.tableBanking.openingBalanceCents = 100000;
  m.tableBanking.contributions = [
    { memberId: 'a', name: 'Amina', amountCents: 50000 },
    { memberId: 'b', name: 'Grace', amountCents: 50000 },
  ];
  m.tableBanking.fines = [{ memberId: 'd', name: 'David Mwangi', reason: 'lateness', amountCents: 10000 }];
  m.tableBanking.payoutRecipient = 'Grace Otieno';
  m.tableBanking.payoutCents = 80000;
  m.agendas = addAgenda(m.agendas, { title: 'Purchase of chairs', discussion: 'we need chairs for meetings', proposedBy: 'Grace', secondedBy: 'Amina', resolution: 'buy 20 plastic chairs' });
  m.agendas = addAgenda(m.agendas, { title: 'Contribution increase', resolution: 'we will increase weekly contribution to 500' });
  return m;
}

describe('attendance tally', () => {
  it('counts present/absent/apology and quorum', () => {
    const t = attendanceTally(seedMeeting().attendance);
    expect([t.present, t.absent, t.apology, t.total]).toEqual([2, 1, 1, 4]);
    expect(t.presentPct).toBe(50);
    expect(t.quorumMet).toBe(false);
  });
});

describe('table-banking reconciliation', () => {
  it('reconciles opening + in - out = closing', () => {
    const fin = tableBankingSummary(seedMeeting().tableBanking);
    expect(fin.contributionsCents).toBe(100000);
    expect(fin.finesCents).toBe(10000);
    expect(fin.totalInCents).toBe(110000);
    expect(fin.totalOutCents).toBe(80000);
    expect(fin.closingBalanceCents).toBe(130000);
    expect(fin.balanced).toBe(true);
  });
});

describe('meeting completeness (self-directing)', () => {
  it('a seeded meeting is document-ready', () => {
    expect(meetingCompleteness(seedMeeting()).readyForDocument).toBe(true);
  });
  it('an empty meeting surfaces the first prompt', () => {
    const r = meetingCompleteness(emptyMeeting('g1', 1));
    expect(r.readyForDocument).toBe(false);
    expect(r.nextPrompt).toBeTruthy();
  });
});

describe('formal-language transforms', () => {
  it('strips conversational filler', () => {
    expect(cleanClause('we agreed to buy chairs')).toBe('buy chairs');
    expect(cleanClause('to open a bank account')).toBe('open a bank account');
  });
  it('recasts bare verbs with "the group shall"', () => {
    expect(formalResolution('buy 20 plastic chairs')).toBe('RESOLVED THAT the group shall buy 20 plastic chairs.');
  });
  it('keeps an explicit subject', () => {
    expect(formalResolution('the members shall pay by Friday')).toBe('RESOLVED THAT the members shall pay by Friday.');
  });
});

describe('formatting helpers', () => {
  it('money, ordinals and long dates', () => {
    expect(formatKes(130000)).toBe('KES 1,300');
    expect(ordinal(12)).toBe('12th');
    expect(ordinal(22)).toBe('22nd');
    expect(formatDateLong('2026-06-12')).toBe('Friday, 12th June 2026');
  });
});

describe('paraphraseMinutes — the OS', () => {
  it('produces a professional, bank-ready document', () => {
    const doc = paraphraseMinutes(seedMeeting(), { name: 'Umoja Women Group', motto: 'Together we rise' } as any);
    expect(doc.documentTitle).toBe('MINUTES OF THE 12TH MEETING OF UMOJA WOMEN GROUP');
    expect(doc.plainText).toContain('RESOLVED THAT the group shall buy 20 plastic chairs.');
    expect(doc.plainText).toContain('merry-go-round payout of KES 800');
    expect(doc.plainText).toContain('closing balance of KES 1,300');
    expect(doc.plainText).toContain('Present (2): Amina Wanjiru and Grace Otieno');
    expect(doc.financeRows.find((r) => r.emphasis)?.amountDisplay).toBe('KES 1,300');
  });
});
