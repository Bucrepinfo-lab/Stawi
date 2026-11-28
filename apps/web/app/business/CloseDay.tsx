'use client';

import { useState } from 'react';
import { closeDay, CLOSE_TOLERANCE_CENTS, type BizBranch, type BizEntry } from '@stawi/core';
import { Picture } from '@/components/Pictures';
import { closeBizDayAction } from './actions';
import { CHANNEL, dmy, kes, toCents, type Lang } from './biz-ui';

/**
 * Close the day (owner 28/11/26). Count first, then compare: the person writes
 * what is really in the till, on M-Pesa and in the bank before seeing what the
 * books expect (a "blind count", so the count is honest). Any difference is
 * written down as short or over, and the day is locked.
 */
export function CloseDay({ groupId, branches, branchId, entries, day, closedDays, lang, onDone, onCancel }: {
  groupId: string;
  branches: BizBranch[];
  branchId: string;
  entries: BizEntry[];
  day: string;
  closedDays: { branchId: string; day: string }[];
  lang: Lang;
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const [branch, setBranch] = useState(branchId);
  const [cash, setCash] = useState('');
  const [mpesa, setMpesa] = useState('');
  const [bank, setBank] = useState('');
  const [compared, setCompared] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const already = closedDays.some((c) => c.branchId === branch && c.day === day);
  const counted = {
    CASH: cash.trim() === '' ? undefined : toCents(cash),
    MPESA: mpesa.trim() === '' ? undefined : toCents(mpesa),
    BANK: bank.trim() === '' ? undefined : toCents(bank),
  };
  const result = closeDay(entries, { branchId: branch, day, counted });

  async function confirm() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await closeBizDayAction({ groupId, branchId: branch, day, counted }).catch(() => ({ ok: false, error: 'Nothing was saved. Check your connection and try again.' }));
    setBusy(false);
    if (!res.ok) { setError(res.error ?? 'Not closed.'); return; }
    onDone(result.allMatch ? `Day ${dmy(day)} closed. The money matches the books.` : `Day ${dmy(day)} closed. The difference is written in the books.`);
  }

  if (already) {
    return (
      <div className="bk-sheet">
        <p className="bk-note">{dmy(day)} is already closed for this branch.</p>
        <div className="bk-actions"><button type="button" className="bk-ghost" onClick={onCancel}>Back</button></div>
      </div>
    );
  }

  return (
    <div className="bk-sheet" aria-label="Close the day">
      <div className="bk-sheet-head">
        <Picture name="scales" size={40} />
        <div>
          <h2 className="display">{lang === 'sw' ? 'Funga siku' : 'Close the day'} · {dmy(day)}</h2>
          {branches.length > 1 && <p><b>{branches.find((b) => b.id === branch)?.name}</b> only. Each branch counts its own till.</p>}
          <p>Count the money first. Then Stawi shows what the books expected.</p>
        </div>
      </div>
      {branches.length > 1 && (
        <label className="bk-field">
          <span>Branch</span>
          <select value={branch} onChange={(e) => { setBranch(e.target.value); setCompared(false); }}>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
      )}
      <label className="bk-field bk-amount">
        <span>Cash in the till now (KES)</span>
        <input inputMode="decimal" value={cash} onChange={(e) => { setCash(e.target.value.replace(/[^\d.,]/g, '')); setCompared(false); }} placeholder="Count the notes and coins" />
      </label>
      <div className="bk-row2">
        <label className="bk-field">
          <span>M-Pesa balance (KES)</span>
          <input inputMode="decimal" value={mpesa} onChange={(e) => { setMpesa(e.target.value.replace(/[^\d.,]/g, '')); setCompared(false); }} placeholder="Optional" />
        </label>
        <label className="bk-field">
          <span>Bank balance (KES)</span>
          <input inputMode="decimal" value={bank} onChange={(e) => { setBank(e.target.value.replace(/[^\d.,]/g, '')); setCompared(false); }} placeholder="Optional" />
        </label>
      </div>

      {!compared ? (
        <div className="bk-actions">
          <button type="button" className="bk-save" disabled={cash.trim() === '' || !Number.isFinite(counted.CASH ?? NaN)} onClick={() => setCompared(true)}>Compare with the books</button>
          <button type="button" className="bk-ghost" onClick={onCancel}>Cancel</button>
        </div>
      ) : (
        <>
          <table className="bk-table bk-compare">
            <thead><tr><th>Where</th><th>Books expect</th><th>You counted</th><th>Difference</th></tr></thead>
            <tbody>
              {result.differences.map((d) => (
                <tr key={d.channel} className={Math.abs(d.diffCents) <= CLOSE_TOLERANCE_CENTS ? 'ok' : d.diffCents < 0 ? 'short' : 'over'}>
                  <td>{CHANNEL[d.channel][lang]}</td>
                  <td className="mono">{kes(d.expectedCents)}</td>
                  <td className="mono">{kes(d.countedCents)}</td>
                  <td className="mono">{d.diffCents === 0 ? 'Matches' : `${d.diffCents < 0 ? 'Short' : 'Over'} ${kes(Math.abs(d.diffCents))}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {result.allMatch ? (
            <p className="bk-good">The money matches the books. Well done.</p>
          ) : (
            <p className="bk-warn">There is a difference. Before closing, check: a sale not written down, change given wrongly, money taken out without a note, an M-Pesa payment not yet in. If you still close, the difference is written as {result.differences.some((d) => d.diffCents < 0) ? 'cash short' : 'cash over'} so the books match the money.</p>
          )}
          {error && <p className="bk-error" role="alert">{error}</p>}
          <div className="bk-actions">
            <button type="button" className="bk-save" disabled={busy} onClick={() => void confirm()}>{busy ? 'Closing…' : 'Close and lock this day'}</button>
            <button type="button" className="bk-ghost" disabled={busy} onClick={() => setCompared(false)}>Count again</button>
          </div>
        </>
      )}
    </div>
  );
}
