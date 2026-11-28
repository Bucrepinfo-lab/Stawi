'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RESTOCK_STATUS, whatsappLink, type RestockStatus } from '@stawi/core';
import { answerRestockAction } from '../actions';

const NEXT: Partial<Record<RestockStatus, { to: RestockStatus; label: string; main?: boolean }[]>> = {
  SEEN: [{ to: 'CONFIRMED', label: 'Confirm the order', main: true }, { to: 'ON_THE_WAY', label: 'It is on the way' }, { to: 'CANNOT', label: 'I cannot supply this' }],
  CONFIRMED: [{ to: 'ON_THE_WAY', label: 'It is on the way', main: true }, { to: 'DELIVERED', label: 'Delivered' }, { to: 'CANNOT', label: 'I cannot supply this' }],
  ON_THE_WAY: [{ to: 'DELIVERED', label: 'Delivered', main: true }],
};

/** The supplier's answer: one tap, an optional delivery day and note. */
export function AnswerOrder({ requestId, status, shopPhone, shopName }: { requestId: string; status: RestockStatus; shopPhone: string | null; shopName: string }) {
  const router = useRouter();
  const [day, setDay] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const options = NEXT[status] ?? [];
  const wa = shopPhone ? whatsappLink(shopPhone, `Hello ${shopName}, about your order on Stawi: `) : null;

  async function answer(to: RestockStatus) {
    if (busy) return;
    setBusy(true);
    const res = await answerRestockAction({ requestId, to, note: note || undefined, deliverOn: day || undefined }).catch(() => ({ ok: false, error: 'Not saved. Check your connection.' }));
    setBusy(false);
    setMsg(res.ok ? { ok: true, text: `Done: ${RESTOCK_STATUS[to].en}. The shop has been told.` } : { ok: false, text: res.error ?? 'Not saved.' });
    if (res.ok) router.refresh();
  }

  return (
    <div className="bk-sheet" style={{ marginTop: 14 }}>
      {options.length > 0 ? (
        <>
          <div className="bk-row2">
            <label className="bk-field"><span>Delivery day (optional)</span><input type="date" value={day} onChange={(e) => setDay(e.target.value)} /></label>
            <label className="bk-field"><span>Note to the shop (optional)</span><input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Only 10 crates in stock" /></label>
          </div>
          <div className="bk-actions">
            {options.map((o) => <button key={o.to} type="button" className={o.main ? 'bk-save' : 'bk-ghost'} disabled={busy} onClick={() => void answer(o.to)}>{o.label}</button>)}
          </div>
        </>
      ) : <p className="bk-note">This order is finished: {RESTOCK_STATUS[status].en}.</p>}
      {msg && <p className={msg.ok ? 'bk-good' : 'bk-error'} role="status">{msg.text}</p>}
      {wa && <a className="bk-ghost" href={wa} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>Message the shop on WhatsApp</a>}
    </div>
  );
}
