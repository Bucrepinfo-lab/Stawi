'use client';

import { useMemo, useState } from 'react';
import {
  addBizDays, bizBrief, bizRange, bizStatement, bizTaxHints, daysOf, dayHighlights, EXPENSE_LABEL, previousRange, reconcileRanges, salesByDay,
  type BizEntry, type BizItem, type BizPeriod, type BizStatement, type DayRange, type ExpenseCategory,
} from '@stawi/core';
import { CHANNEL, dmy, downloadText, kes, type Lang } from './biz-ui';

const PERIODS: { id: BizPeriod; en: string; sw: string; ended: string }[] = [
  { id: 'day', en: 'Day', sw: 'Siku', ended: 'Day ended' },
  { id: 'week', en: 'Week', sw: 'Wiki', ended: 'Week ended' },
  { id: 'month', en: 'Month', sw: 'Mwezi', ended: 'Month ended' },
  { id: 'year', en: 'Year', sw: 'Mwaka', ended: 'Year ended' },
];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function rangeLabel(r: DayRange, p: BizPeriod) {
  if (p === 'day') return dmy(r.from);
  if (p === 'month') return `${MONTHS[Number(r.from.slice(5, 7)) - 1]} ${r.from.slice(0, 4)}`;
  if (p === 'year') return r.from.slice(0, 4);
  return `${dmy(r.from)} to ${dmy(r.to)}`;
}

/** The parts a period is made of: days of a week or month, months of a year. */
function partsOf(r: DayRange, p: BizPeriod): DayRange[] {
  if (p === 'day') return [];
  if (p === 'year') return MONTHS.map((_, i) => bizRange(`${r.from.slice(0, 4)}-${String(i + 1).padStart(2, '0')}-01`, 'month'));
  return daysOf(r).map((d) => ({ from: d, to: d }));
}

/**
 * Statements (owner 28/11/26): the day, week, month and year ended, from the
 * same books, so they always agree. Plain words on top; the full profit and
 * loss, the money in each place and what is owed underneath; and the proof
 * that the parts add up to the whole.
 */
