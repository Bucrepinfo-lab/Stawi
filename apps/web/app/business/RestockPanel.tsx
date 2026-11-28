'use client';

import { useMemo, useState } from 'react';
import { itemInsights, restockList, suggestRedLine, RESTOCK_STATUS, type BizBranch, type BizEntry, type BizSupplier, type RestockItem, type RestockStatus } from '@stawi/core';
import { Picture } from '@/components/Pictures';
import type { BizBooksView } from '@/lib/biz';
import { saveBizItemAction, saveBizSupplierAction, sendRestockRequestAction, updateRestockByShopAction } from './actions';
import { dmy, type Lang } from './biz-ui';

type Done = (message: string, tone?: 'success' | 'error') => void;

/**
 * Restocking (owner 28/11/26). Red lines turn an item red when stock falls to
 * the level the owner chose; one tap asks that item's supplier to bring more,
 * with a suggested quantity the owner can change or leave to the supplier.
 * The supplier sees it in Stawi (with a phone alert) if they use it, and the
 * owner can send the same message on WhatsApp with one more tap.
 */
export function RestockPanel({ view, branchId, lang, onDone, onWriteIn }: {
  view: BizBooksView; branchId?: string; lang: Lang; onDone: Done;
  onWriteIn: (itemId: string, qty: number | null) => void;
}) {
  const { entries, items, suppliers, branches, today, groupId } = view;
  const [branch, setBranch] = useState(branchId ?? branches[0]?.id ?? '');
  const groups = useMemo(() => restockList(entries, items, suppliers, today, branch), [entries, items, suppliers, today, branch]);
  const open = view.restocks.filter((r) => RESTOCK_STATUS[r.status].open);
  // Items already asked for at this branch and not yet arrived: never ask twice by accident.
  const asked = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of open) if (r.branchId === branch) for (const l of r.lines) m.set(l.itemId, `${RESTOCK_STATUS[r.status].en.toLowerCase()} with ${r.supplierName}${r.deliverOn ? `, delivery ${dmy(r.deliverOn)}` : ''}`);
    return m;
  }, [open, branch]);
  const done = view.restocks.filter((r) => !RESTOCK_STATUS[r.status].open).slice(0, 10);
  const [sent, setSent] = useState<{ supplier: string; whatsapp: string | null; onStawi: boolean } | null>(null);

  return (
    <section className="bk-panel" aria-label="Restock">
      {branches.length > 1 && (
        <label className="bk-field bk-at"><span>Branch</span>
          <select value={branch} onChange={(e) => setBranch(e.target.value)}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
        </label>
      )}

      {sent && (
        <div className="rs-sent" role="status">
          <strong>Request saved for {sent.supplier}.</strong>
          <span>{sent.onStawi ? `${sent.supplier} uses Stawi and has been alerted on their phone.` : `${sent.supplier} is not on Stawi yet. Send it on WhatsApp so they see it; the message has a link to confirm.`}</span>
          {sent.whatsapp && <a className="rs-wa" href={sent.whatsapp} target="_blank" rel="noopener noreferrer"><WhatsAppMark /> Send on WhatsApp</a>}
          <button type="button" className="bk-link" onClick={() => setSent(null)}>Close</button>
        </div>
      )}

      <h3>Running low</h3>
      {groups.length === 0 && <p className="bk-empty">Nothing is at its red line. Stawi alerts your phone the moment an item reaches it.</p>}
      {groups.map((g) => (
        <AskCard key={g.supplier?.id ?? 'none'} group={g} asked={asked} groupId={groupId} branchId={branch} branchName={branches.find((b) => b.id === branch)?.name ?? ''} suppliers={suppliers} items={items} lang={lang} onDone={onDone}
          onSent={(r) => setSent(r)} />
      ))}

      {open.length > 0 && (
        <>
          <h3>Waiting for suppliers</h3>
          <ul className="rs-list">{open.map((r) => <RequestRow key={r.id} r={r} groupId={groupId} branches={branches} onDone={onDone} onWriteIn={onWriteIn} />)}</ul>
        </>
      )}
      {done.length > 0 && (
        <details className="bk-block">
          <summary>Earlier requests</summary>
          <ul className="rs-list">{done.map((r) => <RequestRow key={r.id} r={r} groupId={groupId} branches={branches} onDone={onDone} onWriteIn={onWriteIn} />)}</ul>
        </details>
      )}

      <RedLines entries={entries} items={items} suppliers={suppliers} today={today} branchId={branch} groupId={groupId} onDone={onDone} />
      <Suppliers groupId={groupId} suppliers={suppliers} onDone={onDone} />
    </section>
  );
}

