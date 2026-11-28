'use client';

import { useMemo, useState } from 'react';
import {
  balanceSheet, bizRange, bizDaysBetween, branchReport, generalLedgerCsv, itemInsights, moneyOwed, reversedIds, trialBalance, trialBalanceCsv,
  ITEM_MOVEMENT_LABEL, RISK_LABEL, EXPENSE_LABEL,
  type BizBranch, type BizEntry, type BizItem, type BizPeriod, type ItemMovement,
} from '@stawi/core';
import { addBizStaffAction, removeBizStaffAction, reverseBizEntryAction, saveBizBranchAction, saveBizItemAction } from './actions';
import { CHANNEL, KIND, dmy, downloadText, kes, toCents, type Lang } from './biz-ui';

type Done = (message: string, tone?: 'success' | 'error') => void;

// ───────────────────────────── Items ─────────────────────────────

const FILTERS: { id: 'all' | 'risk' | ItemMovement; en: string }[] = [
  { id: 'all', en: 'All' }, { id: 'risk', en: 'Needs attention' }, { id: 'fast', en: 'Fast-going' }, { id: 'slow', en: 'Slow' }, { id: 'stagnant', en: 'Not moving' },
];

export function ItemsPanel({ groupId, entries, items, today, branchId, manage, lang, onDone }: {
  groupId: string; entries: BizEntry[]; items: BizItem[]; today: string; branchId?: string; manage: boolean; lang: Lang; onDone: Done;
}) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all');
  const [adding, setAdding] = useState(items.length === 0);
  const [form, setForm] = useState({ name: '', unit: 'piece', price: '', reorderAt: '', service: false });
  const [busy, setBusy] = useState(false);
  const insights = useMemo(() => itemInsights(entries, items, today, { branchId }), [entries, items, today, branchId]);
  const shown = insights.filter((i) => filter === 'all' || (filter === 'risk' ? i.risks.length > 0 : i.movement === filter));
  const count = (id: (typeof FILTERS)[number]['id']) => (id === 'all' ? insights.length : id === 'risk' ? insights.filter((i) => i.risks.length).length : insights.filter((i) => i.movement === id).length);

  async function add() {
    if (busy) return;
    setBusy(true);
    const res = await saveBizItemAction({ groupId, name: form.name, unit: form.unit, priceCents: toCents(form.price || '0'), reorderAt: Number(form.reorderAt || 0), service: form.service }).catch(() => ({ ok: false, error: 'Not saved. Try again.' }));
    setBusy(false);
    if (!res.ok) { onDone(res.error ?? 'Not saved.', 'error'); return; }
    setForm({ name: '', unit: form.unit, price: '', reorderAt: '', service: false });
    onDone(`${form.name} added. Now write the stock you have with "I bought stock" or "What I have today".`);
  }

  return (
    <section className="bk-panel" aria-label="Items">
      <div className="bk-filters" role="tablist">
        {FILTERS.map((f) => <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)}>{f.en} <small>{count(f.id)}</small></button>)}
      </div>
      <ul className="bk-items">
        {shown.map((i) => (
          <li key={i.item.id} className={`mv-${i.movement}`}>
            <div className="bk-item-top">
              <strong>{i.item.name}</strong>
              <span className={`bk-mv mv-${i.movement}`}>{ITEM_MOVEMENT_LABEL[i.movement][lang]}</span>
              {i.risks.map((r) => <span key={r} className="bk-risk">{RISK_LABEL[r][lang]}</span>)}
            </div>
            <dl>
              {!i.item.service && <div><dt>In stock</dt><dd className="mono">{i.qty} {i.item.unit}</dd></div>}
              <div><dt>Sold (30 days)</dt><dd className="mono">{i.unitsSold} · {kes(i.salesCents)}</dd></div>
              {manage && <div><dt>Profit</dt><dd className={`mono ${i.profitCents < 0 ? 'neg' : ''}`}>{kes(i.profitCents)} <small>{i.marginPct}%</small></dd></div>}
              {i.daysLeft !== null && <div><dt>Lasts about</dt><dd className="mono">{i.daysLeft} days</dd></div>}
              {i.daysSinceSale !== null && i.daysSinceSale > 0 && <div><dt>Last sold</dt><dd className="mono">{i.daysSinceSale} days ago</dd></div>}
              <div><dt>Price</dt><dd className="mono">{kes(i.item.priceCents)}{manage && i.avgCostCents ? <small> · cost {kes(i.avgCostCents)}</small> : null}</dd></div>
            </dl>
            <p className="bk-advice">{i.advice}</p>
          </li>
        ))}
        {shown.length === 0 && <li className="bk-empty">{items.length ? 'No items here.' : 'No items yet. Add the goods you sell, with their price.'}</li>}
      </ul>
      {manage && (adding ? (
        <form className="bk-sheet" onSubmit={(e) => { e.preventDefault(); void add(); }}>
          <h3>Add an item</h3>
          <div className="bk-row2">
            <label className="bk-field"><span>Name</span><input value={form.name} maxLength={60} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sugar 2kg" /></label>
            <label className="bk-field"><span>Sold by the</span><input value={form.unit} maxLength={20} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="piece, kg, packet" /></label>
          </div>
          <div className="bk-row2">
            <label className="bk-field"><span>Selling price (KES)</span><input inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value.replace(/[^\d.,]/g, '') })} /></label>
            <label className="bk-field"><span>Red line: alert me when only this many are left</span><input inputMode="numeric" value={form.reorderAt} onChange={(e) => setForm({ ...form, reorderAt: e.target.value.replace(/\D/g, '') })} placeholder="e.g. 5" /></label>
          </div>
          <label className="bk-check"><input type="checkbox" checked={form.service} onChange={(e) => setForm({ ...form, service: e.target.checked })} /><span>This is a service (a haircut, a repair): no stock</span></label>
          <div className="bk-actions"><button className="bk-save" disabled={busy || !form.name.trim()}>Add item</button><button type="button" className="bk-ghost" onClick={() => setAdding(false)}>Close</button></div>
        </form>
      ) : <button type="button" className="bk-ghost" onClick={() => setAdding(true)}>＋ Add an item</button>)}
      <p className="bk-note">Fast-going: sold on at least half the days. Not moving: nothing sold for 30 days. Running out: under 4 days left at the recent pace.</p>
    </section>
  );
}

