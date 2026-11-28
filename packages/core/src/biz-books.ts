/**
 * Business books (owner 28/11/26): one engine for a kiosk, a busy shop and a
 * business with branches in different towns.
 *
 * The person records plain things: "I sold", "I bought stock", "I paid for",
 * "a customer paid what they owed", "I took money out". Underneath, every one
 * of those becomes a balanced double-entry journal, so the same records give
 * the owner a simple "did I make money today" and give an accountant or auditor
 * a trial balance, profit and loss, balance sheet, cash book and a full audit
 * trail. Nothing is ever deleted: a mistake is corrected by a reversal that
 * keeps the original visible (the rule auditors check first).
 *
 * Money is integer cents. Days are the business's own local day, YYYY-MM-DD.
 * Pure and deterministic; tested in packages/core/test/biz-books.test.ts.
 */

// ───────────────────────────── What a person records ─────────────────────────────

/** How money moved. CREDIT = nobody paid yet (deni): a customer owes us, or we owe a supplier. */
export type BizChannel = 'CASH' | 'MPESA' | 'BANK' | 'CREDIT';
export const BIZ_MONEY_CHANNELS: Exclude<BizChannel, 'CREDIT'>[] = ['CASH', 'MPESA', 'BANK'];

export type BizKind =
  | 'SALE' // sold goods or a service
  | 'STOCK_IN' // bought goods to sell
  | 'EXPENSE' // paid a running cost (rent, wages, transport...)
  | 'DEBT_PAID_IN' // a customer paid what they owed
  | 'DEBT_PAID_OUT' // we paid a supplier what we owed
  | 'OWNER_IN' // owner put money into the business
  | 'OWNER_OUT' // owner took money out for home
  | 'MOVE' // moved money between till, M-Pesa and bank (e.g. banked the cash)
  | 'STOCK_LOSS' // goods damaged, expired or missing (at cost)
  | 'OTHER_INCOME' // money in that is not a sale (commission, rent received)
  | 'EQUIPMENT' // bought something the business keeps (fridge, scale, motorbike)
  | 'CASH_SHORT' // the count at day close found less than expected
  | 'CASH_OVER' // the count at day close found more than expected
  | 'STOCK_COUNT' // counted the value of goods not tracked item by item
  | 'OPENING'; // what the business already had on the day it started using Stawi

/** Where an OPENING entry goes. */
export type BizOpening = 'CASH' | 'MPESA' | 'BANK' | 'STOCK' | 'DEBTORS' | 'CREDITORS' | 'EQUIPMENT';

