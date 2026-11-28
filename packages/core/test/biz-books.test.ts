import { describe, expect, it } from 'vitest';
import {
  addBizDays, balanceSheet, bizEntryProblem, bizRange, bizStatement, branchReport, closeDay, dayIsLocked, daysOf,
  generalLedgerCsv, journal, journalOf, moneyOwed, previousRange, reconcileRanges, trialBalance, bizTaxHints,
  BIZ_MONEY_CHANNELS, EXPENSE_CATEGORIES, type BizEntry, type BizKind, type BizChannel,
} from '../src/biz-books';
import { costOfSale, dayHighlights, itemInsights, itemPositions, salesByDay, type BizItem } from '../src/biz-items';
import { bizBrief } from '../src/biz-brief';

let n = 0;
const e = (x: Partial<BizEntry> & Pick<BizEntry, 'kind' | 'amountCents'>): BizEntry => ({
  id: `e${++n}`, channel: 'CASH', day: '2026-11-02', branchId: 'main', recordedAt: `2026-11-02T08:${String(n % 60).padStart(2, '0')}:00Z`, ...x,
});

/** A seeded month of a busy two-branch shop: every kind of entry, every channel. */
function month(seed = 7): { entries: BizEntry[]; items: BizItem[] } {
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  const items: BizItem[] = [
    { id: 'sugar', name: 'Sugar 2kg', unit: 'packet', priceCents: 360_00, reorderAt: 10 },
    { id: 'milk', name: 'Milk 500ml', unit: 'packet', priceCents: 65_00, reorderAt: 20 },
    { id: 'umbrella', name: 'Umbrella', unit: 'piece', priceCents: 800_00, reorderAt: 0 },
  ];
  const out: BizEntry[] = [
    e({ kind: 'OPENING', opening: 'CASH', amountCents: 5_000_00, day: '2026-11-01' }),
    e({ kind: 'OPENING', opening: 'MPESA', amountCents: 12_000_00, day: '2026-11-01' }),
    e({ kind: 'OPENING', opening: 'STOCK', itemId: 'umbrella', qty: 6, amountCents: 3_000_00, day: '2026-11-01' }),
    e({ kind: 'OPENING', opening: 'CREDITORS', party: 'Bidco', amountCents: 2_000_00, day: '2026-11-01' }),
    e({ kind: 'STOCK_IN', itemId: 'sugar', qty: 100, amountCents: 30_000_00, channel: 'MPESA', day: '2026-11-01', etims: true }),
    e({ kind: 'STOCK_IN', itemId: 'milk', qty: 300, amountCents: 15_000_00, channel: 'CREDIT', party: 'Brookside', day: '2026-11-01', branchId: 'town' }),
    e({ kind: 'OPENING', opening: 'CASH', amountCents: 2_000_00, day: '2026-11-01', branchId: 'town' }),
  ];
  for (let d = 2; d <= 30; d++) {
    const day = `2026-11-${String(d).padStart(2, '0')}`;
    for (const branch of ['main', 'town']) {
      const sold = branch === 'main' ? 2 + Math.floor(rnd() * 3) : 0;
      if (sold) {
        const sofar = out.concat();
        out.push(e({ kind: 'SALE', itemId: 'sugar', qty: sold, amountCents: sold * 360_00, channel: rnd() < 0.5 ? 'CASH' : 'MPESA', day, branchId: branch, costCents: costOfSale(sofar, 'sugar', sold, branch, day) }));
      }
      if (branch === 'town') {
        const m = 5 + Math.floor(rnd() * 5);
        out.push(e({ kind: 'SALE', itemId: 'milk', qty: m, amountCents: m * 65_00, channel: rnd() < 0.2 ? 'CREDIT' : 'CASH', party: 'Mama Akinyi', day, branchId: branch, costCents: costOfSale(out, 'milk', m, branch, day) }));
      }
      if (rnd() < 0.3) out.push(e({ kind: 'EXPENSE', category: EXPENSE_CATEGORIES[Math.floor(rnd() * EXPENSE_CATEGORIES.length)]!, amountCents: 300_00 + Math.floor(rnd() * 900_00), channel: 'CASH', day, branchId: branch, etims: rnd() < 0.5 }));
    }
    if (d % 7 === 0) out.push(e({ kind: 'MOVE', channel: 'CASH', toChannel: 'BANK', amountCents: 2_000_00, day }));
    if (d === 10) out.push(e({ kind: 'DEBT_PAID_OUT', party: 'Bidco', amountCents: 2_000_00, channel: 'MPESA', day }));
    if (d === 12) out.push(e({ kind: 'OWNER_OUT', amountCents: 1_500_00, channel: 'MPESA', day }));
    if (d === 15) out.push(e({ kind: 'STOCK_LOSS', itemId: 'milk', qty: 4, amountCents: 200_00, day, branchId: 'town' }));
    if (d === 18) out.push(e({ kind: 'DEBT_PAID_IN', party: 'Mama Akinyi', amountCents: 130_00, channel: 'MPESA', day, branchId: 'town' }));
    if (d === 20) out.push(e({ kind: 'EQUIPMENT', amountCents: 25_000_00, channel: 'BANK', day, note: 'Fridge' }));
    if (d === 22) out.push(e({ kind: 'OTHER_INCOME', amountCents: 400_00, channel: 'MPESA', day, note: 'M-Pesa agent commission' }));
    if (d === 25) out.push(e({ kind: 'CASH_SHORT', amountCents: 150_00, channel: 'CASH', day, branchId: 'town' }));
    if (d === 26) out.push(e({ kind: 'OWNER_IN', amountCents: 10_000_00, channel: 'BANK', day }));
    if (d === 27) out.push(e({ kind: 'STOCK_IN', amountCents: 4_000_00, channel: 'CASH', day, note: 'Sweets, not itemised' }));
    if (d === 30) out.push(e({ kind: 'STOCK_COUNT', amountCents: 1_500_00, costCents: 0, day, note: 'Sweets left' }));
  }
  return { entries: out, items };
}