// ───────────────────────────── Money owed ─────────────────────────────

export function OwedPanel({ entries, today, branchId, onPay }: { entries: BizEntry[]; today: string; branchId?: string; onPay: (side: 'in' | 'out', party: string, cents: number) => void }) {
  const customers = moneyOwed(entries, 'CUSTOMERS', branchId);
  const suppliers = moneyOwed(entries, 'SUPPLIERS', branchId);
  const [copied, setCopied] = useState<string | null>(null);
  const reminder = (p: { party: string; cents: number }) => `Hello ${p.party}, a kind reminder: the balance on your account with us is ${kes(p.cents)}. Thank you.`;
  async function copy(p: { party: string; cents: number }) {
    try { await navigator.clipboard.writeText(reminder(p)); setCopied(p.party); } catch { setCopied(null); }
  }
  const total = (l: { cents: number }[]) => l.reduce((s, x) => s + x.cents, 0);
  return (
    <section className="bk-panel" aria-label="Money owed">
      <h3>Customers owe you <span className="mono">{kes(total(customers))}</span></h3>
      <ul className="bk-owed">
        {customers.map((p) => {
          const days = bizDaysBetween(p.since, today);
          return (
            <li key={p.party} className={days > 30 ? 'old' : ''}>
              <div><strong>{p.party}</strong><small>since {dmy(p.since)} · {days} days</small></div>
              <b className="mono">{kes(p.cents)}</b>
              <div className="bk-owed-act">
                <button type="button" className="bk-chip" onClick={() => onPay('in', p.party, p.cents)}>They paid</button>
                <button type="button" className="bk-chip" onClick={() => void copy(p)}>{copied === p.party ? 'Copied' : 'Copy reminder'}</button>
              </div>
            </li>
          );
        })}
        {customers.length === 0 && <li className="bk-empty">Nobody owes you. Sales marked "Not paid yet" show here.</li>}
      </ul>
      <h3>You owe suppliers <span className="mono">{kes(total(suppliers))}</span></h3>
      <ul className="bk-owed">
        {suppliers.map((p) => (
          <li key={p.party}>
            <div><strong>{p.party}</strong><small>since {dmy(p.since)}</small></div>
            <b className="mono">{kes(p.cents)}</b>
            <div className="bk-owed-act"><button type="button" className="bk-chip" onClick={() => onPay('out', p.party, p.cents)}>I paid them</button></div>
          </li>
        ))}
        {suppliers.length === 0 && <li className="bk-empty">You owe no supplier.</li>}
      </ul>
    </section>
  );
}

// ───────────────────────────── Branches and staff ─────────────────────────────