export const EXPENSE_CATEGORIES = [
  'RENT', 'WAGES', 'TRANSPORT', 'POWER_WATER', 'AIRTIME_INTERNET', 'LICENCES_FEES', 'REPAIRS', 'PACKAGING', 'BANK_MPESA_CHARGES', 'TAX_PAID', 'OTHER',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_LABEL: Record<ExpenseCategory, { en: string; sw: string }> = {
  RENT: { en: 'Rent', sw: 'Kodi ya nyumba' },
  WAGES: { en: 'Wages', sw: 'Mishahara' },
  TRANSPORT: { en: 'Transport', sw: 'Usafiri' },
  POWER_WATER: { en: 'Power and water', sw: 'Stima na maji' },
  AIRTIME_INTERNET: { en: 'Airtime and internet', sw: 'Muda wa maongezi na intaneti' },
  LICENCES_FEES: { en: 'Licences and fees', sw: 'Leseni na ada' },
  REPAIRS: { en: 'Repairs', sw: 'Matengenezo' },
  PACKAGING: { en: 'Bags and packaging', sw: 'Mifuko na vifungashio' },
  BANK_MPESA_CHARGES: { en: 'Bank and M-Pesa charges', sw: 'Ada za benki na M-Pesa' },
  TAX_PAID: { en: 'Tax paid', sw: 'Kodi iliyolipwa' },
  OTHER: { en: 'Other costs', sw: 'Gharama nyingine' },
};

export interface BizEntry {
  id: string;
  kind: BizKind;
  /** Total money of the entry, cents, always > 0. */
  amountCents: number;
  /** How it was paid. MOVE: where the money came from. */
  channel: BizChannel;
  /** MOVE only: where the money went. */
  toChannel?: Exclude<BizChannel, 'CREDIT'>;
  /** Business day, YYYY-MM-DD, in the business's own time zone. */
  day: string;
  branchId: string;
  /** Goods sold, bought, lost: the item and how many. */
  itemId?: string;
  qty?: number;
  /** SALE / STOCK_LOSS of an item: its cost at the time (cents, whole line). */
  costCents?: number;
  /** Customer or supplier name (for money owed). */
  party?: string;
  category?: ExpenseCategory;
  opening?: BizOpening;
  note?: string;
  /** EXPENSE / STOCK_IN: the supplier gave an eTIMS invoice (KRA allows the cost only with one). */
  etims?: boolean;
  /** This entry cancels the entry with this id (both stay visible). */
  reverses?: string;
  /** Audit trail: who wrote it and when (ISO). */
  recordedBy?: string;
  recordedAt?: string;
}

// ───────────────────────────── Chart of accounts ─────────────────────────────

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'COST' | 'EXPENSE';

export interface Account {
  code: string;
  type: AccountType;
  en: string;
  sw: string;
}

/** Plain names for the owner, codes for the accountant. */
export const ACCOUNTS: Record<string, Account> = {
  '1000': { code: '1000', type: 'ASSET', en: 'Cash in the till', sw: 'Pesa taslimu' },
  '1010': { code: '1010', type: 'ASSET', en: 'M-Pesa', sw: 'M-Pesa' },
  '1020': { code: '1020', type: 'ASSET', en: 'Bank', sw: 'Benki' },
  '1100': { code: '1100', type: 'ASSET', en: 'Customers owe us', sw: 'Wateja wanaodaiwa' },
  '1200': { code: '1200', type: 'ASSET', en: 'Stock (item by item)', sw: 'Bidhaa (kwa kila bidhaa)' },
  '1210': { code: '1210', type: 'ASSET', en: 'Stock (counted by value)', sw: 'Bidhaa (kwa thamani)' },
  '1500': { code: '1500', type: 'ASSET', en: 'Equipment', sw: 'Vifaa' },
  '2000': { code: '2000', type: 'LIABILITY', en: 'We owe suppliers', sw: 'Tunadaiwa na wasambazaji' },
  '3000': { code: '3000', type: 'EQUITY', en: 'Owner’s money put in', sw: 'Mtaji wa mwenye biashara' },
  '3100': { code: '3100', type: 'EQUITY', en: 'Owner took out', sw: 'Mwenye biashara alichukua' },
  '4000': { code: '4000', type: 'INCOME', en: 'Sales', sw: 'Mauzo' },
  '4100': { code: '4100', type: 'INCOME', en: 'Other income', sw: 'Mapato mengine' },
  '5000': { code: '5000', type: 'COST', en: 'Cost of goods sold', sw: 'Gharama ya bidhaa zilizouzwa' },
  '5100': { code: '5100', type: 'COST', en: 'Goods lost or damaged', sw: 'Bidhaa zilizopotea au kuharibika' },
  '6900': { code: '6900', type: 'EXPENSE', en: 'Cash short / over at count', sw: 'Upungufu / ziada ya pesa' },
};
const EXPENSE_CODE: Record<ExpenseCategory, string> = {
  RENT: '6000', WAGES: '6010', TRANSPORT: '6020', POWER_WATER: '6030', AIRTIME_INTERNET: '6040', LICENCES_FEES: '6050',
  REPAIRS: '6060', PACKAGING: '6070', BANK_MPESA_CHARGES: '6080', TAX_PAID: '6090', OTHER: '6800',
};
for (const c of EXPENSE_CATEGORIES) {
  ACCOUNTS[EXPENSE_CODE[c]] = { code: EXPENSE_CODE[c], type: 'EXPENSE', en: EXPENSE_LABEL[c].en, sw: EXPENSE_LABEL[c].sw };
}

const MONEY_ACCOUNT: Record<Exclude<BizChannel, 'CREDIT'>, string> = { CASH: '1000', MPESA: '1010', BANK: '1020' };
const OPENING_ACCOUNT: Record<BizOpening, string> = {
  CASH: '1000', MPESA: '1010', BANK: '1020', STOCK: '1200', DEBTORS: '1100', CREDITORS: '2000', EQUIPMENT: '1500',
};

export interface JournalLine {
  entryId: string;
  day: string;
  branchId: string;
  account: string;
  debitCents: number;
  creditCents: number;
}

// ───────────────────────────── Checking an entry ─────────────────────────────

/** A plain-language reason an entry cannot be saved, or null. */
export function bizEntryProblem(e: Omit<BizEntry, 'id'>): string | null {
  if (!Number.isInteger(e.amountCents) || e.amountCents <= 0) return 'Enter an amount above zero.';
  if (e.amountCents > 100_000_000_00) return 'That amount is too large for one entry. Check the number.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.day)) return 'Choose the day.';
  if (!e.branchId) return 'Choose the branch.';
  if (e.qty !== undefined && (!Number.isFinite(e.qty) || e.qty <= 0)) return 'Enter how many.';
  if (e.costCents !== undefined && (!Number.isInteger(e.costCents) || e.costCents < 0)) return 'The cost is not valid.';
  switch (e.kind) {
    case 'SALE':
    case 'STOCK_IN':
      if (e.channel === 'CREDIT' && !e.party?.trim()) return e.kind === 'SALE' ? 'Write who owes you for this sale.' : 'Write which supplier you owe.';
      break;
    case 'EXPENSE':
      if (!e.category) return 'Choose what the money was for.';
      if (e.channel === 'CREDIT' && !e.party?.trim()) return 'Write who you owe.';
      break;
    case 'DEBT_PAID_IN':
    case 'DEBT_PAID_OUT':
      if (e.channel === 'CREDIT') return 'Choose how the money was paid: cash, M-Pesa or bank.';
      if (!e.party?.trim()) return e.kind === 'DEBT_PAID_IN' ? 'Write which customer paid.' : 'Write which supplier you paid.';
      break;
    case 'OWNER_IN':
    case 'OWNER_OUT':
    case 'OTHER_INCOME':
    case 'CASH_SHORT':
    case 'CASH_OVER':
      if (e.channel === 'CREDIT') return 'Choose cash, M-Pesa or bank.';
      break;
    case 'MOVE':
      if (e.channel === 'CREDIT' || !e.toChannel) return 'Choose where the money moved from and to.';
      if (e.toChannel === e.channel) return 'The money must move to a different place.';
      break;
    case 'STOCK_LOSS':
      break;
    case 'EQUIPMENT':
      if (e.channel === 'CREDIT' && !e.party?.trim()) return 'Write who you owe for it.';
      break;
    case 'STOCK_COUNT':
      break;
    case 'OPENING':
      if (!e.opening) return 'Choose what this opening amount is.';
      break;
    default:
      return 'Unknown entry.';
  }
  return null;
}

// ───────────────────────────── Journal ─────────────────────────────

const payAccount = (ch: BizChannel, credit: 'DEBTORS' | 'CREDITORS') =>
  ch === 'CREDIT' ? (credit === 'DEBTORS' ? '1100' : '2000') : MONEY_ACCOUNT[ch];

/**
 * The double-entry lines of one entry. Every entry balances (debits = credits).
 * STOCK_COUNT is relative: `amountCents` is the counted value and `costCents`
 * the book value just before the count, so the line is the difference.
 */
export function journalOf(e: BizEntry): JournalLine[] {
  const L: JournalLine[] = [];
  const dr = (account: string, cents: number) => cents > 0 && L.push({ entryId: e.id, day: e.day, branchId: e.branchId, account, debitCents: cents, creditCents: 0 });
  const cr = (account: string, cents: number) => cents > 0 && L.push({ entryId: e.id, day: e.day, branchId: e.branchId, account, debitCents: 0, creditCents: cents });
  const a = e.amountCents;
  switch (e.kind) {
    case 'SALE':
      dr(payAccount(e.channel, 'DEBTORS'), a);
      cr('4000', a);
      if (e.itemId && e.costCents) { dr('5000', e.costCents); cr('1200', e.costCents); }
      break;
    case 'STOCK_IN':
      // Item by item: the goods sit in stock until sold. Not itemised: treated as
      // purchases (cost of goods) and corrected by a stock count (periodic method).
      dr(e.itemId ? '1200' : '5000', a);
      cr(payAccount(e.channel, 'CREDITORS'), a);
      break;
    case 'EXPENSE':
      dr(EXPENSE_CODE[e.category ?? 'OTHER'], a);
      cr(payAccount(e.channel, 'CREDITORS'), a);
      break;
    case 'DEBT_PAID_IN':
      dr(payAccount(e.channel, 'DEBTORS'), a);
      cr('1100', a);
      break;
    case 'DEBT_PAID_OUT':
      dr('2000', a);
      cr(payAccount(e.channel, 'CREDITORS'), a);
      break;
    case 'OWNER_IN':
      dr(payAccount(e.channel, 'DEBTORS'), a);
      cr('3000', a);
      break;
    case 'OWNER_OUT':
      dr('3100', a);
      cr(payAccount(e.channel, 'CREDITORS'), a);
      break;
    case 'MOVE':
      dr(MONEY_ACCOUNT[e.toChannel ?? 'BANK'], a);
      cr(payAccount(e.channel, 'CREDITORS'), a);
      break;
    case 'STOCK_LOSS':
      dr('5100', a);
      cr(e.itemId ? '1200' : '1210', a);
      break;
    case 'OTHER_INCOME':
      dr(payAccount(e.channel, 'DEBTORS'), a);
      cr('4100', a);
      break;
    case 'EQUIPMENT':
      dr('1500', a);
      cr(payAccount(e.channel, 'CREDITORS'), a);
      break;
    case 'CASH_SHORT':
      dr('6900', a);
      cr(payAccount(e.channel, 'CREDITORS'), a);
      break;
    case 'CASH_OVER':
      dr(payAccount(e.channel, 'DEBTORS'), a);
      cr('6900', a);
      break;
    case 'STOCK_COUNT': {
      // Counted value vs book value of un-itemised stock: the difference moves
      // between stock and cost of goods (periodic inventory).
      const diff = a - (e.costCents ?? 0);
      if (diff > 0) { dr('1210', diff); cr('5000', diff); }
      else if (diff < 0) { dr('5000', -diff); cr('1210', -diff); }
      break;
    }
    case 'OPENING': {
      const acct = e.opening === 'STOCK' && !e.itemId ? '1210' : OPENING_ACCOUNT[e.opening ?? 'CASH'];
      if (e.opening === 'CREDITORS') { dr('3000', a); cr(acct, a); }
      else { dr(acct, a); cr('3000', a); }
      break;
    }
  }
  return L;
}

/**
 * All journal lines of a set of entries. A reversing entry posts the exact
 * opposite of the entry it cancels; both stay in the record.
 */
export function journal(entries: BizEntry[]): JournalLine[] {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const out: JournalLine[] = [];
  for (const e of entries) {
    if (e.reverses) {
      const original = byId.get(e.reverses);
      if (!original) continue;
      for (const l of journalOf(original)) out.push({ ...l, entryId: e.id, day: e.day, branchId: e.branchId, debitCents: l.creditCents, creditCents: l.debitCents });
    } else {
      out.push(...journalOf(e));
    }
  }
  return out;
}

/** Ids of entries that have been cancelled by a reversal. */
export function reversedIds(entries: BizEntry[]): Set<string> {
  return new Set(entries.filter((e) => e.reverses).map((e) => e.reverses!));
}

// ───────────────────────────── Periods ─────────────────────────────

export type BizPeriod = 'day' | 'week' | 'month' | 'year';
export interface DayRange { from: string; to: string } // inclusive YYYY-MM-DD

const DAY_MS = 86_400_000;
const toUtc = (d: string) => Date.parse(`${d}T00:00:00Z`);
const fromUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const addBizDays = (d: string, n: number) => fromUtc(toUtc(d) + n * DAY_MS);
export const bizDaysBetween = (a: string, b: string) => Math.round((toUtc(b) - toUtc(a)) / DAY_MS);

/** The day, week (Monday to Sunday), month or year that contains `day`. */
export function bizRange(day: string, period: BizPeriod): DayRange {
  const [y, m] = day.split('-').map(Number) as [number, number];
  switch (period) {
    case 'day':
      return { from: day, to: day };
    case 'week': {
      const dow = (new Date(toUtc(day)).getUTCDay() + 6) % 7; // Monday = 0
      const from = addBizDays(day, -dow);
      return { from, to: addBizDays(from, 6) };
    }
    case 'month': {
      const from = `${y}-${String(m).padStart(2, '0')}-01`;
      const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
      return { from, to: addBizDays(next, -1) };
    }
    case 'year':
      return { from: `${y}-01-01`, to: `${y}-12-31` };
  }
}

/** The period just before (for "compared with last week"). */
export function previousRange(day: string, period: BizPeriod): DayRange {
  return bizRange(addBizDays(bizRange(day, period).from, -1), period);
}

/** Today in a time zone, YYYY-MM-DD. */
export function bizToday(now: Date = new Date(), timeZone = 'Africa/Nairobi'): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

// ───────────────────────────── Balances and statements ─────────────────────────────

export type Balances = Record<string, number>; // account -> debit minus credit

export function balancesOf(lines: JournalLine[]): Balances {
  const b: Balances = {};
  for (const l of lines) b[l.account] = (b[l.account] ?? 0) + l.debitCents - l.creditCents;
  return b;
}

const inRange = (day: string, r: DayRange) => day >= r.from && day <= r.to;
const sumType = (b: Balances, type: AccountType) =>
  Object.entries(b).reduce((s, [code, v]) => (ACCOUNTS[code]?.type === type ? s + v : s), 0);

export interface TrialBalanceRow { code: string; name: string; type: AccountType; debitCents: number; creditCents: number }
export interface TrialBalance { rows: TrialBalanceRow[]; debitCents: number; creditCents: number; balanced: boolean }

/** Every account's balance up to and including `to`. Debits always equal credits. */
export function trialBalance(entries: BizEntry[], to: string, branchId?: string): TrialBalance {
  const lines = journal(entries).filter((l) => l.day <= to && (!branchId || l.branchId === branchId));
  const b = balancesOf(lines);
  const rows = Object.keys(b).sort().filter((c) => b[c] !== 0).map((code) => ({
    code, name: ACCOUNTS[code]?.en ?? code, type: ACCOUNTS[code]?.type ?? 'EXPENSE',
    debitCents: b[code]! > 0 ? b[code]! : 0, creditCents: b[code]! < 0 ? -b[code]! : 0,
  }));
  const debitCents = rows.reduce((s, r) => s + r.debitCents, 0);
  const creditCents = rows.reduce((s, r) => s + r.creditCents, 0);
  return { rows, debitCents, creditCents, balanced: debitCents === creditCents };
}

export interface MoneyPlace { openingCents: number; inCents: number; outCents: number; closingCents: number }

export interface BizStatement {
  range: DayRange;
  branchId?: string;
  salesCents: number;
  /** Sales by how they were paid. */
  salesBy: Record<BizChannel, number>;
  otherIncomeCents: number;
  costOfGoodsCents: number;
  grossProfitCents: number;
  /** Gross profit as % of sales, one decimal. */
  grossMarginPct: number;
  expensesCents: number;
  expensesBy: Partial<Record<ExpenseCategory, number>>;
  lossesCents: number;
  cashDiffCents: number; // + short, - over
  netProfitCents: number;
  netMarginPct: number;
  /** Cash, M-Pesa, bank: opening + in - out = closing. */
  money: Record<Exclude<BizChannel, 'CREDIT'>, MoneyPlace>;
  customersOweCents: number;
  weOweCents: number;
  stockValueCents: number;
  ownerOutCents: number;
  ownerInCents: number;
  entries: number;
  /** Costs written without an eTIMS invoice (KRA may refuse them as tax deductions). */
  noEtimsCents: number;
}

const pct = (part: number, whole: number) => (whole === 0 ? 0 : Math.round((part / whole) * 1000) / 10);

/**
 * The statement for a range: profit and loss for the range, money places from
 * opening to closing, and balances at the end of the range. The same function
 * gives the day, week, month and year, so they always agree.
 */
export function bizStatement(entries: BizEntry[], range: DayRange, branchId?: string): BizStatement {
  const mine = branchId ? entries.filter((e) => e.branchId === branchId) : entries;
  const lines = journal(mine);
  const inside = lines.filter((l) => inRange(l.day, range));
  const before = balancesOf(lines.filter((l) => l.day < range.from));
  const during = balancesOf(inside);
  const end = balancesOf(lines.filter((l) => l.day <= range.to));
  const v = (b: Balances, code: string) => b[code] ?? 0;
  const z = (x: number) => x || 0; // never show minus zero

  const sales = z(-v(during, '4000'));
  const other = z(-v(during, '4100'));
  const cogs = v(during, '5000');
  const losses = v(during, '5100');
  const cashDiff = v(during, '6900');
  const expensesBy: Partial<Record<ExpenseCategory, number>> = {};
  for (const c of EXPENSE_CATEGORIES) { const x = v(during, EXPENSE_CODE[c]); if (x) expensesBy[c] = x; }
  const expenses = Object.values(expensesBy).reduce((s, x) => s + (x ?? 0), 0);
  const gross = sales - cogs;
  const net = z(gross + other - expenses - losses - cashDiff);

  const reversed = reversedIds(mine);
  const live = mine.filter((e) => !e.reverses && !reversed.has(e.id) && inRange(e.day, range));
  const salesBy: Record<BizChannel, number> = { CASH: 0, MPESA: 0, BANK: 0, CREDIT: 0 };
  for (const e of live) if (e.kind === 'SALE') salesBy[e.channel] += e.amountCents;

  const money = {} as BizStatement['money'];
  for (const ch of BIZ_MONEY_CHANNELS) {
    const code = MONEY_ACCOUNT[ch];
    const ins = inside.filter((l) => l.account === code);
    money[ch] = {
      openingCents: v(before, code),
      inCents: ins.reduce((s, l) => s + l.debitCents, 0),
      outCents: ins.reduce((s, l) => s + l.creditCents, 0),
      closingCents: v(end, code),
    };
  }
  return {
    range, branchId,
    salesCents: sales, salesBy, otherIncomeCents: other, costOfGoodsCents: cogs, grossProfitCents: gross,
    grossMarginPct: pct(gross, sales), expensesCents: expenses, expensesBy, lossesCents: losses, cashDiffCents: cashDiff,
    netProfitCents: net, netMarginPct: pct(net, sales), money,
    customersOweCents: v(end, '1100'), weOweCents: z(-v(end, '2000')), stockValueCents: v(end, '1200') + v(end, '1210'),
    ownerOutCents: v(during, '3100'), ownerInCents: z(-v(during, '3000')),
    entries: live.length,
    noEtimsCents: live.filter((e) => (e.kind === 'EXPENSE' || e.kind === 'STOCK_IN') && !e.etims && e.category !== 'TAX_PAID' && e.category !== 'WAGES').reduce((s, e) => s + e.amountCents, 0),
  };
}

export interface BalanceSheet {
  at: string;
  assets: { code: string; name: string; cents: number }[];
  liabilities: { code: string; name: string; cents: number }[];
  equity: { code: string; name: string; cents: number }[];
  totalAssetsCents: number;
  totalLiabilitiesCents: number;
  totalEquityCents: number;
  /** Assets = liabilities + owner's equity, to the cent. */
  balanced: boolean;
}

/** What the business owns and owes at the end of `at`. */
export function balanceSheet(entries: BizEntry[], at: string, branchId?: string): BalanceSheet {
  const b = balancesOf(journal(branchId ? entries.filter((e) => e.branchId === branchId) : entries).filter((l) => l.day <= at));
  const list = (type: AccountType, sign: 1 | -1) => Object.keys(b).sort()
    .filter((c) => ACCOUNTS[c]?.type === type && b[c] !== 0)
    .map((code) => ({ code, name: ACCOUNTS[code]!.en, cents: sign * b[code]! || 0 }));
  const assets = list('ASSET', 1);
  const liabilities = list('LIABILITY', -1);
  const profitKept = 0 - (sumType(b, 'INCOME') + sumType(b, 'COST') + sumType(b, 'EXPENSE'));
  const equity = [...list('EQUITY', -1), { code: '3900', name: 'Profit kept in the business', cents: profitKept }];
  const totalAssetsCents = assets.reduce((s, x) => s + x.cents, 0);
  const totalLiabilitiesCents = liabilities.reduce((s, x) => s + x.cents, 0);
  const totalEquityCents = equity.reduce((s, x) => s + x.cents, 0);
  return { at, assets, liabilities, equity, totalAssetsCents, totalLiabilitiesCents, totalEquityCents, balanced: totalAssetsCents === totalLiabilitiesCents + totalEquityCents };
}

/**
 * Proof that the short statements add up to the long one: the days of a week
 * (or the weeks... any split) sum exactly to the whole. Returns the gaps, empty
 * when everything agrees.
 */
export function reconcileRanges(entries: BizEntry[], whole: DayRange, parts: DayRange[], branchId?: string): string[] {
  const w = bizStatement(entries, whole, branchId);
  const ps = parts.map((r) => bizStatement(entries, r, branchId));
  const gaps: string[] = [];
  const check = (label: string, f: (s: BizStatement) => number) => {
    const sum = ps.reduce((s, p) => s + f(p), 0);
    if (sum !== f(w)) gaps.push(`${label}: parts ${sum} vs whole ${f(w)}`);
  };
  check('sales', (s) => s.salesCents);
  check('cost of goods', (s) => s.costOfGoodsCents);
  check('expenses', (s) => s.expensesCents);
  check('net profit', (s) => s.netProfitCents);
  for (const ch of BIZ_MONEY_CHANNELS) check(`${ch} in`, (s) => s.money[ch].inCents);
  // Each part's closing money is the next part's opening.
  const sorted = [...ps].sort((a, b) => a.range.from.localeCompare(b.range.from));
  for (let i = 1; i < sorted.length; i++) {
    for (const ch of BIZ_MONEY_CHANNELS) {
      if (sorted[i]!.money[ch].openingCents !== sorted[i - 1]!.money[ch].closingCents) gaps.push(`${ch} carried from ${sorted[i - 1]!.range.to}`);
    }
  }
  return gaps;
}

/** Every day of a range, for splitting a week or month into days. */
export function daysOf(r: DayRange): string[] {
  const out: string[] = [];
  for (let d = r.from; d <= r.to; d = addBizDays(d, 1)) out.push(d);
  return out;
}

// ───────────────────────────── Closing the day ─────────────────────────────

export interface DayCloseInput {
  branchId: string;
  day: string;
  /** What the person counted. Leave a place out if not counted. */
  counted: Partial<Record<Exclude<BizChannel, 'CREDIT'>, number>>;
}

export interface DayCloseResult {
  expected: Record<Exclude<BizChannel, 'CREDIT'>, number>;
  differences: { channel: Exclude<BizChannel, 'CREDIT'>; expectedCents: number; countedCents: number; diffCents: number }[];
  /** CASH_SHORT / CASH_OVER entries to save with the close (no id yet). */
  adjustments: Omit<BizEntry, 'id'>[];
  /** Within the tolerance (a few shillings): nothing to look into. */
  allMatch: boolean;
}

/** Shortages up to this are treated as coins and rounding, not a problem. */
export const CLOSE_TOLERANCE_CENTS = 20_00;

/**
 * Close a day: compare what the books expect in the till, M-Pesa and bank with
 * what was counted (counted first, "blind", then compared). Each difference
 * becomes a cash short/over entry so the books match the money.
 */
export function closeDay(entries: BizEntry[], input: DayCloseInput): DayCloseResult {
  const st = bizStatement(entries, { from: input.day, to: input.day }, input.branchId);
  const expected = { CASH: st.money.CASH.closingCents, MPESA: st.money.MPESA.closingCents, BANK: st.money.BANK.closingCents };
  const differences: DayCloseResult['differences'] = [];
  const adjustments: DayCloseResult['adjustments'] = [];
  for (const ch of BIZ_MONEY_CHANNELS) {
    const counted = input.counted[ch];
    if (counted === undefined || !Number.isInteger(counted) || counted < 0) continue;
    const diff = counted - expected[ch];
    differences.push({ channel: ch, expectedCents: expected[ch], countedCents: counted, diffCents: diff });
    if (diff !== 0) {
      adjustments.push({ kind: diff < 0 ? 'CASH_SHORT' : 'CASH_OVER', amountCents: Math.abs(diff), channel: ch, day: input.day, branchId: input.branchId, note: 'Day close count' });
    }
  }
  return { expected, differences, adjustments, allMatch: differences.every((d) => Math.abs(d.diffCents) <= CLOSE_TOLERANCE_CENTS) };
}

/** A closed day is locked: new entries for it must go on a later day (as corrections). */
export function dayIsLocked(closedDays: { branchId: string; day: string }[], branchId: string, day: string): boolean {
  return closedDays.some((c) => c.branchId === branchId && c.day >= day);
}

// ───────────────────────────── Money owed ─────────────────────────────

export interface PartyBalance { party: string; cents: number; since: string; lastDay: string }

/** Who owes us (customers) or whom we owe (suppliers), oldest debt first. */
export function moneyOwed(entries: BizEntry[], side: 'CUSTOMERS' | 'SUPPLIERS', branchId?: string): PartyBalance[] {
  const reversed = reversedIds(entries);
  const map = new Map<string, PartyBalance>();
  for (const e of entries) {
    if (e.reverses || reversed.has(e.id) || !e.party || (branchId && e.branchId !== branchId)) continue;
    const key = e.party.trim().toLowerCase();
    let delta = 0;
    if (side === 'CUSTOMERS') {
      if ((e.kind === 'SALE' || e.kind === 'OTHER_INCOME') && e.channel === 'CREDIT') delta = e.amountCents;
      if (e.kind === 'DEBT_PAID_IN') delta = -e.amountCents;
      if (e.kind === 'OPENING' && e.opening === 'DEBTORS') delta = e.amountCents;
    } else {
      if ((e.kind === 'STOCK_IN' || e.kind === 'EXPENSE' || e.kind === 'EQUIPMENT') && e.channel === 'CREDIT') delta = e.amountCents;
      if (e.kind === 'DEBT_PAID_OUT') delta = -e.amountCents;
      if (e.kind === 'OPENING' && e.opening === 'CREDITORS') delta = e.amountCents;
    }
    if (!delta) continue;
    const cur = map.get(key) ?? { party: e.party.trim(), cents: 0, since: e.day, lastDay: e.day };
    cur.cents += delta;
    if (e.day < cur.since) cur.since = e.day;
    if (e.day > cur.lastDay) cur.lastDay = e.day;
    map.set(key, cur);
  }
  return [...map.values()].filter((p) => p.cents > 0).sort((a, b) => a.since.localeCompare(b.since));
}

// ───────────────────────────── Branches ─────────────────────────────

export interface BizBranch { id: string; name: string; town?: string }

export interface BranchRow {
  branch: BizBranch;
  statement: BizStatement;
  /** Last day this branch closed, or null. */
  lastClosed: string | null;
  /** Days since the last close (null: never closed). */
  daysUnclosed: number | null;
  shortCents: number;
}

/** Every branch side by side for one range, plus the whole business. The branches always add up to the whole. */
export function branchReport(entries: BizEntry[], branches: BizBranch[], range: DayRange, closedDays: { branchId: string; day: string }[], today: string): { rows: BranchRow[]; whole: BizStatement } {
  const rows = branches.map((branch) => {
    const statement = bizStatement(entries, range, branch.id);
    const closes = closedDays.filter((c) => c.branchId === branch.id).map((c) => c.day).sort();
    const lastClosed = closes.length ? closes[closes.length - 1]! : null;
    return {
      branch, statement, lastClosed,
      daysUnclosed: lastClosed ? bizDaysBetween(lastClosed, today) : null,
      shortCents: statement.cashDiffCents > 0 ? statement.cashDiffCents : 0,
    };
  });
  return { rows: rows.sort((a, b) => b.statement.salesCents - a.statement.salesCents), whole: bizStatement(entries, range) };
}

// ───────────────────────────── For the accountant ─────────────────────────────

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const shillings = (c: number) => (c / 100).toFixed(2);

/** General ledger as CSV: every journal line with its entry, day, branch and account. */
export function generalLedgerCsv(entries: BizEntry[], range: DayRange, branchNames: Record<string, string> = {}): string {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const rows: (string | number)[][] = [['Date', 'Entry', 'Branch', 'Account code', 'Account', 'Debit', 'Credit', 'What', 'Note', 'Recorded by', 'Recorded at', 'Reverses']];
  for (const l of journal(entries).filter((x) => inRange(x.day, range))) {
    const e = byId.get(l.entryId);
    rows.push([l.day, l.entryId, branchNames[l.branchId] ?? l.branchId, l.account, ACCOUNTS[l.account]?.en ?? l.account, shillings(l.debitCents), shillings(l.creditCents), e?.kind ?? '', e?.note ?? e?.party ?? '', e?.recordedBy ?? '', e?.recordedAt ?? '', e?.reverses ?? '']);
  }
  return rows.map((r) => r.map(csvCell).join(',')).join('\n');
}

/** Trial balance as CSV. */
export function trialBalanceCsv(tb: TrialBalance): string {
  const rows: (string | number)[][] = [['Code', 'Account', 'Type', 'Debit', 'Credit']];
  for (const r of tb.rows) rows.push([r.code, r.name, r.type, shillings(r.debitCents), shillings(r.creditCents)]);
  rows.push(['', 'Total', '', shillings(tb.debitCents), shillings(tb.creditCents)]);
  return rows.map((r) => r.map(csvCell).join(',')).join('\n');
}

// ───────────────────────────── Tax pointers (indicative) ─────────────────────────────

export interface BizTaxHint { code: string; label: string; cents: number; note: string }

/**
 * Kenya, indicative only: turnover tax 1.5% of gross sales for a business with
 * yearly sales above KES 1 million and up to KES 25 million that is not VAT
 * registered (Tax Laws (Amendment) Act 2024); VAT 16% inside VAT-inclusive
 * sales when registered. Verify against current KRA rules before filing.
 */
export function bizTaxHints(st: BizStatement, opts: { vatRegistered: boolean; yearSalesCents: number }): BizTaxHint[] {
  const out: BizTaxHint[] = [];
  if (opts.vatRegistered) {
    out.push({ code: 'VAT', label: 'VAT inside your sales (16%)', cents: Math.round((st.salesCents * 16) / 116), note: 'Monthly VAT return by the 20th. Indicative: your VAT on purchases with eTIMS invoices reduces it.' });
  } else if (opts.yearSalesCents > 1_000_000_00 && opts.yearSalesCents <= 25_000_000_00) {
    out.push({ code: 'TOT', label: 'Turnover tax (1.5% of sales)', cents: Math.round(st.salesCents * 0.015), note: 'Monthly by the 20th. Indicative: confirm the current rate with KRA.' });
  }
  if (st.noEtimsCents > 0) {
    out.push({ code: 'ETIMS', label: 'Costs without an eTIMS invoice', cents: st.noEtimsCents, note: 'Since 01/01/26 KRA checks costs against eTIMS. Ask suppliers for an eTIMS invoice so these count.' });
  }
  return out;
}

// ───────────────────────────── Who may do what ─────────────────────────────

export interface BizAccess {
  /** Sees every branch, the whole business, costs and profit. */
  seeAll: boolean;
  /** Branches this person may record and close for. */
  branchIds: string[];
  /** Adds items, branches and prices; corrects (reverses) entries; sees the accountant pack. */
  manage: boolean;
  /** Adds and removes staff (the owner only). */
  owner: boolean;
}

/**
 * Least privilege (owner rule 02/11/26), checked on the server: the owner
 * (chairperson of the business) and its officials see and manage everything;
 * a staff member records and closes the day only for their own branch and
 * sees only that branch's day, not the whole business's costs and profit.
 */
export function bizAccess(role: string | null, staffBranchIds: string[], allBranchIds: string[]): BizAccess | null {
  const r = (role ?? '').toUpperCase();
  if (r === 'CHAIRMAN' || r === 'SECRETARY' || r === 'TREASURER') {
    return { seeAll: true, branchIds: allBranchIds, manage: true, owner: r === 'CHAIRMAN' };
  }
  const mine = staffBranchIds.filter((b) => allBranchIds.includes(b));
  if (r && mine.length) return { seeAll: false, branchIds: mine, manage: false, owner: false };
  return null;
}

/**
 * Closing a business (owner 28/11/26): the owner types its name to confirm.
 * Nothing is deleted; it leaves the lists and reminders and can be reopened.
 */
export function closeBusinessProblem(input: { owner: boolean; name: string; typed: string }): string | null {
  if (!input.owner) return 'Only the owner closes the business.';
  const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();
  if (norm(input.typed) !== norm(input.name)) return 'Type the business name exactly as it is shown to confirm.';
  return null;
}
