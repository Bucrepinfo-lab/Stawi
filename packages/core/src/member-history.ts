import { formatMoney } from './capital';

/**
 * A member's own payment history (owner 26/11/26: "let each and every person
 * have his own … all the money ever contributed with their date, the amount,
 * in a way that somebody can download the statement"). Pure: rows in, the
 * statement and its CSV out.
 */
export interface HistoryEntry {
  id: string;
  at: string; // ISO
  amountCents: number;
  channel: string;
  ref: string | null;
  isCorrection: boolean;
  witnessed: string | null; // e.g. "2 of 2" or null when not needed
}

export interface HistoryLine extends HistoryEntry {
  date: string; // dd/mm/yy
  way: string;
  runningCents: number;
}

const WAY: Record<string, string> = { CASH: 'Cash', MPESA_STK: 'M-Pesa', MPESA_C2B: 'M-Pesa', BANK: 'Bank', CARD: 'Card' };
const dmy = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${String(d.getUTCFullYear()).slice(2)}`;
};

export function memberHistory(entries: HistoryEntry[]): { lines: HistoryLine[]; totalCents: number; count: number; first: string | null; last: string | null } {
  const sorted = [...entries].sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
  let running = 0;
  const lines = sorted.map((e) => {
    running += e.amountCents;
    return { ...e, date: dmy(e.at), way: e.isCorrection ? 'Correction' : WAY[e.channel] ?? e.channel, runningCents: running };
  });
  return {
    lines,
    totalCents: running,
    count: lines.filter((l) => !l.isCorrection).length,
    first: lines[0]?.date ?? null,
    last: lines[lines.length - 1]?.date ?? null,
  };
}

const quote = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
/** Text typed by people: a leading = + - @ would run as a formula in a spreadsheet. */
const text = (v: string) => quote(/^[=+\-@]/.test(v) ? `'${v}` : v);
const amount = (cents: number) => quote(formatMoney(cents));

/** Spreadsheet-safe CSV (formula characters neutralised), amounts in KES. */
export function memberHistoryCsv(input: { groupName: string; memberName: string; lines: HistoryLine[]; totalCents: number }): string {
  const rows: string[][] = [
    ['Stawi payment history'],
    ['Group', text(input.groupName)],
    ['Member', text(input.memberName)],
    [],
    ['Date', 'Amount (KES)', 'Way', 'Reference', 'Witnessed', 'Running total (KES)'],
    ...input.lines.map((l) => [l.date, amount(l.amountCents), text(l.way), text(l.ref ?? ''), text(l.witnessed ?? ''), amount(l.runningCents)]),
    [],
    ['Total', amount(input.totalCents)],
  ];
  return rows.map((r) => r.join(',')).join('\r\n') + '\r\n';
}