export function BranchesPanel({ groupId, entries, branches, closes, staff, today, owner, lang, onDone }: {
  groupId: string; entries: BizEntry[]; branches: BizBranch[]; closes: { branchId: string; day: string }[];
  staff: { membershipId: string; name: string; phone: string | null; branchId: string }[]; today: string; owner: boolean; lang: Lang; onDone: Done;
}) {
  const [period, setPeriod] = useState<BizPeriod>('day');
  const report = useMemo(() => branchReport(entries, branches, bizRange(today, period), closes, today), [entries, branches, closes, today, period]);
  const [branchForm, setBranchForm] = useState({ name: '', town: '' });
  const [staffForm, setStaffForm] = useState({ name: '', phone: '', branchId: branches[0]?.id ?? '' });
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, message: string, reset?: () => void) {
    if (busy) return;
    setBusy(true);
    const res = await fn().catch(() => ({ ok: false, error: 'Not saved. Try again.' }));
    setBusy(false);
    if (!res.ok) { onDone(res.error ?? 'Not saved.', 'error'); return; }
    reset?.();
    onDone(message);
  }
  async function giveCode(phone: string | null, membershipId: string) {
    if (!phone) return;
    const res = await fetch(`/api/groups/${groupId}/join-code`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, lang }) }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setCodes((c) => ({ ...c, [membershipId]: res?.ok ? `Joining code: ${data.code}. They open Stawi, tap "My group added me — I have a joining code", enter their phone and this code, then choose a PIN.` : data.error ?? 'Could not give a code. Try again.' }));
  }

  return (
    <section className="bk-panel" aria-label="Branches">
      <div className="bk-period" role="tablist">
        {(['day', 'week', 'month', 'year'] as BizPeriod[]).map((p) => <button key={p} type="button" role="tab" aria-selected={period === p} onClick={() => setPeriod(p)}>{p === 'day' ? 'Today' : `This ${p}`}</button>)}
      </div>
      <div className="bk-scroll">
        <table className="bk-table bk-branches">
          <thead><tr><th>Branch</th><th>Sales</th><th>Profit</th><th>Cash now</th><th>Short</th><th>Last closed</th></tr></thead>
          <tbody>
            {report.rows.map((r) => (
              <tr key={r.branch.id} className={r.daysUnclosed === null || r.daysUnclosed > 1 ? 'late' : ''}>
                <td><strong>{r.branch.name}</strong>{r.branch.town && <small> {r.branch.town}</small>}</td>
                <td className="mono">{kes(r.statement.salesCents)}</td>
                <td className={`mono ${r.statement.netProfitCents < 0 ? 'neg' : ''}`}>{kes(r.statement.netProfitCents)}</td>
                <td className="mono">{kes(r.statement.money.CASH.closingCents)}</td>
                <td className={`mono ${r.shortCents ? 'neg' : ''}`}>{r.shortCents ? kes(r.shortCents) : '—'}</td>
                <td>{r.lastClosed ? `${dmy(r.lastClosed)}${r.daysUnclosed! > 1 ? ` (${r.daysUnclosed} days ago)` : ''}` : 'Never'}</td>
              </tr>
            ))}
            <tr className="grand"><td>Whole business</td><td className="mono">{kes(report.whole.salesCents)}</td><td className="mono">{kes(report.whole.netProfitCents)}</td><td className="mono">{kes(report.whole.money.CASH.closingCents)}</td><td className="mono">{report.whole.cashDiffCents > 0 ? kes(report.whole.cashDiffCents) : '—'}</td><td /></tr>
          </tbody>
        </table>
      </div>
      <p className="bk-note">A branch shaded in gold has not closed its day since yesterday.</p>

      <form className="bk-sheet" onSubmit={(e) => { e.preventDefault(); void run(() => saveBizBranchAction({ groupId, name: branchForm.name, town: branchForm.town }), `${branchForm.name} added.`, () => setBranchForm({ name: '', town: '' })); }}>
        <h3>Add a branch</h3>
        <div className="bk-row2">
          <label className="bk-field"><span>Branch name</span><input value={branchForm.name} maxLength={50} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} placeholder="e.g. Kisumu shop" /></label>
          <label className="bk-field"><span>Town</span><input value={branchForm.town} maxLength={50} onChange={(e) => setBranchForm({ ...branchForm, town: e.target.value })} placeholder="e.g. Kisumu" /></label>
        </div>
        <div className="bk-actions"><button className="bk-save" disabled={busy || !branchForm.name.trim()}>Add branch</button></div>
      </form>

      {owner && (
        <div className="bk-sheet">
          <h3>Staff</h3>
          <p className="bk-note">Staff write sales and close the day for their own branch only. They do not see other branches, costs or profit.</p>
          <ul className="bk-staff">
            {staff.map((s) => (
              <li key={s.membershipId}>
                <div><strong>{s.name}</strong><small>{branches.find((b) => b.id === s.branchId)?.name ?? 'Branch'}</small></div>
                <div className="bk-owed-act">
                  <button type="button" className="bk-chip" onClick={() => void giveCode(s.phone, s.membershipId)}>Give joining code</button>
                  <button type="button" className="bk-chip" onClick={() => void run(() => removeBizStaffAction({ groupId, membershipId: s.membershipId }), `${s.name} no longer records. Their past entries stay.`)}>Stop</button>
                </div>
                {codes[s.membershipId] && <p className="bk-note">{codes[s.membershipId]}</p>}
              </li>
            ))}
            {staff.length === 0 && <li className="bk-empty">No staff yet.</li>}
          </ul>
          <form onSubmit={(e) => { e.preventDefault(); void run(() => addBizStaffAction({ groupId, ...staffForm }), `${staffForm.name} added. Give them a joining code.`, () => setStaffForm({ ...staffForm, name: '', phone: '' })); }}>
            <div className="bk-row2">
              <label className="bk-field"><span>Name</span><input value={staffForm.name} maxLength={60} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} /></label>
              <label className="bk-field"><span>Phone</span><input inputMode="tel" value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} placeholder="07…" /></label>
            </div>
            <label className="bk-field"><span>Branch</span><select value={staffForm.branchId} onChange={(e) => setStaffForm({ ...staffForm, branchId: e.target.value })}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
            <div className="bk-actions"><button className="bk-save" disabled={busy || !staffForm.name.trim() || !staffForm.phone.trim()}>Add staff</button></div>
          </form>
        </div>
      )}
    </section>
  );
}

