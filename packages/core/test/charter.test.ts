import { describe, it, expect } from 'vitest';
import {
  emptyCharter,
  addMember,
  removeMember,
  officials,
  isOfficial,
  normalisePhone,
  charterCompleteness,
  type GroupCharter,
} from '../src/charter';

function seedCharter(): GroupCharter {
  let c = emptyCharter('umoja', 'Umoja Women Group');
  c.schedule = { venue: 'At Zawadi Hotel', days: ['Friday'], startTime: '4:00 PM', endTime: '6:00 PM', frequency: 'Weekly' };
  c.constitution = 'The group shall be known as Umoja Women Group. Membership is open to residents of good standing. Contributions are due weekly. Officials serve two-year terms.';
  c.motto = 'Together we rise';
  c.mission = 'To pool savings and grow member businesses';
  c.vision = 'A financially free community';
  c.coreValues = ['Integrity', 'Unity', 'Diligence'];
  c.members = [];
  c.members = addMember(c.members, { fullName: 'Amina Wanjiru', designation: 'Chairperson', phone: '0712345678' });
  c.members = addMember(c.members, { fullName: 'Grace Otieno', designation: 'Treasurer', phone: '0722000111' });
  c.members = addMember(c.members, { fullName: 'Faith Njeri', designation: 'Secretary', phone: '0733222333' });
  c.members = addMember(c.members, { fullName: 'David Mwangi', designation: 'Member', phone: '0700111222' });
  return c;
}

describe('charter roster', () => {
  it('auto-increments serials as members are added', () => {
    const c = seedCharter();
    expect(c.members.map((m) => m.serial)).toEqual([1, 2, 3, 4]);
  });

  it('renumbers serials after removal', () => {
    let c = seedCharter();
    const secondId = c.members[1].id;
    c.members = removeMember(c.members, secondId);
    expect(c.members.map((m) => m.serial)).toEqual([1, 2, 3]);
    expect(c.members.find((m) => m.id === secondId)).toBeUndefined();
  });

  it('classifies officials vs plain members', () => {
    expect(isOfficial('Chairperson')).toBe(true);
    expect(isOfficial('Treasurer')).toBe(true);
    expect(isOfficial('Member')).toBe(false);
    expect(isOfficial('Committee Member')).toBe(false);
  });

  it('sorts officials into canonical order', () => {
    const c = seedCharter();
    const off = officials(c.members).map((m) => m.designation);
    expect(off).toEqual(['Chairperson', 'Secretary', 'Treasurer']);
  });
});

describe('phone normalisation', () => {
  it('converts leading zero to 254', () => {
    expect(normalisePhone('0712345678')).toBe('254712345678');
  });
  it('strips + from 254 numbers', () => {
    expect(normalisePhone('+254712345678')).toBe('254712345678');
  });
});

describe('charter completeness (self-directing)', () => {
  it('a fully seeded charter is document-ready at 100%', () => {
    const r = charterCompleteness(seedCharter());
    expect(r.pct).toBe(100);
    expect(r.readyForDocument).toBe(true);
    expect(r.missing).toHaveLength(0);
    expect(r.nextPrompt).toBeUndefined();
  });

  it('an empty charter surfaces the first prompt and is not document-ready', () => {
    const r = charterCompleteness(emptyCharter('g1'));
    expect(r.pct).toBeLessThan(20);
    expect(r.readyForDocument).toBe(false);
    expect(r.nextPrompt).toMatch(/name/i);
  });

  it('missing constitution blocks document readiness even if the rest is filled', () => {
    const c = seedCharter();
    c.constitution = '';
    const r = charterCompleteness(c);
    expect(r.readyForDocument).toBe(false);
    expect(r.missing.some((m) => m.key === 'constitution')).toBe(true);
  });

  it('an uploaded constitution file satisfies the constitution requirement', () => {
    const c = seedCharter();
    c.constitution = '';
    c.constitutionFileUrl = 'https://files/constitution.pdf';
    const r = charterCompleteness(c);
    expect(r.fields.find((f) => f.key === 'constitution')?.present).toBe(true);
  });
});
