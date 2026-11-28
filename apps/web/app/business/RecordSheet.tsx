'use client';

import { useMemo, useState } from 'react';
import { EXPENSE_CATEGORIES, EXPENSE_LABEL, type BizBranch, type BizChannel, type BizItem, type BizKind, type BizOpening, type ExpenseCategory } from '@stawi/core';
import { Picture } from '@/components/Pictures';
import { recordBizEntryAction } from './actions';
import { CAN_BE_CREDIT, CHANNEL, ETIMS_KINDS, KIND, OPENING_LABEL, USES_ITEM, kes, toCents, type Lang } from './biz-ui';

/**
 * One form for every kind of entry (owner 28/11/26). It asks only what that
 * kind needs, in the order a person thinks: what, how much, how paid. With an
 * item chosen the amount fills itself from the price.
 */
export function RecordSheet({ groupId, kind, branches, branchId, items, parties, today, canPickDay, lang, preset, onDone, onCancel }: {
  groupId: string;
  kind: BizKind;
  branches: BizBranch[];
  branchId: string;
  items: BizItem[];
  parties: string[];
  today: string;
  canPickDay: boolean;
  lang: Lang;
  preset?: { party?: string; amountCents?: number };
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const k = KIND[kind];
  const moneyOnly = !CAN_BE_CREDIT.includes(kind);
  const [branch, setBranch] = useState(branchId);
  const [itemId, setItemId] = useState('');
  const [qty, setQty] = useState('1');
  const [amount, setAmount] = useState(preset?.amountCents ? String(preset.amountCents / 100) : '');
  const [touchedAmount, setTouchedAmount] = useState(!!preset?.amountCents);
  const [channel, setChannel] = useState<BizChannel>('CASH');
  const [toChannel, setToChannel] = useState<BizChannel>('BANK');
  const [party, setParty] = useState(preset?.party ?? '');
  const [category, setCategory] = useState<ExpenseCategory | ''>('');
  const [opening, setOpening] = useState<BizOpening>('CASH');
  const [etims, setEtims] = useState(false);
  const [note, setNote] = useState('');
  const [day, setDay] = useState(today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const item = items.find((i) => i.id === itemId);
  const showItem = items.length > 0 && USES_ITEM.includes(kind) && (kind !== 'OPENING' || opening === 'STOCK');
  const lossByItem = kind === 'STOCK_LOSS' && !!item;
  const needsParty = (CAN_BE_CREDIT.includes(kind) && channel === 'CREDIT') || kind === 'DEBT_PAID_IN' || kind === 'DEBT_PAID_OUT' || (kind === 'OPENING' && (opening === 'DEBTORS' || opening === 'CREDITORS'));
  const autoAmount = kind === 'SALE' && item && !touchedAmount ? Math.round(item.priceCents * (Number(qty) || 0)) : null;
  const shownAmount = autoAmount !== null ? String(autoAmount / 100) : amount;

  const channels: BizChannel[] = moneyOnly || kind === 'OPENING' ? ['CASH', 'MPESA', 'BANK'] : ['CASH', 'MPESA', 'BANK', 'CREDIT'];
  const partyLabel = kind === 'SALE' || kind === 'DEBT_PAID_IN' || opening === 'DEBTORS' ? 'Customer’s name' : 'Supplier’s name';
  const amountLabel = kind === 'STOCK_COUNT' ? 'Value of the goods you counted (KES)' : kind === 'OPENING' ? 'How much (KES)' : kind === 'STOCK_LOSS' ? 'Value lost (KES)' : 'Amount (KES)';

  const preview = useMemo(() => {
    const c = toCents(shownAmount);
    return Number.isFinite(c) && c > 0 ? kes(c) : null;
  }, [shownAmount]);

  async function save() {
    if (busy) return;
    setError(null);
    const cents = lossByItem ? 1 : toCents(shownAmount);
    if (!lossByItem && (!Number.isFinite(cents) || cents <= 0)) { setError('Enter the amount.'); return; }
    if (showItem && item && !(Number(qty) > 0)) { setError('Enter how many.'); return; }
    if (kind === 'EXPENSE' && !category) { setError('Choose what the money was for.'); return; }
    if (needsParty && !party.trim()) { setError(`Write the ${partyLabel.toLowerCase().replace('’s name', '')}’s name.`); return; }
    setBusy(true);
    const res = await recordBizEntryAction({
      groupId, branchId: branch, kind, amountCents: cents,
      channel: kind === 'STOCK_LOSS' || kind === 'STOCK_COUNT' || kind === 'OPENING' ? 'CASH' : channel,
      toChannel: kind === 'MOVE' ? toChannel : undefined,
      day, itemId: showItem && item ? item.id : undefined, qty: showItem && item ? Number(qty) : undefined,
      party: needsParty ? party : undefined, category: kind === 'EXPENSE' ? category : undefined,
      opening: kind === 'OPENING' ? opening : undefined, note: note || undefined, etims: ETIMS_KINDS.includes(kind) ? etims : undefined,
    }).catch(() => ({ ok: false, error: 'Nothing was saved. Check your connection and try again.' }));
    setBusy(false);
    if (!res.ok) { setError(res.error ?? 'Not saved.'); return; }
    onDone(`${k.en}: ${lossByItem ? `${qty} ${item!.unit}` : kes(cents)} saved.`);
  }

  return (
    <form className="bk-sheet" onSubmit={(e) => { e.preventDefault(); void save(); }} aria-label={k.en}>
      <div className="bk-sheet-head">
        <Picture name={k.pic} size={40} />
        <div>
          <h2 className="display">{lang === 'sw' ? k.sw : k.en}</h2>
          {k.help && <p>{k.help}</p>}
        </div>
      </div>

      {kind === 'OPENING' && (
        <div className="bk-chips" role="radiogroup" aria-label="What is it">
          {(Object.keys(OPENING_LABEL) as BizOpening[]).map((o) => (
            <button key={o} type="button" role="radio" aria-checked={opening === o} className="bk-chip" onClick={() => setOpening(o)}>{OPENING_LABEL[o][lang]}</button>
          ))}
        </div>
      )}

      {showItem && (
        <div className="bk-row2">
          <label className="bk-field">
            <span>{kind === 'SALE' ? 'What did you sell?' : 'Which item?'}</span>
            <select value={itemId} onChange={(e) => { setItemId(e.target.value); setTouchedAmount(false); }}>
              <option value="">{kind === 'STOCK_LOSS' ? 'Not one item (write the value)' : 'Not from my list'}</option>
              {items.map((i) => <option key={i.id} value={i.id}>{i.name}{i.priceCents ? ` · ${kes(i.priceCents)}` : ''}</option>)}
            </select>
          </label>
          {item && (
            <label className="bk-field bk-qty">
              <span>How many ({item.unit})</span>
              <input inputMode="decimal" value={qty} onChange={(e) => { setQty(e.target.value.replace(/[^\d.]/g, '')); }} />
            </label>
          )}
        </div>
      )}

      {kind === 'EXPENSE' && (
        <div className="bk-chips" role="radiogroup" aria-label="What was it for">
          {EXPENSE_CATEGORIES.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={category === c} className="bk-chip" onClick={() => setCategory(c)}>{EXPENSE_LABEL[c][lang]}</button>
          ))}
        </div>
      )}

      {lossByItem ? (
        <p className="bk-note">Stawi works out the value from what you paid for it.</p>
      ) : (
        <label className="bk-field bk-amount">
          <span>{amountLabel}</span>
          <input inputMode="decimal" autoFocus={!showItem} value={shownAmount} placeholder="0" onChange={(e) => { setTouchedAmount(true); setAmount(e.target.value.replace(/[^\d.,]/g, '')); }} />
          {preview && <small>{preview}{autoAmount !== null ? ` (${qty} × ${kes(item!.priceCents)})` : ''}</small>}
        </label>
      )}

      {kind !== 'STOCK_LOSS' && kind !== 'STOCK_COUNT' && kind !== 'OPENING' && (
        <fieldset className="bk-pay">
          <legend>{kind === 'MOVE' ? 'From' : kind === 'SALE' || kind === 'DEBT_PAID_IN' || kind === 'OTHER_INCOME' || kind === 'OWNER_IN' ? 'How were you paid?' : 'How did you pay?'}</legend>
          <div className="bk-chips">
            {channels.map((c) => (
              <button key={c} type="button" aria-pressed={channel === c} className={`bk-chip${c === 'CREDIT' ? ' credit' : ''}`} onClick={() => setChannel(c)}>{CHANNEL[c][lang]}</button>
            ))}
          </div>
        </fieldset>
      )}
      {kind === 'MOVE' && (
        <fieldset className="bk-pay">
          <legend>To</legend>
          <div className="bk-chips">
            {(['CASH', 'MPESA', 'BANK'] as BizChannel[]).filter((c) => c !== channel).map((c) => (
              <button key={c} type="button" aria-pressed={toChannel === c} className="bk-chip" onClick={() => setToChannel(c)}>{CHANNEL[c][lang]}</button>
            ))}
          </div>
        </fieldset>
      )}

      {needsParty && (
        <label className="bk-field">
          <span>{partyLabel}</span>
          <input value={party} list="bk-parties" maxLength={80} onChange={(e) => setParty(e.target.value)} />
          <datalist id="bk-parties">{parties.map((p) => <option key={p} value={p} />)}</datalist>
        </label>
      )}

      {ETIMS_KINDS.includes(kind) && (
        <label className="bk-check">
          <input type="checkbox" checked={etims} onChange={(e) => setEtims(e.target.checked)} />
          <span>The supplier gave an eTIMS invoice <small>(KRA counts the cost for tax only with one)</small></span>
        </label>
      )}

      <details className="bk-more">
        <summary>More: note{canPickDay ? ', another day' : ''}{branches.length > 1 ? ', branch' : ''}</summary>
        <label className="bk-field">
          <span>Note (optional)</span>
          <input value={note} maxLength={160} onChange={(e) => setNote(e.target.value)} />
        </label>
        {canPickDay && (
          <label className="bk-field">
            <span>Day</span>
            <input type="date" value={day} max={today} onChange={(e) => setDay(e.target.value || today)} />
          </label>
        )}
        {branches.length > 1 && (
          <label className="bk-field">
            <span>Branch</span>
            <select value={branch} onChange={(e) => setBranch(e.target.value)}>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}{b.town ? `, ${b.town}` : ''}</option>)}
            </select>
          </label>
        )}
      </details>

      {error && <p className="bk-error" role="alert">{error}</p>}
      <div className="bk-actions">
        <button type="submit" className="bk-save" disabled={busy}>{busy ? 'Saving…' : lang === 'sw' ? 'Hifadhi' : 'Save'}</button>
        <button type="button" className="bk-ghost" onClick={onCancel} disabled={busy}>{lang === 'sw' ? 'Ghairi' : 'Cancel'}</button>
      </div>
    </form>
  );
}