describe('every entry is a balanced double entry', () => {
  const kinds: BizKind[] = ['SALE', 'STOCK_IN', 'EXPENSE', 'DEBT_PAID_IN', 'DEBT_PAID_OUT', 'OWNER_IN', 'OWNER_OUT', 'MOVE', 'STOCK_LOSS', 'OTHER_INCOME', 'EQUIPMENT', 'CASH_SHORT', 'CASH_OVER', 'STOCK_COUNT', 'OPENING'];
  const channels: BizChannel[] = ['CASH', 'MPESA', 'BANK', 'CREDIT'];
  it('debits equal credits for every kind and channel', () => {
    for (const kind of kinds) for (const channel of channels) {
      const lines = journalOf(e({ kind, channel, amountCents: 12_345, toChannel: channel === 'BANK' ? 'CASH' : 'BANK', category: 'RENT', opening: 'CASH', itemId: 'x', qty: 1, costCents: 7_000, party: 'P' }));
      const dr = lines.reduce((s, l) => s + l.debitCents, 0);
      const cr = lines.reduce((s, l) => s + l.creditCents, 0);
      expect(dr, `${kind} ${channel}`).toBe(cr);
      expect(dr, `${kind} ${channel}`).toBeGreaterThan(0);
    }
  });
  it('a month of real trading keeps the trial balance and balance sheet in balance every day', () => {
    const { entries } = month();
    for (const day of daysOf({ from: '2026-11-01', to: '2026-11-30' })) {
      expect(trialBalance(entries, day).balanced, day).toBe(true);
      expect(balanceSheet(entries, day).balanced, day).toBe(true);
      for (const b of ['main', 'town']) expect(balanceSheet(entries, day, b).balanced, `${b} ${day}`).toBe(true);
    }
  });
});

