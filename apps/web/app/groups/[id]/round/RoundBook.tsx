'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { buildRoster, formatMoney, roundProblem, TURN_STATE_LABEL } from '@stawi/core';
import { FeedbackBanner, type Feedback } from '@/components/FeedbackBanner';
import type { RoundTurnView, RoundView } from '@/lib/table-round';
import { closeRoundAction, markGivenAction, markReturnedAction, startRoundAction } from './actions';

const kes = (c: number) => `KES ${formatMoney(c)}`;
const dmy = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(2, 4)}`;
const todayDay = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const MEET: { days: number; label: string }[] = [
  { days: 7, label: 'Every week' },
  { days: 14, label: 'Every two weeks' },
  { days: 28, label: 'Every four weeks' },
];

type Res = { ok: boolean; error?: string };

export function RoundBook({ groupId, round, members, past, myIds, canWrite }: {
  groupId: string; round: RoundView | null; members: { id: string; name: string }[]; past: number; myIds: string[]; canWrite: boolean;
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState<string | null>(null);

  async function run(fn: () => Promise<Res>, done: Feedback) {
    if (busy) return;
    setBusy(true);
    const res: Res = await fn().catch(() => ({ ok: false, error: 'Nothing was saved. Check your connection and try again.' }));
    setBusy(false);
    setArmed(null);
    if (!res.ok) { setFeedback({ tone: 'error', title: 'Not saved', detail: res.error }); return; }
    setFeedback(done);
    router.refresh();
  }

  return (
    <>
      <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} float />
      {round
        ? <Roster round={round} myIds={myIds} canWrite={canWrite} busy={busy} armed={armed} setArmed={setArmed}
            onGiven={(t) => run(() => markGivenAction({ groupId, turnId: t.id }), { tone: 'success', title: 'Written as given', detail: `${t.name} took ${kes(t.givenCents)}. It comes back on ${dmy(t.returnOn)}.` })}
            onReturned={(t) => run(() => markReturnedAction({ groupId, turnId: t.id }), { tone: 'success', title: 'Written as returned', detail: `${t.name} brought back ${kes(t.returnCents)}.` })}
            onClose={() => run(() => closeRoundAction({ groupId }), { tone: 'success', title: 'Round closed', detail: 'It stays in your record. You can start a new round.' })} />
        : canWrite
          ? <StartForm members={members} busy={busy} onStart={(plan) => run(() => startRoundAction({ groupId, ...plan }), { tone: 'success', title: 'Round started', detail: 'Every member can now see the roster.' })} />
          : <p className="mr-empty" style={{ marginTop: 22 }}>No round is running. Your treasurer or chairperson starts one.</p>}
      {past > 0 && <p className="mr-empty" style={{ marginTop: 18 }}>{past} earlier {past === 1 ? 'round is' : 'rounds are'} kept in your record.</p>}
      <p className="tr-note">This is your group&rsquo;s own money and your own rules. Stawi keeps the record only: it does not hold, send or lend money here.</p>
    </>
  );
}

function Roster({ round, myIds, canWrite, busy, armed, setArmed, onGiven, onReturned, onClose }: {
  round: RoundView; myIds: string[]; canWrite: boolean; busy: boolean; armed: string | null; setArmed: (k: string | null) => void;
  onGiven: (t: RoundTurnView) => void; onReturned: (t: RoundTurnView) => void; onClose: () => void;
}) {
  const t = round.totals;
  const next = round.turns.find((x) => x.state === 'due_out' || x.state === 'coming');
  const allBack = t.turnsBack === t.turns;
  return (
    <>
      <div className="tr-sums">
        <div><span>Each turn</span><b className="mono">{kes(round.amountCents)}</b></div>
        <div><span>Profit each turn</span><b className="mono">{kes(round.profitCents)}</b></div>
        <div><span>Out with members now</span><b className="mono">{kes(t.outCents)}</b></div>
        <div><span>Profit so far</span><b className="mono">{kes(t.profitBackCents)}</b><small>of {kes(t.profitWhenDoneCents)} when the round ends</small></div>
      </div>
      <p className="tr-next">
        {allBack ? 'Every turn has returned. The round is complete.' : next ? <>Next turn: <b>{next.name}</b> on {dmy(next.givenOn)}</> : 'Waiting for the last money to come back.'}
        {t.late > 0 && <span className="tr-late"> {t.late} late to return.</span>}
        <span className="tr-count"> {t.turnsBack} of {t.turns} turns returned.</span>
      </p>
      <ol className="tr-roster">
        {round.turns.map((x) => {
          const mine = myIds.includes(x.membershipId);
          const key = `${x.id}:${x.givenAt ? 'back' : 'give'}`;
          const canAct = canWrite && !mine && x.state !== 'back' && (x.givenAt || x.state === 'due_out');
          return (
            <li key={x.id} className={`tr-turn is-${x.state}${mine ? ' is-mine' : ''}`}>
              <span className="tr-no mono">{x.turn}</span>
              <div className="tr-who">
                <b>{x.name}{mine && <em> (you)</em>}</b>
                <span className={`tr-state is-${x.state}`}>{TURN_STATE_LABEL[x.state]}</span>
              </div>
              <dl className="tr-facts">
                <div><dt>Takes</dt><dd className="mono">{kes(x.givenCents)}</dd><dd className="tr-day">{dmy(x.givenOn)}</dd></div>
                <div><dt>Brings back</dt><dd className="mono">{kes(x.returnedCents ?? x.returnCents)}</dd><dd className="tr-day">{dmy(x.returnOn)}</dd></div>
                <div><dt>Profit</dt><dd className="mono">{kes((x.returnedCents ?? x.returnCents) - x.givenCents)}</dd></div>
              </dl>
              {canAct && (
                <div className="tr-act">
                  {armed === key ? (
                    <>
                      <button type="button" className="mr-btn go" disabled={busy} onClick={() => (x.givenAt ? onReturned(x) : onGiven(x))}>
                        {x.givenAt ? `Yes, ${kes(x.returnCents)} is back` : `Yes, ${kes(x.givenCents)} was given`}
                      </button>
                      <button type="button" className="mr-btn" disabled={busy} onClick={() => setArmed(null)}>Not yet</button>
                    </>
                  ) : (
                    <button type="button" className="mr-btn" disabled={busy} onClick={() => setArmed(key)}>
                      {x.givenAt ? 'Write as returned' : 'Write as given'}
                    </button>
                  )}
                </div>
              )}
              {canWrite && mine && x.state !== 'back' && <p className="tr-own">Your own turn: the other official writes it.</p>}
            </li>
          );
        })}
      </ol>
      {canWrite && (
        <div className="tr-close">
          {armed === 'close' ? (
            <>
              <button type="button" className="mr-btn go" disabled={busy} onClick={onClose}>Yes, close this round</button>
              <button type="button" className="mr-btn" disabled={busy} onClick={() => setArmed(null)}>Keep it open</button>
            </>
          ) : (
            <button type="button" className="mr-btn" disabled={busy || t.outCents > 0} onClick={() => setArmed('close')}>Close this round</button>
          )}
          {t.outCents > 0 && <span className="mr-empty">You can close it once all the money is back.</span>}
        </div>
      )}
    </>
  );
}

function StartForm({ members, busy, onStart }: {
  members: { id: string; name: string }[]; busy: boolean;
  onStart: (plan: { amount: number; profit: number; everyDays: number; startsOn: string; memberIds: string[] }) => void;
}) {
  const [amount, setAmount] = useState('1000');
  const [profit, setProfit] = useState('100');
  const [everyDays, setEveryDays] = useState(7);
  const [startsOn, setStartsOn] = useState(todayDay());
  const [order, setOrder] = useState(members.map((m) => m.id));
  const [out, setOut] = useState<string[]>([]);
  const name = (id: string) => members.find((m) => m.id === id)?.name ?? 'A member';
  const inRound = order.filter((id) => !out.includes(id));
  const plan = { amountCents: Math.round(Number(amount) * 100), profitCents: Math.round(Number(profit || 0) * 100), everyDays, startsOn, memberIds: inRound };
  const problem = roundProblem(plan);
  const preview = problem ? [] : buildRoster(plan);
  const move = (i: number, by: number) => {
    const j = i + by;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j]!, next[i]!];
    setOrder(next);
  };
  return (
    <form className="tr-start" onSubmit={(e) => { e.preventDefault(); if (!problem) onStart({ amount: Number(amount), profit: Number(profit || 0), everyDays, startsOn, memberIds: inRound }); }}>
      <h2 className="display">Start a round</h2>
      <p className="mr-empty">Four answers, then the roster is made for you.</p>
      <div className="tr-fields">
        <label>How much does each member take? (KES)
          <input className="mr-input" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))} />
        </label>
        <label>Profit they add when bringing it back (KES)
          <input className="mr-input" inputMode="numeric" value={profit} onChange={(e) => setProfit(e.target.value.replace(/[^\d]/g, ''))} />
        </label>
        <label>How often do you meet?
          <select className="mr-input" value={everyDays} onChange={(e) => setEveryDays(Number(e.target.value))}>
            {MEET.map((m) => <option key={m.days} value={m.days}>{m.label}</option>)}
          </select>
        </label>
        <label>Day of the first turn
          <input className="mr-input" type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
        </label>
      </div>
      <h3>Whose turn, in order</h3>
      <ol className="tr-order">
        {order.map((id, i) => {
          const skipped = out.includes(id);
          return (
            <li key={id} className={skipped ? 'is-out' : ''}>
              <span>{name(id)}</span>
              <span className="tr-order-btns">
                <button type="button" className="mr-btn" aria-label={`Move ${name(id)} up`} disabled={i === 0} onClick={() => move(i, -1)}>Up</button>
                <button type="button" className="mr-btn" aria-label={`Move ${name(id)} down`} disabled={i === order.length - 1} onClick={() => move(i, 1)}>Down</button>
                <button type="button" className="mr-btn" onClick={() => setOut(skipped ? out.filter((x) => x !== id) : [...out, id])}>{skipped ? 'Put back' : 'Leave out'}</button>
              </span>
            </li>
          );
        })}
      </ol>
      {problem
        ? <p className="tr-problem">{problem}</p>
        : <p className="tr-preview">{preview.length} turns. First: <b>{name(preview[0]!.membershipId)}</b> takes {kes(plan.amountCents)} on {dmy(preview[0]!.givenOn)} and brings back {kes(plan.amountCents + plan.profitCents)} on {dmy(preview[0]!.returnOn)}. The round ends on {dmy(preview[preview.length - 1]!.returnOn)} with {kes(plan.profitCents * preview.length)} profit for the group.</p>}
      <button type="submit" className="mr-btn go" disabled={busy || Boolean(problem)}>Start the round</button>
    </form>
  );
}
