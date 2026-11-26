'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatMoney, SLOT_LABEL, type ApprovalSlot } from '@stawi/core';
import { FeedbackBanner, type Feedback } from '@/components/FeedbackBanner';
import { checkMyContributionAction, confirmWitnessAction, decideCorrectionAction, requestCorrectionAction } from '@/app/money-actions';
import type { MoneyCorrection, MoneyEntry } from '@/lib/money-trust';

const CHANNEL: Record<string, string> = { CASH: 'Cash', MPESA_STK: 'M-Pesa', MPESA_C2B: 'M-Pesa', BANK: 'Bank', CARD: 'Card' };
const kes = (c: number) => `${c < 0 ? '−' : ''}KES ${formatMoney(Math.abs(c))}`;
const dmy = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`;
};
const STATUS: Record<string, { label: string; tone: string }> = {
  PENDING: { label: 'Waiting for approvals', tone: 'wait' },
  APPROVED: { label: 'Approved — new entry written', tone: 'ok' },
  REJECTED: { label: 'Stopped — someone said no', tone: 'bad' },
  EXPIRED: { label: 'Expired after 14 days', tone: 'info' },
};

export function MoneyRecord({ groupId, myIds, isOfficial, entries, corrections }: {
  groupId: string; myIds: string[]; isOfficial: boolean; entries: MoneyEntry[]; corrections: MoneyCorrection[];
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const mine = (id: string) => myIds.includes(id);

  async function run(key: string, fn: () => Promise<{ ok: boolean; error?: string; outcome?: string }>, done: Feedback) {
    if (busy) return;
    setBusy(key);
    const res: { ok: boolean; error?: string; outcome?: string } = await fn().catch(() => ({ ok: false, error: 'Nothing was saved. Check your connection and try again.' }));
    setBusy(null);
    if (!res.ok) { setFeedback({ tone: 'error', title: 'Not saved', detail: res.error }); return; }
    const extra = res.outcome === 'APPROVED' ? ' That was the last approval: the corrected entry is now written and every share is updated.' : res.outcome === 'REJECTED' ? ' The correction is stopped; the original entry stands.' : '';
    setFeedback({ ...done, detail: (done.detail ?? '') + extra });
    router.refresh();
  }

  const tasks = useMemo(() => ({
    witness: entries.filter((e) => e.witnesses.some((w) => mine(w.membershipId) && !w.confirmed && !w.disputed)),
    check: entries.filter((e) => mine(e.memberId) && !e.isAdjustment && !e.check),
    approve: corrections.filter((c) => c.status === 'PENDING' && c.seats.some((s) => mine(s.membershipId) && s.decision === null)),
  }), [entries, corrections, myIds]); // eslint-disable-line react-hooks/exhaustive-deps
  const taskCount = tasks.witness.length + tasks.check.length + tasks.approve.length;
  const openCorrectionFor = new Set(corrections.filter((c) => c.status === 'PENDING').map((c) => c.contributionId));

  return (
    <>
      <div className="mr-section mr-rules" role="note">
        <strong>How your group&rsquo;s money is protected</strong>
        <span>• A figure, once written, is never changed or deleted.</span>
        <span>• Cash, and M-Pesa sent to an official&rsquo;s phone, is written in front of two witnesses, who each confirm here.</span>
        <span>• You can confirm every contribution in your name, or say it is wrong.</span>
        <span>• A correction is a new entry. It counts only after five people approve with their own PIN: Chairperson, Secretary, Treasurer, a member picked at random by Stawi, and the member whose money it is. One &ldquo;no&rdquo; stops it.</span>
      </div>

      <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />

      <section className="mr-section" aria-labelledby="mr-tasks">
        <h2 id="mr-tasks">Waiting for you · {taskCount}</h2>
        {taskCount === 0 && <p className="mr-empty">Nothing is waiting for you. Thank you for keeping the record honest.</p>}
        <div className="mr-list">
          {tasks.approve.map((c) => (
            <ApproveTask key={c.id} c={c} busy={busy === c.id} onDecide={(approve, pin, note) => run(c.id, () => decideCorrectionAction({ groupId, correctionId: c.id, approve, pin, note }), { tone: 'success', title: approve ? 'Your approval is recorded' : 'Your “no” is recorded', detail: '' })} />
          ))}
          {tasks.witness.map((e) => (
            <WitnessTask key={e.id} e={e} busy={busy === e.id} onAnswer={(saw, note) => run(e.id, () => confirmWitnessAction({ groupId, contributionId: e.id, saw, note }), { tone: 'success', title: saw ? 'Thank you — you confirmed you saw it' : 'Your answer is recorded', detail: saw ? '' : 'The officials will see that you did not see this money handed over.' })} />
          ))}
          {tasks.check.map((e) => (
            <CheckTask key={e.id} e={e} busy={busy === e.id} onAnswer={(verdict, note) => run(e.id, () => checkMyContributionAction({ groupId, contributionId: e.id, verdict, note }), { tone: 'success', title: verdict === 'MINE' ? 'Confirmed — that one is yours' : 'Sent to the officials', detail: verdict === 'MINE' ? '' : 'They can ask for a correction, which you will be asked to approve.' })} />
          ))}
        </div>
      </section>

      <section className="mr-section" aria-labelledby="mr-corr">
        <h2 id="mr-corr">Corrections · {corrections.length}</h2>
        {corrections.length === 0 && <p className="mr-empty">No corrections have been asked for.</p>}
        <div className="mr-list">
          {corrections.map((c) => (
            <article key={c.id} className="mr-corr">
              <div className="mr-row">
                <span className="mr-who">{c.memberName}: <span className="mono">{kes(c.originalCents)}</span> → <span className="mono">{kes(c.correctedCents)}</span></span>
                <span className={`mr-badge ${STATUS[c.status]?.tone ?? 'info'}`}>{STATUS[c.status]?.label ?? c.status}</span>
              </div>
              <div className="mr-meta">Asked by {c.requestedBy} on {dmy(c.createdAt)}. Reason: {c.reason}</div>
              <ul className="mr-seats">
                {c.seats.map((s) => (
                  <li key={s.slot + s.membershipId}>
                    <span>{SLOT_LABEL[s.slot as ApprovalSlot] ?? s.slot}: <strong>{s.name}</strong>{s.note ? ` — “${s.note}”` : ''}</span>
                    <span className={`mr-badge ${s.decision === true ? 'ok' : s.decision === false ? 'bad' : 'wait'}`}>{s.decision === true ? 'Approved' : s.decision === false ? 'Said no' : 'Waiting'}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="mr-section" aria-labelledby="mr-all">
        <h2 id="mr-all">Every contribution · {entries.length}</h2>
        {entries.length === 0 && <p className="mr-empty">No money has been written in yet.</p>}
        <div className="mr-list">
          {entries.map((e) => (
            <EntryRow
              key={e.id}
              e={e}
              canCorrect={!e.isAdjustment && !openCorrectionFor.has(e.id) && (isOfficial || mine(e.memberId))}
              busy={busy === `c-${e.id}`}
              onCorrect={(correctedCents, reason, pin) => run(`c-${e.id}`, () => requestCorrectionAction({ groupId, contributionId: e.id, correctedCents, reason, pin }), { tone: 'info', title: 'Correction asked for', detail: 'Nothing changes until all five people approve. Each of them now sees it under “Waiting for you”.' })}
            />
          ))}
        </div>
      </section>
    </>
  );
}

function Badges({ e }: { e: MoneyEntry }) {
  return (
    <div className="mr-badges">
      {e.isAdjustment && <span className="mr-badge info">Correction entry (approved by five)</span>}
      {e.witness && (e.witness.disputed > 0
        ? <span className="mr-badge bad">A witness did not see it</span>
        : e.witness.complete
          ? <span className="mr-badge ok">Witnessed {e.witness.confirmed} of {e.witness.needed}</span>
          : <span className={`mr-badge ${e.witness.overdue ? 'bad' : 'wait'}`}>{e.witness.overdue ? 'Witnesses overdue (7 days)' : `Awaiting witnesses · ${e.witness.confirmed} of ${e.witness.needed}`}</span>)}
      {e.check === 'MINE' && <span className="mr-badge ok">Member confirmed</span>}
      {e.check === 'WRONG' && <span className="mr-badge bad">Member says it is wrong</span>}
    </div>
  );
}

function EntryHead({ e }: { e: MoneyEntry }) {
  return (
    <>
      <div className="mr-row">
        <span className="mr-who">{e.memberName}</span>
        <span className={`mr-amt mono ${e.amountCents < 0 ? 'neg' : ''}`}>{kes(e.amountCents)}</span>
      </div>
      <div className="mr-meta">
        {dmy(e.createdAt)} · {CHANNEL[e.channel] ?? e.channel}{e.ref ? ` · ${e.ref}` : ''}
        {e.witnesses.length > 0 && ` · witnesses: ${e.witnesses.map((w) => w.name).join(', ')}`}
      </div>
    </>
  );
}

function EntryRow({ e, canCorrect, busy, onCorrect }: { e: MoneyEntry; canCorrect: boolean; busy: boolean; onCorrect: (cents: number, reason: string, pin: string) => void }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [pin, setPin] = useState('');
  return (
    <article className="mr-entry">
      <EntryHead e={e} />
      <Badges e={e} />
      {e.check === 'WRONG' && e.checkNote && <div className="mr-meta">Member&rsquo;s note: {e.checkNote}</div>}
      {canCorrect && !open && (
        <div className="mr-actions"><button type="button" className="mr-btn" onClick={() => setOpen(true)}>Ask for a correction</button></div>
      )}
      {open && (
        <form className="mr-list" onSubmit={(ev) => { ev.preventDefault(); onCorrect(Math.round((parseFloat(amount.replace(/,/g, '')) || 0) * 100), reason, pin); }}>
          <label><span className="mr-meta">The correct amount (KES). Write 0 if this money was never paid.</span>
            <input className="mr-input mono" inputMode="decimal" value={amount} onChange={(ev) => setAmount(ev.target.value)} required /></label>
          <label><span className="mr-meta">Why — every member will read this</span>
            <textarea className="mr-input" rows={2} value={reason} onChange={(ev) => setReason(ev.target.value)} required minLength={10} /></label>
          <div className="mr-actions">
            <label className="mr-meta">Your PIN <input className="mr-input mr-pin mono" type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={pin} onChange={(ev) => setPin(ev.target.value.replace(/\D/g, ''))} required /></label>
            <button type="button" className="mr-btn" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="mr-btn go" disabled={busy}>{busy ? 'Sending…' : 'Ask the five to approve'}</button>
          </div>
        </form>
      )}
    </article>
  );
}

function WitnessTask({ e, busy, onAnswer }: { e: MoneyEntry; busy: boolean; onAnswer: (saw: boolean, note?: string) => void }) {
  const [no, setNo] = useState(false);
  const [note, setNote] = useState('');
  return (
    <article className="mr-task">
      <strong>Did you see this money handed over?</strong>
      <EntryHead e={e} />
      {!no ? (
        <div className="mr-actions">
          <button type="button" className="mr-btn go" disabled={busy} onClick={() => onAnswer(true)}>Yes, I saw it</button>
          <button type="button" className="mr-btn stop" disabled={busy} onClick={() => setNo(true)}>No, I did not</button>
        </div>
      ) : (
        <div className="mr-list">
          <input className="mr-input" placeholder="What did you see? (optional)" value={note} onChange={(ev) => setNote(ev.target.value)} />
          <div className="mr-actions">
            <button type="button" className="mr-btn" onClick={() => setNo(false)}>Back</button>
            <button type="button" className="mr-btn stop" disabled={busy} onClick={() => onAnswer(false, note)}>Send my answer</button>
          </div>
        </div>
      )}
    </article>
  );
}

function CheckTask({ e, busy, onAnswer }: { e: MoneyEntry; busy: boolean; onAnswer: (v: 'MINE' | 'WRONG', note?: string) => void }) {
  const [wrong, setWrong] = useState(false);
  const [note, setNote] = useState('');
  return (
    <article className="mr-task">
      <strong>Is this contribution in your name right?</strong>
      <EntryHead e={e} />
      {!wrong ? (
        <div className="mr-actions">
          <button type="button" className="mr-btn go" disabled={busy} onClick={() => onAnswer('MINE')}>Yes, that&rsquo;s mine</button>
          <button type="button" className="mr-btn stop" disabled={busy} onClick={() => setWrong(true)}>That&rsquo;s wrong</button>
        </div>
      ) : (
        <div className="mr-list">
          <input className="mr-input" placeholder="What is wrong? e.g. I paid KES 2,000, not 3,000" value={note} onChange={(ev) => setNote(ev.target.value)} />
          <div className="mr-actions">
            <button type="button" className="mr-btn" onClick={() => setWrong(false)}>Back</button>
            <button type="button" className="mr-btn stop" disabled={busy || !note.trim()} onClick={() => onAnswer('WRONG', note)}>Tell the officials</button>
          </div>
        </div>
      )}
    </article>
  );
}

function ApproveTask({ c, busy, onDecide }: { c: MoneyCorrection; busy: boolean; onDecide: (approve: boolean, pin: string, note?: string) => void }) {
  const [pin, setPin] = useState('');
  const [note, setNote] = useState('');
  const approvals = c.seats.filter((s) => s.decision === true).length;
  return (
    <article className="mr-task">
      <strong>Approve this correction?</strong>
      <div className="mr-row">
        <span className="mr-who">{c.memberName}: <span className="mono">{kes(c.originalCents)}</span> → <span className="mono">{kes(c.correctedCents)}</span></span>
        <span className="mr-badge wait">{approvals} of {c.seats.length} approved</span>
      </div>
      <div className="mr-meta">Asked by {c.requestedBy} on {dmy(c.createdAt)}. Reason: {c.reason}</div>
      <input className="mr-input" placeholder="A note (needed if you say no)" value={note} onChange={(ev) => setNote(ev.target.value)} />
      <div className="mr-actions">
        <label className="mr-meta">Your PIN <input className="mr-input mr-pin mono" type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={pin} onChange={(ev) => setPin(ev.target.value.replace(/\D/g, ''))} /></label>
        <button type="button" className="mr-btn go" disabled={busy || pin.length !== 4} onClick={() => onDecide(true, pin, note)}>Approve</button>
        <button type="button" className="mr-btn stop" disabled={busy || pin.length !== 4 || !note.trim()} onClick={() => onDecide(false, pin, note)}>Say no</button>
      </div>
    </article>
  );
}