describe('day, week, month and year statements agree with each other', () => {
  const { entries } = month();
  it('the days of each week add up to the week, and carry money from day to day', () => {
    for (const ref of ['2026-11-03', '2026-11-10', '2026-11-17', '2026-11-24']) {
      const week = bizRange(ref, 'week');
      expect(reconcileRanges(entries, week, daysOf(week).map((d) => ({ from: d, to: d })))).toEqual([]);
    }
  });
  it('the weeks and the days add up to the month', () => {
    const m = bizRange('2026-11-15', 'month');
    expect(m).toEqual({ from: '2026-11-01', to: '2026-11-30' });
    expect(reconcileRanges(entries, m, daysOf(m).map((d) => ({ from: d, to: d })))).toEqual([]);
  });
  it('each branch reconciles on its own too', () => {
    const m = bizRange('2026-11-15', 'month');
    for (const b of ['main', 'town']) expect(reconcileRanges(entries, m, daysOf(m).map((d) => ({ from: d, to: d })), b)).toEqual([]);
  });
  it('money places: opening + in - out = closing', () => {
    const st = bizStatement(entries, bizRange('2026-11-15', 'month'));
    for (const ch of BIZ_MONEY_CHANNELS) {
      const p = st.money[ch];
      expect(p.openingCents + p.inCents - p.outCents).toBe(p.closingCents);
    }
  });
  it('the profit in the year equals the profit kept on the balance sheet (no other years)', () => {
    const y = bizStatement(entries, bizRange('2026-11-15', 'year'));
    const bs = balanceSheet(entries, '2026-12-31');
    expect(bs.equity.find((x) => x.code === '3900')!.cents).toBe(y.netProfitCents);
  });
  it('periods: Monday weeks, real month ends, leap years', () => {
    expect(bizRange('2026-11-29', 'week')).toEqual({ from: '2026-11-23', to: '2026-11-29' }); // a Sunday
    expect(bizRange('2028-02-10', 'month').to).toBe('2028-02-29');
    expect(previousRange('2026-03-15', 'month')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
  });
});

describe('the statement in plain numbers', () => {
  it('a kiosk day: sales, costs, profit, money in the till and on M-Pesa', () => {
    const entries = [
      e({ kind: 'OPENING', opening: 'CASH', amountCents: 1_000_00, day: '2026-11-01' }),
      e({ kind: 'SALE', amountCents: 2_500_00, channel: 'CASH' }),
      e({ kind: 'SALE', amountCents: 1_500_00, channel: 'MPESA' }),
      e({ kind: 'STOCK_IN', amountCents: 2_000_00, channel: 'CASH' }),
      e({ kind: 'EXPENSE', category: 'TRANSPORT', amountCents: 200_00, channel: 'CASH', etims: false }),
    ];
    const st = bizStatement(entries, { from: '2026-11-02', to: '2026-11-02' });
    expect(st.salesCents).toBe(4_000_00);
    expect(st.salesBy).toMatchObject({ CASH: 2_500_00, MPESA: 1_500_00 });
    expect(st.costOfGoodsCents).toBe(2_000_00);
    expect(st.netProfitCents).toBe(1_800_00);
    expect(st.money.CASH).toEqual({ openingCents: 1_000_00, inCents: 2_500_00, outCents: 2_200_00, closingCents: 1_300_00 });
    expect(st.money.MPESA.closingCents).toBe(1_500_00);
    expect(st.noEtimsCents).toBe(2_200_00);
  });
  it('selling on credit is a sale now and money owed until paid', () => {
    const entries = [
      e({ kind: 'SALE', amountCents: 900_00, channel: 'CREDIT', party: 'Otieno' }),
      e({ kind: 'DEBT_PAID_IN', amountCents: 400_00, channel: 'MPESA', party: 'otieno ', day: '2026-11-05' }),
    ];
    expect(bizStatement(entries, { from: '2026-11-02', to: '2026-11-02' }).salesCents).toBe(900_00);
    expect(bizStatement(entries, { from: '2026-11-05', to: '2026-11-05' }).salesCents).toBe(0);
    expect(moneyOwed(entries, 'CUSTOMERS')).toEqual([{ party: 'Otieno', cents: 500_00, since: '2026-11-02', lastDay: '2026-11-05' }]);
  });
  it('owner money and moving cash to the bank are not profit', () => {
    const entries = [
      e({ kind: 'OWNER_IN', amountCents: 5_000_00, channel: 'BANK' }),
      e({ kind: 'MOVE', amountCents: 1_000_00, channel: 'BANK', toChannel: 'CASH' }),
      e({ kind: 'OWNER_OUT', amountCents: 300_00, channel: 'CASH' }),
    ];
    const st = bizStatement(entries, { from: '2026-11-02', to: '2026-11-02' });
    expect(st.netProfitCents).toBe(0);
    expect(st.ownerInCents).toBe(5_000_00);
    expect(st.ownerOutCents).toBe(300_00);
    expect(st.money.CASH.closingCents).toBe(700_00);
  });
  it('a stock count corrects the cost of goods for goods not tracked one by one', () => {
    const entries = [
      e({ kind: 'SALE', amountCents: 3_000_00 }),
      e({ kind: 'STOCK_IN', amountCents: 2_000_00 }),
      e({ kind: 'STOCK_COUNT', amountCents: 800_00, costCents: 0, day: '2026-11-02' }),
    ];
    const st = bizStatement(entries, { from: '2026-11-02', to: '2026-11-02' });
    expect(st.costOfGoodsCents).toBe(1_200_00);
    expect(st.stockValueCents).toBe(800_00);
  });
});

describe('mistakes are corrected, never deleted', () => {
  it('a reversal cancels the entry; both stay in the record', () => {
    const wrong = e({ kind: 'SALE', amountCents: 50_000_00 });
    const fix = e({ kind: 'SALE', amountCents: 50_000_00, reverses: wrong.id, day: '2026-11-03' });
    const right = e({ kind: 'SALE', amountCents: 500_00, day: '2026-11-03' });
    const entries = [wrong, fix, right];
    expect(journal(entries).filter((l) => l.entryId === wrong.id || l.entryId === fix.id)).toHaveLength(4);
    expect(bizStatement(entries, { from: '2026-11-01', to: '2026-11-30' }).salesCents).toBe(500_00);
    expect(trialBalance(entries, '2026-11-30').balanced).toBe(true);
    const csv = generalLedgerCsv(entries, { from: '2026-11-01', to: '2026-11-30' });
    expect(csv).toContain(wrong.id);
    expect(csv.split('\n')[0]).toContain('Reverses');
  });
  it('a closed day is locked for its branch only', () => {
    const closed = [{ branchId: 'main', day: '2026-11-02' }];
    expect(dayIsLocked(closed, 'main', '2026-11-02')).toBe(true);
    expect(dayIsLocked(closed, 'main', '2026-11-01')).toBe(true);
    expect(dayIsLocked(closed, 'main', '2026-11-03')).toBe(false);
    expect(dayIsLocked(closed, 'town', '2026-11-02')).toBe(false);
  });
});

describe('closing the day', () => {
  const entries = [
    e({ kind: 'OPENING', opening: 'CASH', amountCents: 1_000_00, day: '2026-11-01' }),
    e({ kind: 'SALE', amountCents: 4_000_00, channel: 'CASH' }),
    e({ kind: 'SALE', amountCents: 2_000_00, channel: 'MPESA' }),
  ];
  it('finds a shortage and writes it down so the books match the money', () => {
    const r = closeDay(entries, { branchId: 'main', day: '2026-11-02', counted: { CASH: 4_700_00, MPESA: 2_000_00 } });
    expect(r.expected.CASH).toBe(5_000_00);
    expect(r.differences.find((d) => d.channel === 'CASH')!.diffCents).toBe(-300_00);
    expect(r.allMatch).toBe(false);
    const after = [...entries, ...r.adjustments.map((a, i) => ({ ...a, id: `adj${i}` }))];
    expect(bizStatement(after, { from: '2026-11-02', to: '2026-11-02' }).money.CASH.closingCents).toBe(4_700_00);
    expect(bizStatement(after, { from: '2026-11-02', to: '2026-11-02' }).cashDiffCents).toBe(300_00);
  });
  it('coins and rounding are not a problem', () => {
    expect(closeDay(entries, { branchId: 'main', day: '2026-11-02', counted: { CASH: 4_990_00 } }).allMatch).toBe(true);
  });
});

describe('checking an entry before it is saved', () => {
  const base = { amountCents: 100_00, channel: 'CASH' as BizChannel, day: '2026-11-02', branchId: 'main' };
  it('explains what is missing in plain words', () => {
    expect(bizEntryProblem({ ...base, kind: 'SALE', amountCents: 0 })).toMatch(/amount/);
    expect(bizEntryProblem({ ...base, kind: 'SALE', channel: 'CREDIT' })).toMatch(/who owes/);
    expect(bizEntryProblem({ ...base, kind: 'EXPENSE' })).toMatch(/what the money was for/);
    expect(bizEntryProblem({ ...base, kind: 'MOVE', toChannel: 'CASH' })).toMatch(/different/);
    expect(bizEntryProblem({ ...base, kind: 'DEBT_PAID_IN', channel: 'CREDIT', party: 'A' })).toMatch(/cash, M-Pesa or bank/);
    expect(bizEntryProblem({ ...base, kind: 'SALE' })).toBeNull();
  });
});

describe('branches', () => {
  it('branches side by side always add up to the whole business', () => {
    const { entries } = month();
    const range = bizRange('2026-11-15', 'month');
    const r = branchReport(entries, [{ id: 'main', name: 'Main' }, { id: 'town', name: 'Kisumu town' }], range, [{ branchId: 'main', day: '2026-11-28' }], '2026-11-30');
    expect(r.rows.reduce((s, x) => s + x.statement.salesCents, 0)).toBe(r.whole.salesCents);
    expect(r.rows.reduce((s, x) => s + x.statement.netProfitCents, 0)).toBe(r.whole.netProfitCents);
    expect(r.rows.find((x) => x.branch.id === 'main')!.daysUnclosed).toBe(2);
    expect(r.rows.find((x) => x.branch.id === 'town')!.lastClosed).toBeNull();
    expect(r.rows.find((x) => x.branch.id === 'town')!.shortCents).toBe(150_00);
  });
});

describe('items: stock, cost, movement and risk', () => {
  it('average cost is weighted and sales take goods out at that cost', () => {
    const entries = [
      e({ kind: 'STOCK_IN', itemId: 'rice', qty: 10, amountCents: 1_000_00, day: '2026-11-01' }),
      e({ kind: 'STOCK_IN', itemId: 'rice', qty: 10, amountCents: 1_400_00, day: '2026-11-02' }),
    ];
    expect(itemPositions(entries).get('rice')).toMatchObject({ qty: 20, avgCostCents: 120_00, valueCents: 2_400_00 });
    expect(costOfSale(entries, 'rice', 5, 'main', '2026-11-03')).toBe(600_00);
  });
  it('the month: sugar is fast, the umbrella is not moving with money stuck, milk losses are flagged', () => {
    const { entries, items } = month();
    const ins = itemInsights(entries, items, '2026-11-30');
    const by = (id: string) => ins.find((i) => i.item.id === id)!;
    expect(by('sugar').movement).toBe('fast');
    expect(by('umbrella').movement).toBe('stagnant');
    expect(by('umbrella').risks).toContain('money_stuck');
    expect(by('milk').movement).toBe('fast');
    expect(by('sugar').marginPct).toBeGreaterThan(0);
    // Stock on hand from the books matches what was bought less what was sold.
    const soldSugar = entries.filter((x) => x.kind === 'SALE' && x.itemId === 'sugar').reduce((s, x) => s + x.qty!, 0);
    expect(by('sugar').qty).toBe(100 - soldSugar);
    // The items' stock value is what the balance sheet shows for item stock.
    const bs = balanceSheet(entries, '2026-11-30');
    const itemStock = bs.assets.find((a) => a.code === '1200')!.cents;
    expect(Math.abs(itemStock - ins.reduce((s, i) => s + i.stockValueCents, 0))).toBeLessThanOrEqual(items.length * 100);
  });
  it('running out and selling below cost are risks', () => {
    const items: BizItem[] = [{ id: 'bread', name: 'Bread', unit: 'loaf', priceCents: 50_00, reorderAt: 0 }];
    const entries: BizEntry[] = [e({ kind: 'STOCK_IN', itemId: 'bread', qty: 40, amountCents: 2_400_00, day: '2026-11-01' })];
    for (let d = 2; d <= 12; d++) entries.push(e({ kind: 'SALE', itemId: 'bread', qty: 3, amountCents: 150_00, costCents: 180_00, day: `2026-11-${String(d).padStart(2, '0')}` }));
    const i = itemInsights(entries, items, '2026-11-12')[0]!;
    expect(i.qty).toBe(7);
    expect(i.risks).toContain('running_out');
    expect(i.risks).toContain('below_cost');
  });
  it('the day highlights: busiest, running out, not moving', () => {
    const { entries, items } = month();
    const h = dayHighlights(entries, items, '2026-11-30');
    expect(h.busiest.length).toBeGreaterThan(0);
    expect(h.notMoving.map((x) => x.name)).toContain('Umbrella');
    expect(salesByDay(entries, { from: '2026-11-24', to: '2026-11-30' })).toHaveLength(7);
  });
});

describe('the brief and the tax pointers', () => {
  it('speaks plainly and never says loan', () => {
    const { entries } = month();
    const now = bizStatement(entries, bizRange('2026-11-30', 'week'));
    const before = bizStatement(entries, previousRange('2026-11-30', 'week'));
    const lines = bizBrief(now, before, 'week');
    expect(lines[0]!.text).toMatch(/profit|more than you earned|broke even/);
    expect(lines.map((l) => l.text).join(' ').toLowerCase()).not.toContain('loan');
    expect(bizBrief(bizStatement([], { from: '2026-11-30', to: '2026-11-30' }), null, 'day')[0]!.text).toMatch(/I sold/);
  });
  it('turnover tax only in its band, VAT when registered, and costs without eTIMS', () => {
    const st = bizStatement([e({ kind: 'SALE', amountCents: 116_000_00 }), e({ kind: 'EXPENSE', category: 'RENT', amountCents: 10_000_00 })], { from: '2026-11-02', to: '2026-11-02' });
    expect(bizTaxHints(st, { vatRegistered: false, yearSalesCents: 3_000_000_00 }).find((t) => t.code === 'TOT')!.cents).toBe(1_740_00);
    expect(bizTaxHints(st, { vatRegistered: false, yearSalesCents: 500_000_00 }).some((t) => t.code === 'TOT')).toBe(false);
    expect(bizTaxHints(st, { vatRegistered: true, yearSalesCents: 9_000_000_00 }).find((t) => t.code === 'VAT')!.cents).toBe(16_000_00);
    expect(bizTaxHints(st, { vatRegistered: true, yearSalesCents: 0 }).find((t) => t.code === 'ETIMS')!.cents).toBe(10_000_00);
  });
});

it('addBizDays crosses months and years', () => {
  expect(addBizDays('2026-12-31', 1)).toBe('2027-01-01');
  expect(addBizDays('2026-03-01', -1)).toBe('2026-02-28');
});

describe('who may do what (server-enforced)', () => {
  it('the owner and officials see everything; staff only their branch; others nothing', async () => {
    const { bizAccess } = await import('../src/biz-books');
    expect(bizAccess('CHAIRMAN', [], ['a', 'b'])).toEqual({ seeAll: true, branchIds: ['a', 'b'], manage: true, owner: true });
    expect(bizAccess('TREASURER', [], ['a', 'b'])!.owner).toBe(false);
    expect(bizAccess('MEMBER', ['b'], ['a', 'b'])).toEqual({ seeAll: false, branchIds: ['b'], manage: false, owner: false });
    expect(bizAccess('MEMBER', ['gone'], ['a'])).toBeNull();
    expect(bizAccess('MEMBER', [], ['a'])).toBeNull();
    expect(bizAccess(null, ['a'], ['a'])).toBeNull();
  });
});

it('the brief warns when money shows below zero (a missing starting balance)', () => {
  const st = bizStatement([e({ kind: 'SALE', amountCents: 500_00 }), e({ kind: 'STOCK_IN', amountCents: 2_000_00, channel: 'MPESA' })], { from: '2026-11-02', to: '2026-11-02' });
  expect(bizBrief(st, null, 'day').some((l) => /M-Pesa below zero/.test(l.text) && /What I have today/.test(l.text))).toBe(true);
});