// ───────────────────────────── For the accountant ─────────────────────────────

export function AccountantPanel({ entries, branches, today, name }: { entries: BizEntry[]; branches: BizBranch[]; today: string; name: string }) {
  const [at, setAt] = useState(today);
  const tb = useMemo(() => trialBalance(entries, at), [entries, at]);
  const bs = useMemo(() => balanceSheet(entries, at), [entries, at]);
  const year = bizRange(at, 'year');
  const names = Object.fromEntries(branches.map((b) => [b.id, b.name]));
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
  return (
    <section className="bk-panel" aria-label="For your accountant">
      <p className="bk-note">Every entry is a balanced double entry. Nothing is deleted: corrections are reversing entries, and each entry shows who wrote it and when.</p>
      <label className="bk-field bk-at"><span>As at</span><input type="date" value={at} max={today} onChange={(e) => setAt(e.target.value || today)} /></label>
      <details className="bk-block" open>
        <summary>Trial balance {tb.balanced ? <span className="bk-tick">Balanced</span> : <span className="bk-cross">Not balanced</span>}</summary>
        <div className="bk-scroll">
          <table className="bk-table">
            <thead><tr><th>Code</th><th>Account</th><th>Debit</th><th>Credit</th></tr></thead>
            <tbody>
              {tb.rows.map((r) => <tr key={r.code}><td className="mono">{r.code}</td><td>{r.name}</td><td className="mono">{r.debitCents ? kes(r.debitCents) : ''}</td><td className="mono">{r.creditCents ? kes(r.creditCents) : ''}</td></tr>)}
              <tr className="grand"><td /><td>Total</td><td className="mono">{kes(tb.debitCents)}</td><td className="mono">{kes(tb.creditCents)}</td></tr>
            </tbody>
          </table>
        </div>
      </details>
      <details className="bk-block">
        <summary>Balance sheet {bs.balanced ? <span className="bk-tick">Balanced</span> : <span className="bk-cross">Not balanced</span>}</summary>
        <table className="bk-table">
          <tbody>
            <tr className="head"><td colSpan={2}>What the business owns</td></tr>
            {bs.assets.map((a) => <tr key={a.code}><td>{a.name}</td><td className="mono">{kes(a.cents)}</td></tr>)}
            <tr className="total"><td>Total owned</td><td className="mono">{kes(bs.totalAssetsCents)}</td></tr>
            <tr className="head"><td colSpan={2}>What it owes</td></tr>
            {bs.liabilities.map((a) => <tr key={a.code}><td>{a.name}</td><td className="mono">{kes(a.cents)}</td></tr>)}
            <tr className="head"><td colSpan={2}>The owner’s share</td></tr>
            {bs.equity.map((a) => <tr key={a.code}><td>{a.name}</td><td className="mono">{kes(a.cents)}</td></tr>)}
            <tr className="grand"><td>Owed + owner’s share</td><td className="mono">{kes(bs.totalLiabilitiesCents + bs.totalEquityCents)}</td></tr>
          </tbody>
        </table>
      </details>
      <div className="bk-downloads">
        <button type="button" className="bk-ghost" onClick={() => downloadText(`${slug}-general-ledger-${year.from.slice(0, 4)}.csv`, generalLedgerCsv(entries, { from: year.from, to: at }, names))}>General ledger, {year.from.slice(0, 4)} (CSV)</button>
        <button type="button" className="bk-ghost" onClick={() => downloadText(`${slug}-trial-balance-${at}.csv`, trialBalanceCsv(tb))}>Trial balance (CSV)</button>
      </div>
      <p className="bk-note">Opens in Excel or Google Sheets. Codes: 1000s what the business owns, 2000s what it owes, 3000s the owner, 4000s income, 5000s cost of goods, 6000s running costs.</p>
    </section>
  );
}