export function Reports({ entries, items, today, branchName, branchId, closedDays, seeProfit, vatRegistered, lang }: {
  entries: BizEntry[];
  items: BizItem[];
  today: string;
  branchName: string;
  branchId?: string;
  closedDays: { branchId: string; day: string }[];
  seeProfit: boolean;
  vatRegistered: boolean;
  lang: Lang;
}) {
  const [period, setPeriod] = useState<BizPeriod>('day');
  const [ref, setRef] = useState(today);
  const range = bizRange(ref, period);
  const st = useMemo(() => bizStatement(entries, range, branchId), [entries, range.from, range.to, branchId]);
  const prev = useMemo(() => bizStatement(entries, previousRange(ref, period), branchId), [entries, ref, period, branchId]);
  const brief = bizBrief(st, prev, period, period === 'day' && ref === today ? 'today' : `in ${rangeLabel(range, period)}`);
  const parts = partsOf(range, period).filter((r) => r.from <= today);
  const partRows = useMemo(() => parts.map((r) => ({ r, s: bizStatement(entries, r, branchId) })), [entries, range.from, period, branchId]);
  const gaps = useMemo(() => (parts.length ? reconcileRanges(entries, { from: range.from, to: parts.at(-1)!.to }, parts, branchId) : []), [entries, range.from, period, branchId]);
  const yearSales = useMemo(() => bizStatement(entries, bizRange(ref, 'year'), branchId).salesCents, [entries, ref, branchId]);
  const taxes = bizTaxHints(st, { vatRegistered, yearSalesCents: yearSales });
  const highlights = period === 'day' && items.length ? dayHighlights(entries, items, ref, branchId) : null;
  const bars = period === 'week' || period === 'month' ? salesByDay(entries, range, branchId) : period === 'year' ? partRows.map((p) => ({ day: p.r.from, cents: p.s.salesCents })) : [];
  const maxBar = Math.max(1, ...bars.map((b) => b.cents));
  const step = (dir: 1 | -1) => {
    const next = dir === 1 ? addBizDays(range.to, 1) : addBizDays(range.from, -1);
    if (next <= today) setRef(next);
  };
  const closedSet = new Set(closedDays.filter((c) => !branchId || c.branchId === branchId).map((c) => c.day));

  function download() {
    const rows: (string | number)[][] = [
      [`${PERIODS.find((p) => p.id === period)!.ended}: ${rangeLabel(range, period)}`, branchName],
      [],
      ['Sales', (st.salesCents / 100).toFixed(2)],
      ...(['CASH', 'MPESA', 'BANK', 'CREDIT'] as const).map((c) => [`  of which ${CHANNEL[c].en}`, (st.salesBy[c] / 100).toFixed(2)]),
      ['Cost of goods sold', (st.costOfGoodsCents / 100).toFixed(2)],
      ['Gross profit', (st.grossProfitCents / 100).toFixed(2)],
      ['Other income', (st.otherIncomeCents / 100).toFixed(2)],
      ...Object.entries(st.expensesBy).map(([c, v]) => [EXPENSE_LABEL[c as ExpenseCategory].en, ((v ?? 0) / 100).toFixed(2)]),
      ['Goods lost or damaged', (st.lossesCents / 100).toFixed(2)],
      ['Cash short (+) / over (-)', (st.cashDiffCents / 100).toFixed(2)],
      ['Net profit', (st.netProfitCents / 100).toFixed(2)],
      [],
      ['Money', 'Opening', 'In', 'Out', 'Closing'],
      ...(['CASH', 'MPESA', 'BANK'] as const).map((c) => [CHANNEL[c].en, ...[st.money[c].openingCents, st.money[c].inCents, st.money[c].outCents, st.money[c].closingCents].map((x) => (x / 100).toFixed(2))]),
      [],
      ['Customers owe us', (st.customersOweCents / 100).toFixed(2)],
      ['We owe suppliers', (st.weOweCents / 100).toFixed(2)],
      ['Stock value', (st.stockValueCents / 100).toFixed(2)],
      ['Owner took out', (st.ownerOutCents / 100).toFixed(2)],
    ];
    downloadText(`statement-${period}-${range.from}.csv`, rows.map((r) => r.map((c) => (/[",]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(',')).join('\n'));
  }

  return (
    <section className="bk-reports" aria-label="Statements">
      <div className="bk-period" role="tablist" aria-label="Period">
        {PERIODS.map((p) => (
          <button key={p.id} type="button" role="tab" aria-selected={period === p.id} onClick={() => { setPeriod(p.id); setRef(today); }}>{p[lang]}</button>
        ))}
      </div>
      <div className="bk-stepper">
        <button type="button" aria-label="Earlier" onClick={() => step(-1)}>‹</button>
        <strong>{PERIODS.find((p) => p.id === period)!.ended}: {rangeLabel(range, period)}</strong>
        <button type="button" aria-label="Later" disabled={range.to >= today} onClick={() => step(1)}>›</button>
      </div>

      <ul className="bk-brief">
        {brief.map((b) => <li key={b.text} className={b.tone}>{b.text}</li>)}
      </ul>

      {highlights && (highlights.busiest.length + highlights.runningOut.length + highlights.notMoving.length + highlights.belowCost.length > 0) && (
        <div className="bk-highlights">
          {highlights.busiest.length > 0 && <div><h4>Busiest today</h4><ol>{highlights.busiest.map((b) => <li key={b.name}><span>{b.name}</span><span className="mono">{b.units} · {kes(b.salesCents)}</span></li>)}</ol></div>}
          {highlights.runningOut.length > 0 && <div className="warn"><h4>Running out</h4><p>{highlights.runningOut.join(', ')}</p></div>}
          {highlights.notMoving.length > 0 && <div><h4>Not moving</h4><p>{highlights.notMoving.map((n) => `${n.name} (${n.days} days, ${kes(n.valueCents)} on the shelf)`).join('; ')}</p></div>}
          {highlights.belowCost.length > 0 && <div className="bad"><h4>Sold below cost</h4><p>{highlights.belowCost.join(', ')}</p></div>}
        </div>
      )}

      <div className="bk-kpis">
        <div><span>Sales</span><b className="mono">{kes(st.salesCents)}</b></div>
        {seeProfit && <div><span>Profit</span><b className={`mono ${st.netProfitCents < 0 ? 'neg' : ''}`}>{kes(st.netProfitCents)}</b><small>{st.netMarginPct}% of sales</small></div>}
        <div><span>Cash at close</span><b className="mono">{kes(st.money.CASH.closingCents)}</b></div>
        <div><span>M-Pesa at close</span><b className="mono">{kes(st.money.MPESA.closingCents)}</b></div>
      </div>

      {bars.length > 0 && (
        <div className="bk-bars" aria-label="Sales by day">
          {bars.map((b) => (
            <div key={b.day} title={`${period === 'year' ? MONTHS[Number(b.day.slice(5, 7)) - 1] : dmy(b.day)}: ${kes(b.cents)}`}>
              <i style={{ height: `${Math.max(2, Math.round((b.cents / maxBar) * 100))}%` }} />
              <span>{period === 'year' ? MONTHS[Number(b.day.slice(5, 7)) - 1]!.slice(0, 1) : b.day.slice(8, 10)}</span>
            </div>
          ))}
        </div>
      )}

      {seeProfit && (
        <details className="bk-block" open>
          <summary>Profit and loss</summary>
          <table className="bk-table">
            <tbody>
              <tr><td>Sales</td><td className="mono">{kes(st.salesCents)}</td></tr>
              {(['CASH', 'MPESA', 'BANK', 'CREDIT'] as const).filter((c) => st.salesBy[c]).map((c) => <tr key={c} className="sub"><td>{CHANNEL[c][lang]}</td><td className="mono">{kes(st.salesBy[c])}</td></tr>)}
              <tr><td>Cost of the goods sold</td><td className="mono">− {kes(st.costOfGoodsCents)}</td></tr>
              <tr className="total"><td>Gross profit <small>({st.grossMarginPct}%)</small></td><td className="mono">{kes(st.grossProfitCents)}</td></tr>
              {st.otherIncomeCents > 0 && <tr><td>Other income</td><td className="mono">{kes(st.otherIncomeCents)}</td></tr>}
              {Object.entries(st.expensesBy).map(([c, v]) => <tr key={c}><td>{EXPENSE_LABEL[c as ExpenseCategory][lang]}</td><td className="mono">− {kes(v ?? 0)}</td></tr>)}
              {st.lossesCents > 0 && <tr><td>Goods lost or damaged</td><td className="mono">− {kes(st.lossesCents)}</td></tr>}
              {st.cashDiffCents !== 0 && <tr><td>{st.cashDiffCents > 0 ? 'Cash short at count' : 'Cash over at count'}</td><td className="mono">{st.cashDiffCents > 0 ? '− ' : ''}{kes(Math.abs(st.cashDiffCents))}</td></tr>}
              <tr className="grand"><td>Net profit</td><td className="mono">{kes(st.netProfitCents)}</td></tr>
            </tbody>
          </table>
        </details>
      )}

      <details className="bk-block" open={!seeProfit}>
        <summary>Money: from opening to closing</summary>
        <table className="bk-table">
          <thead><tr><th /><th>Opening</th><th>In</th><th>Out</th><th>Closing</th></tr></thead>
          <tbody>
            {(['CASH', 'MPESA', 'BANK'] as const).map((c) => (
              <tr key={c}><td>{CHANNEL[c][lang]}</td>{[st.money[c].openingCents, st.money[c].inCents, st.money[c].outCents, st.money[c].closingCents].map((x, i) => <td key={i} className="mono">{kes(x)}</td>)}</tr>
            ))}
          </tbody>
        </table>
        <p className="bk-note">Opening + in − out = closing, for each place.</p>
      </details>

      {seeProfit && (
        <details className="bk-block">
          <summary>What is owed, stock and the owner</summary>
          <table className="bk-table">
            <tbody>
              <tr><td>Customers owe you</td><td className="mono">{kes(st.customersOweCents)}</td></tr>
              <tr><td>You owe suppliers</td><td className="mono">{kes(st.weOweCents)}</td></tr>
              <tr><td>Goods in stock (at cost)</td><td className="mono">{kes(st.stockValueCents)}</td></tr>
              <tr><td>Owner took out</td><td className="mono">{kes(st.ownerOutCents)}</td></tr>
              {st.ownerInCents > 0 && <tr><td>Owner put in</td><td className="mono">{kes(st.ownerInCents)}</td></tr>}
            </tbody>
          </table>
        </details>
      )}

      {parts.length > 0 && (
        <details className="bk-block">
          <summary>{period === 'year' ? 'Month by month' : 'Day by day'} {gaps.length === 0 ? <span className="bk-tick">These add up</span> : <span className="bk-cross">Check needed</span>}</summary>
          <table className="bk-table">
            <thead><tr><th>{period === 'year' ? 'Month' : 'Day'}</th><th>Sales</th>{seeProfit && <th>Profit</th>}{period !== 'year' && <th>Closed</th>}</tr></thead>
            <tbody>
              {partRows.map(({ r, s }) => (
                <tr key={r.from}>
                  <td>{period === 'year' ? MONTHS[Number(r.from.slice(5, 7)) - 1] : dmy(r.from)}</td>
                  <td className="mono">{kes(s.salesCents)}</td>
                  {seeProfit && <td className={`mono ${s.netProfitCents < 0 ? 'neg' : ''}`}>{kes(s.netProfitCents)}</td>}
                  {period !== 'year' && <td>{closedSet.has(r.from) ? 'Yes' : r.from < today && s.entries ? 'Not yet' : ''}</td>}
                </tr>
              ))}
            </tbody>
          </table>
          {gaps.length > 0 && <p className="bk-error">{gaps.join('; ')}</p>}
        </details>
      )}

      {seeProfit && taxes.length > 0 && (
        <details className="bk-block">
          <summary>Tax pointers (indicative)</summary>
          <ul className="bk-tax">
            {taxes.map((t) => <li key={t.code}><strong>{t.label}: <span className="mono">{kes(t.cents)}</span></strong><span>{t.note}</span></li>)}
          </ul>
          <p className="bk-note">Stawi does not file tax or issue eTIMS invoices. These figures help you and your accountant check; confirm with KRA.</p>
        </details>
      )}

      <button type="button" className="bk-ghost" onClick={download}>Download this statement (CSV)</button>
    </section>
  );
}

export type { BizStatement };
