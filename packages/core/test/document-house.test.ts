import { describe, expect, it } from 'vitest';
import { addAgenda, emptyMeeting, type Meeting } from '../src/minutes';
import { addMember, emptyCharter, type GroupCharter } from '../src/charter';
import { HOUSE_PURPOSES, buildHouse, checkHouse, checkPurpose, housePurposes, houseRoomName } from '../src/document-house';

function group(full = true): GroupCharter {
  const c = emptyCharter('g1', 'Umoja', 'KE');
  let m = c.members;
  m = addMember(m, { fullName: 'Amina', designation: 'Chairperson', phone: '0712345678', idNumber: full ? '1' : undefined });
  m = addMember(m, { fullName: 'Grace', designation: 'Treasurer', phone: '0722000111', idNumber: '2' });
  m = addMember(m, { fullName: 'Faith', designation: 'Secretary', phone: '0733222333', idNumber: '3' });
  m = addMember(m, { fullName: 'David', designation: 'Member', phone: '0701222333', idNumber: '4' });
  c.members = m;
  if (full) { c.constitution = 'Our rules.'; c.registeredNumber = 'SHG/2021/0456'; }
  return c;
}

function meetings(c: GroupCharter, dates: string[]): Meeting[] {
  return dates.map((date, i) => {
    const m = emptyMeeting('g1', i + 1, c.members.map((x) => ({ memberId: x.id, name: x.fullName })));
    m.id = `m${i + 1}`; m.date = date; m.status = 'POSTED';
    m.tableBanking.contributions = c.members.map((x) => ({ memberId: x.id, name: x.fullName, amountCents: 5_000 }));
    m.agendas = addAgenda(m.agendas, { title: 'Business', discussion: 'x', resolution: i === 0 ? 'start a kiosk' : '' });
    return m;
  });
}

const sixMonths = ['2021-01-08', '2021-02-05', '2021-03-05', '2021-04-02', '2021-05-07', '2021-06-04'];
const find = (h: ReturnType<typeof buildHouse>, id: string) => h.find((x) => x.id === id)!;

describe('the house lists what the group already holds', () => {
  it('counts papers and keeps their dates, back to the first year on record', () => {
    const c = group();
    const h = buildHouse({ charter: c, meetings: meetings(c, sixMonths), business: { name: 'Umoja Kiosk', entryDates: ['2024-03-01', '2024-04-02', '2024-05-03T10:00:00Z'], stockItems: 4 } });
    expect(find(h, 'minutes').count).toBe(6);
    expect(find(h, 'minutes').from).toBe('2021-01-08');
    expect(find(h, 'minutes').to).toBe('2021-06-04');
    expect(find(h, 'minutes').have.en).toContain('08/01/21 to 04/06/21');
    expect(find(h, 'statements').count).toBe(6);
    expect(find(h, 'business_books').count).toBe(3);
    expect(find(h, 'business_books').room).toBe(3);
    expect(h.every((x) => x.state === 'ready')).toBe(true);
  });

  it('drafts do not count, and gaps are named plainly', () => {
    const c = group(false);
    const ms = meetings(c, ['2026-10-02']);
    ms[0]!.status = 'DRAFT';
    const h = buildHouse({ charter: c, meetings: ms });
    expect(find(h, 'minutes').state).toBe('missing');
    expect(find(h, 'member_ids').state).toBe('part');
    expect(find(h, 'member_ids').have.en).toBe('3 of 4 members have an ID number');
    expect(find(h, 'rules').state).toBe('missing');
    expect(find(h, 'registration').state).toBe('missing');
    expect(find(h, 'business_profile').state).toBe('missing');
    for (const x of h) expect(x.fix.sw.length).toBeGreaterThan(5);
  });
});

describe('one set of papers serves every section', () => {
  const c = group();
  const house = buildHouse({ charter: c, meetings: meetings(c, sixMonths) });

  it('group papers alone open savings and credit — nothing is asked again', () => {
    const check = checkPurpose(house, HOUSE_PURPOSES.find((p) => p.id === 'savings_credit')!);
    expect(check.complete).toBe(true);
    expect(check.pct).toBe(100);
    expect(check.lines.find((l) => l.doc.id === 'business_books')!.kind).toBe('helps');
  });

  it('a bank or fund also reads the business books', () => {
    const funding = HOUSE_PURPOSES.find((p) => p.id === 'funding')!;
    const without = checkPurpose(house, funding);
    expect(without.complete).toBe(false);
    expect(without.lines.filter((l) => l.kind === 'must' && !l.ok).map((l) => l.doc.id)).toEqual(['business_profile', 'business_books']);
    const withBooks = buildHouse({ charter: c, meetings: meetings(c, sixMonths), business: { name: 'Kiosk', entryDates: ['2024-03-01', '2024-04-02', '2024-05-03'], stockItems: 0 } });
    expect(checkPurpose(withBooks, funding).complete).toBe(true);
  });

  it('says how many more are needed when there is some but not enough', () => {
    const short = buildHouse({ charter: c, meetings: meetings(c, sixMonths.slice(0, 2)) });
    const line = checkPurpose(short, HOUSE_PURPOSES.find((p) => p.id === 'start_business')!).lines.find((l) => l.doc.id === 'statements')!;
    expect(line.ok).toBe(false);
    expect(line.shortBy).toBe(1);
    const reg = checkPurpose(short, HOUSE_PURPOSES.find((p) => p.id === 'register')!);
    expect(reg.complete).toBe(true);
  });

  it('savings and credit shows only when it is switched on', () => {
    expect(housePurposes({ savingsCredit: false }).map((p) => p.id)).toEqual(['register', 'bank_account', 'start_business', 'funding']);
    expect(checkHouse(house, { savingsCredit: true }).map((x) => x.purpose.id)).toContain('savings_credit');
    const off = housePurposes({ savingsCredit: false });
    for (const p of off) expect(`${p.name.en} ${p.name.sw}`).not.toMatch(/loan|credit|borrow|mkopo|mikopo/i);
  });

  it('every need points at a paper that exists, in both languages', () => {
    const ids = new Set(house.map((x) => x.id));
    for (const p of HOUSE_PURPOSES) {
      expect(p.needs.some((n) => n.kind === 'must')).toBe(true);
      for (const n of p.needs) expect(ids.has(n.doc)).toBe(true);
    }
    expect(houseRoomName(1, 'sw')).toBe('Rekodi za kikundi');
    expect(houseRoomName(3)).toBe('Business books');
  });
});