// ───────────────────────────── Daily book (every entry) ─────────────────────────────

export function DailyBook({ groupId, entries, items, branches, today, manage, lang, onDone }: {
  groupId: string; entries: BizEntry[]; items: BizItem[]; branches: BizBranch[]; today: string; manage: boolean; lang: Lang; onDone: Done;
}) {
  const [day, setDay] = useState(today);
  const [fixing, setFixing] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const reversed = reversedIds(entries);
  const shown = entries.filter((e) => e.day === day).slice().reverse();
  const itemName = (id?: string) => items.find((i) => i.id === id)?.name;
  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? '';

  async function fix(id: string) {
    if (busy) return;
    setBusy(true);
    const res = await reverseBizEntryAction({ groupId, entryId: id, reason, today }).catch(() => ({ ok: false, error: 'Not saved. Try again.' }));
    setBusy(false);
    if (!res.ok) { onDone(res.error ?? 'Not saved.', 'error'); return; }
    setFixing(null);
    setReason('');
    onDone('Corrected. The old entry stays in the book, marked as corrected. Now write the right one.');
  }

  return (
    <section className="bk-panel" aria-label="Daily book">
      <label className="bk-field bk-at"><span>Day</span><input type="date" value={day} max={today} onChange={(e) => setDay(e.target.value || today)} /></label>
      <ul className="bk-book">
        {shown.map((e) => {
          const isFixed = reversed.has(e.id);
          return (
            <li key={e.id} className={`${isFixed ? 'fixed' : ''}${e.reverses ? ' reversal' : ''}`}>
              <div className="bk-book-main">
                <strong>{e.reverses ? 'Correction' : KIND[e.kind][lang]}</strong>
                <span className="mono">{kes(e.amountCents)}</span>
              </div>
              <small>
                {[
                  itemName(e.itemId) && `${itemName(e.itemId)}${e.qty ? ` × ${e.qty}` : ''}`,
                  e.category && EXPENSE_LABEL[e.category][lang],
                  e.kind !== 'STOCK_LOSS' && e.kind !== 'STOCK_COUNT' && e.kind !== 'OPENING' && CHANNEL[e.channel][lang],
                  e.toChannel && `to ${CHANNEL[e.toChannel][lang]}`,
                  e.party,
                  e.note,
                  branches.length > 1 && branchName(e.branchId),
                ].filter(Boolean).join(' · ')}
              </small>
              <small className="bk-who">{e.recordedBy ?? ''}{e.recordedAt ? ` · ${new Date(e.recordedAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}` : ''}{isFixed ? ' · corrected' : ''}</small>
              {manage && !isFixed && !e.reverses && !e.id.startsWith('old-') && (fixing === e.id ? (
                <form className="bk-fix" onSubmit={(ev) => { ev.preventDefault(); void fix(e.id); }}>
                  <input value={reason} onChange={(ev) => setReason(ev.target.value)} placeholder="Why? e.g. wrong amount" maxLength={160} />
                  <button className="bk-save" disabled={busy || !reason.trim()}>Correct it</button>
                  <button type="button" className="bk-ghost" onClick={() => setFixing(null)}>Keep</button>
                </form>
              ) : <button type="button" className="bk-link" onClick={() => setFixing(e.id)}>Correct this</button>)}
            </li>
          );
        })}
        {shown.length === 0 && <li className="bk-empty">Nothing written on {dmy(day)}.</li>}
      </ul>
    </section>
  );
}