function AskCard({ group, asked, groupId, branchId, branchName, suppliers, items, lang, onDone, onSent }: {
  group: ReturnType<typeof restockList>[number]; asked: Map<string, string>; groupId: string; branchId: string; branchName: string; suppliers: BizSupplier[]; items: RestockItem[]; lang: Lang;
  onDone: Done; onSent: (r: { supplier: string; whatsapp: string | null; onStawi: boolean }) => void;
}) {
  const [qty, setQty] = useState<Record<string, string>>(Object.fromEntries(group.lines.map((l) => [l.itemId, l.qty === null ? '' : String(l.qty)])));
  const [pick, setPick] = useState<Record<string, boolean>>(Object.fromEntries(group.lines.map((l) => [l.itemId, !asked.has(l.itemId)])));
  const [theyDecide, setTheyDecide] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const s = group.supplier;

  async function ask() {
    if (!s || busy) return;
    const lines = group.lines.filter((l) => pick[l.itemId]).map((l) => ({ itemId: l.itemId, qty: theyDecide || qty[l.itemId] === '' ? null : Number(qty[l.itemId]) }));
    if (!lines.length) { onDone('Tick at least one item.', 'error'); return; }
    setBusy(true);
    const res = await sendRestockRequestAction({ groupId, branchId, supplierId: s.id, lines, note: note || undefined, lang }).catch(() => ({ ok: false, error: 'Not sent. Check your connection.' }));
    setBusy(false);
    if (!res.ok) { onDone(res.error ?? 'Not sent.', 'error'); return; }
    onSent({ supplier: s.name, whatsapp: 'whatsapp' in res ? res.whatsapp ?? null : null, onStawi: 'onStawi' in res ? !!res.onStawi : false });
    onDone(`Request saved for ${s.name}.`);
  }

  async function setSupplier(itemId: string, supplierId: string) {
    const it = items.find((i) => i.id === itemId);
    if (!it) return;
    const res = await saveBizItemAction({ groupId, id: it.id, name: it.name, unit: it.unit, priceCents: it.priceCents, reorderAt: it.reorderAt, service: it.service, supplierId: supplierId || null }).catch(() => ({ ok: false, error: 'Not saved.' }));
    onDone(res.ok ? `${it.name} now comes from ${suppliers.find((x) => x.id === supplierId)?.name ?? 'no supplier'}.` : res.error ?? 'Not saved.', res.ok ? 'success' : 'error');
  }

  return (
    <div className="rs-card">
      <div className="rs-card-head">
        <Picture name={s ? 'handshake' : 'box'} size={34} />
        <div>
          <strong>{s ? s.name : 'No supplier chosen'}</strong>
          <small>{s ? `Usually delivers in ${s.leadDays === 0 ? 'the same day' : s.leadDays === 1 ? '1 day' : `${s.leadDays} days`} · ${branchName}` : 'Choose who supplies each item, then ask with one tap.'}</small>
        </div>
      </div>
      <ul className="rs-lines">
        {group.lines.map((l) => (
          <li key={l.itemId}>
            {s && <input type="checkbox" aria-label={`Ask for ${l.name}`} checked={!!pick[l.itemId]} onChange={(e) => setPick({ ...pick, [l.itemId]: e.target.checked })} />}
            <div className="rs-line-name">
              <strong>{l.name}</strong>
              <small className={l.onHand === 0 ? 'neg' : ''}>{l.onHand} {l.unit} left · red line {l.redLine}{l.daysLeft !== null ? ` · about ${l.daysLeft} day${l.daysLeft === 1 ? '' : 's'}` : ''}</small>
              {asked.has(l.itemId) && <small className="rs-asked">Already asked: {asked.get(l.itemId)}</small>}
            </div>
            {s ? (
              <label className="rs-qty"><span className="sr-only">How many {l.unit}</span>
                <input inputMode="decimal" disabled={theyDecide} value={theyDecide ? '' : qty[l.itemId] ?? ''} placeholder={theyDecide ? 'They decide' : l.unit} onChange={(e) => setQty({ ...qty, [l.itemId]: e.target.value.replace(/[^\d.]/g, '') })} />
                <small>{l.unit}</small>
              </label>
            ) : (
              <select className="rs-pick" aria-label={`Supplier for ${l.name}`} defaultValue="" onChange={(e) => void setSupplier(l.itemId, e.target.value)}>
                <option value="">Choose supplier</option>
                {suppliers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            )}
          </li>
        ))}
      </ul>
      {s && (
        <>
          <label className="bk-check"><input type="checkbox" checked={theyDecide} onChange={(e) => setTheyDecide(e.target.checked)} /><span>Let {s.name} decide the quantity</span></label>
          <label className="bk-field"><span>Note (optional)</span><input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Deliver before 10am" /></label>
          <button type="button" className="bk-save rs-ask" disabled={busy} onClick={() => void ask()}>{busy ? 'Sending…' : `Ask ${s.name} to bring these`}</button>
          <p className="bk-note">The quantities are a suggestion: enough until the next delivery plus a week, above the red line. Change them as you like.</p>
        </>
      )}
      {!s && suppliers.length === 0 && <p className="bk-note">Add your suppliers below first.</p>}
    </div>
  );
}

function RequestRow({ r, groupId, branches, onDone, onWriteIn }: { r: BizBooksView['restocks'][number]; groupId: string; branches: BizBranch[]; onDone: Done; onWriteIn: (itemId: string, qty: number | null) => void }) {
  const [busy, setBusy] = useState(false);
  async function move(to: RestockStatus, message: string) {
    if (busy) return;
    setBusy(true);
    const res = await updateRestockByShopAction({ groupId, requestId: r.id, to }).catch(() => ({ ok: false, error: 'Not saved.' }));
    setBusy(false);
    onDone(res.ok ? message : res.error ?? 'Not saved.', res.ok ? 'success' : 'error');
  }
  const st = RESTOCK_STATUS[r.status];
  return (
    <li className={st.open ? '' : 'fixed'}>
      <div className="bk-book-main"><strong>{r.supplierName}</strong><span className={`rs-status rs-${r.status.toLowerCase()}`}>{st.en}</span></div>
      <small>{dmy(r.createdAt.slice(0, 10))}{branches.length > 1 ? ` · ${branches.find((b) => b.id === r.branchId)?.name ?? ''}` : ''}{r.deliverOn ? ` · delivery ${dmy(r.deliverOn)}` : ''}</small>
      <small>{r.lines.map((l) => `${l.name}${l.qty === null ? ' (they decide)' : ` × ${l.qty} ${l.unit}`}`).join(', ')}</small>
      {r.supplierNote && <small className="rs-reply">“{r.supplierNote}”</small>}
      <div className="bk-owed-act">
        {st.open && <button type="button" className="bk-chip" disabled={busy} onClick={() => void move('DELIVERED', 'Marked as arrived. Now write the goods in with “I bought stock” so the stock and cost are right.')}>Goods arrived</button>}
        {(r.status === 'SENT' || r.status === 'SEEN' || r.status === 'CONFIRMED') && <button type="button" className="bk-chip" disabled={busy} onClick={() => void move('CANCELLED', 'Request cancelled. The supplier has been told.')}>Cancel</button>}
        {r.status === 'DELIVERED' && r.lines.map((l) => <button key={l.itemId} type="button" className="bk-chip" onClick={() => onWriteIn(l.itemId, l.qty)}>Write in {l.name}</button>)}
      </div>
    </li>
  );
}

function RedLines({ entries, items, suppliers, today, branchId, groupId, onDone }: { entries: BizEntry[]; items: RestockItem[]; suppliers: BizSupplier[]; today: string; branchId: string; groupId: string; onDone: Done }) {
  const ins = useMemo(() => itemInsights(entries, items, today, { branchId }).filter((i) => !i.item.service), [entries, items, today, branchId]);
  const [edit, setEdit] = useState<Record<string, string>>({});
  async function save(it: RestockItem, value: number) {
    const res = await saveBizItemAction({ groupId, id: it.id, name: it.name, unit: it.unit, priceCents: it.priceCents, reorderAt: value, service: it.service, supplierId: it.supplierId ?? null }).catch(() => ({ ok: false, error: 'Not saved.' }));
    onDone(res.ok ? `${it.name}: red line set at ${value} ${it.unit}.` : res.error ?? 'Not saved.', res.ok ? 'success' : 'error');
  }
  if (!ins.length) return null;
  return (
    <details className="bk-block">
      <summary>Red lines for each item</summary>
      <p className="bk-note">The red line is the stock level at which Stawi alerts you and suggests asking the supplier. Suggested: what you sell per day × (days the supplier takes + 2 spare days).</p>
      <ul className="rs-red">
        {ins.map((i) => {
          const it = i.item as RestockItem;
          const sup = suppliers.find((s) => s.id === it.supplierId);
          const suggested = suggestRedLine(i.perDay, sup?.leadDays ?? 1);
          const value = edit[it.id] ?? String(it.reorderAt || '');
          return (
            <li key={it.id}>
              <div><strong>{it.name}</strong><small>{i.qty} {it.unit} now · sells about {i.perDay} a day{sup ? ` · ${sup.name}` : ''}</small></div>
              <input inputMode="numeric" aria-label={`Red line for ${it.name}`} value={value} placeholder="0" onChange={(e) => setEdit({ ...edit, [it.id]: e.target.value.replace(/\D/g, '') })} />
              <button type="button" className="bk-chip" disabled={value === '' || Number(value) === it.reorderAt} onClick={() => void save(it, Number(value))}>Save</button>
              {suggested > 0 && suggested !== it.reorderAt && <button type="button" className="bk-link" onClick={() => void save(it, suggested)}>Use {suggested}</button>}
            </li>
          );
        })}
      </ul>
    </details>
  );
}

function Suppliers({ groupId, suppliers, onDone }: { groupId: string; suppliers: BizSupplier[]; onDone: Done }) {
  const [form, setForm] = useState({ name: '', phone: '', leadDays: '1' });
  const [busy, setBusy] = useState(false);
  async function add() {
    if (busy) return;
    setBusy(true);
    const res = await saveBizSupplierAction({ groupId, name: form.name, phone: form.phone, leadDays: Number(form.leadDays) }).catch(() => ({ ok: false, error: 'Not saved.' }));
    setBusy(false);
    if (!res.ok) { onDone(res.error ?? 'Not saved.', 'error'); return; }
    onDone(`${form.name} added. Choose them as the supplier of their items.`);
    setForm({ name: '', phone: '', leadDays: '1' });
  }
  async function remove(s: BizSupplier) {
    const res = await saveBizSupplierAction({ groupId, id: s.id, name: s.name, phone: s.phone, leadDays: s.leadDays, archive: true }).catch(() => ({ ok: false, error: 'Not saved.' }));
    onDone(res.ok ? `${s.name} removed from your list. Past requests stay.` : res.error ?? 'Not saved.', res.ok ? 'success' : 'error');
  }
  return (
    <details className="bk-block" open={suppliers.length === 0}>
      <summary>My suppliers ({suppliers.length})</summary>
      <ul className="bk-staff">
        {suppliers.map((s) => (
          <li key={s.id}>
            <div><strong>{s.name}</strong><small>Delivers in {s.leadDays === 0 ? 'the same day' : `${s.leadDays} day${s.leadDays === 1 ? '' : 's'}`}</small></div>
            <div className="bk-owed-act"><button type="button" className="bk-chip" onClick={() => void remove(s)}>Remove</button></div>
          </li>
        ))}
      </ul>
      <form className="rs-sup-form" onSubmit={(e) => { e.preventDefault(); void add(); }}>
        <div className="bk-row2">
          <label className="bk-field"><span>Supplier’s name</span><input value={form.name} maxLength={60} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mwangi Distributors" /></label>
          <label className="bk-field"><span>Their phone (WhatsApp)</span><input inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="07…" /></label>
        </div>
        <label className="bk-field"><span>Days they usually take to deliver</span>
          <select value={form.leadDays} onChange={(e) => setForm({ ...form, leadDays: e.target.value })}>
            <option value="0">Same day</option><option value="1">1 day</option><option value="2">2 days</option><option value="3">3 days</option><option value="7">A week</option>
          </select>
        </label>
        <div className="bk-actions"><button className="bk-save" disabled={busy || !form.name.trim() || !form.phone.trim()}>Add supplier</button></div>
      </form>
    </details>
  );
}

function WhatsAppMark() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.3-.4.8-1.3.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 0 0 1.8-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z" /></svg>
  );
}
