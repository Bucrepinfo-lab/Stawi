'use client';

import { useMemo, useState } from 'react';
import {
  applyContribution,
  computeCapitalShares,
  formatMoney,
  type MemberContribution,
} from '@stawi/core';
import { receiptPath, contributionRecorded, contributionNotRecorded, contributionConfirm, stkConfirm, needsWitnesses, type ContributionConfirm } from '@stawi/core';
import { recordContributionAction } from '@/app/actions';
import { COLLECT_WAYS, type CollectWay } from '@stawi/core';
import { CollectTips } from '@/components/CollectTips';
import { FeedbackBanner, type Feedback } from '@/components/FeedbackBanner';
import { ConfirmSheet } from '@/components/ConfirmSheet';

interface SeedMember extends MemberContribution {
  role: string;
  paid: boolean;
}

interface LastReceipt {
  /** Stored contribution id — the receipt page loads everything else from the database. */
  contributionId: string;
  memberName: string;
}

const PALETTE = ['#1f4d3a', '#c5613c', '#e0a32e', '#3c7d8c', '#7a5230', '#5a7d52'];
const initials = (n: string) =>
  n.split(' ').map((w) => w[0]).slice(0, 2).join('');

export function TableBanking({
  seed,
  groupId,
  groupName = 'Stawi Group',
  canRecord = false,
}: {
  seed: SeedMember[];
  groupId?: string;
  groupName?: string;
  /** Treasurer of this group (server re-checks every write). */
  canRecord?: boolean;
}) {
  const [members, setMembers] = useState<SeedMember[]>(seed);
  const [flash, setFlash] = useState<string | null>(null);
  // The highlighted "Contribution recorded" banner (owner 26/11/26).
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [saving, setSaving] = useState(false);
  const show = (f: Feedback, ms: number) => {
    setFeedback(f);
    setTimeout(() => setFeedback((cur) => (cur === f ? null : cur)), ms);
  };
  const [receipt, setReceipt] = useState<LastReceipt | null>(null);
  const [selected, setSelected] = useState(seed[0]?.memberId ?? '');
  const [amount, setAmount] = useState('5000');
  const [phone, setPhone] = useState(''); // payer's M-Pesa number (no sandbox default in production paths)
  const [stkBusy, setStkBusy] = useState(false);
  // How the money came in, when the treasurer writes it by hand (owner 20/11/26).
  const [way, setWay] = useState<CollectWay>('CASH');
  const [ref, setRef] = useState('');
  // Two members who saw cash / M-Pesa to a phone handed over (owner 26/11/26).
  const [witnessA, setWitnessA] = useState('');
  const [witnessB, setWitnessB] = useState('');
  // Check-before-you-record (owner 26/11/26): what is waiting for "Yes".
  const [pending, setPending] = useState<{ kind: 'record' | 'stk'; confirm: ContributionConfirm } | null>(null);
  const witnessesNeeded = needsWitnesses(way);
  const witnessChoices = members.filter((m) => m.memberId !== selected);

  const snapshot = useMemo(() => computeCapitalShares(members), [members]);

  const typedCents = () => Math.round((parseFloat(amount.replace(/,/g, '')) || 0) * 100);
  const nameOf = (id: string) => members.find((m) => m.memberId === id)?.name ?? '';
  const wayLabelOf = (id: CollectWay) => COLLECT_WAYS.find((w) => w.id === id)?.label.en ?? 'Cash at the meeting';

  /** Step 1: check what was typed, then show it back with Yes / Cancel. */
  function askToRecord() {
    const cents = typedCents();
    if (cents <= 0) {
      show({ tone: 'error', ...contributionNotRecorded('Enter an amount above zero.') }, 6000);
      return;
    }
    if (witnessesNeeded && (!witnessA || !witnessB || witnessA === witnessB)) {
      show({ tone: 'error', ...contributionNotRecorded('Choose two different members who saw the money handed over.') }, 8000);
      return;
    }
    setFeedback(null);
    setPending({
      kind: 'record',
      confirm: contributionConfirm({
        name: nameOf(selected),
        amountCents: cents,
        way: wayLabelOf(way),
        reference: way !== 'CASH' ? ref : null,
        witnesses: witnessesNeeded ? [nameOf(witnessA), nameOf(witnessB)] : undefined,
        memberTotalCents: members.find((m) => m.memberId === selected)?.totalCents,
      }),
    });
  }

  /** Step 2: only after "Yes". */
  async function record() {
    const cents = typedCents();
    if (cents <= 0) return;
    if (saving) return; // one tap, one contribution
    setSaving(true);
    const res = await recordContributionAction({ groupId, membershipId: selected, amountCents: cents, way, reference: ref, witnessIds: witnessesNeeded ? [witnessA, witnessB] : [] }).catch(() => null);
    setSaving(false);
    setPending(null);
    if (res?.ok) { setRef(''); setWitnessA(''); setWitnessB(''); }
    if (!res?.ok) {
      show({ tone: 'error', ...contributionNotRecorded(res?.error) }, 9000);
      return;
    }
    const next = applyContribution(members, selected, cents);
    setMembers((prev) =>
      prev.map((m) => {
        const updated = next.members.find((x) => x.memberId === m.memberId)!;
        return { ...m, totalCents: updated.totalCents, paid: m.memberId === selected ? true : m.paid };
      }),
    );
    const me = next.members.find((x) => x.memberId === selected);
    const who = me?.name ?? '';
    const done = contributionRecorded({ name: who, amountCents: cents, way: wayLabelOf(way), totalCents: next.totalCents });
    show({ tone: 'success', ...done, detail: witnessesNeeded ? `${done.detail} Waiting for the two witnesses to confirm in the app.` : done.detail }, 8000);
    setFlash(`${who} +KES ${formatMoney(cents)} · ratios updated`);
    // A receipt exists only for a stored contribution (none in demo mode).
    setReceipt(res.contributionId ? { contributionId: res.contributionId, memberName: who } : null);
    setTimeout(() => setFlash(null), 2400);
  }

  const receiptHref = (r: LastReceipt) => receiptPath(r.contributionId);

  function askToSendStk() {
    const cents = typedCents();
    if (cents <= 0) {
      show({ tone: 'error', title: 'Request not sent', detail: 'Enter an amount above zero.' }, 6000);
      return;
    }
    if (phone.replace(/\D/g, '').length < 9) {
      show({ tone: 'error', title: 'Request not sent', detail: 'Enter the phone number that will get the M-Pesa prompt.' }, 6000);
      return;
    }
    setPending({ kind: 'stk', confirm: stkConfirm({ name: nameOf(selected), amountCents: cents, phone }) });
  }

  async function requestViaMpesa() {
    setPending(null);
    const cents = typedCents();
    if (cents <= 0) return;
    setStkBusy(true);
    setFlash('Sending STK Push…');
    try {
      const res = await fetch('/api/mpesa/stk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountCents: cents, payerPhone: phone, accountReference: groupName.slice(0, 12), description: 'Contribution', membershipId: selected, groupId }),
      });
      const data = await res.json();
      setFlash(data.ok ? `STK sent — check ${phone} for the M-Pesa prompt` : `M-Pesa: ${data.error ?? 'request failed'}`);
    } catch {
      setFlash('M-Pesa request failed (is Daraja configured?)');
    } finally {
      setStkBusy(false);
      setTimeout(() => setFlash(null), 4000);
    }
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: 22, boxShadow: 'var(--shadow)' }}>
        <div style={{ fontSize: 12, color: 'var(--dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em' }}>Total group capital</div>
        <div className="mono" style={{ fontSize: 34, fontWeight: 600, color: 'var(--forest-deep)', marginTop: 4 }}>KES {formatMoney(snapshot.totalCents)}</div>
        <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />
        {flash && !feedback && <div style={{ marginTop: 8, color: 'var(--good)', fontWeight: 600, fontSize: 14 }}>▲ {flash}</div>}
        {receipt && (
          <a href={receiptHref(receipt)} style={{ display: 'inline-block', marginTop: 10, fontSize: 13, fontWeight: 700, color: 'var(--forest-deep)', background: 'var(--bone-2)', padding: '7px 13px', borderRadius: 9, textDecoration: 'none' }}>
            ↓ Download receipt for {receipt.memberName}
          </a>
        )}
        {groupId && (
          <a href={`/groups/${encodeURIComponent(groupId)}/money`} style={{ display: 'inline-block', marginTop: 10, marginLeft: receipt ? 8 : 0, fontSize: 13, fontWeight: 700, color: 'var(--forest-deep)', textDecoration: 'underline', textUnderlineOffset: 3 }}>
            Money record: witnesses, confirmations &amp; corrections
          </a>
        )}
        {groupId && (
          <a href={`/groups/${encodeURIComponent(groupId)}/history`} style={{ display: 'inline-block', marginTop: 10, marginLeft: 12, fontSize: 13, fontWeight: 700, color: 'var(--forest-deep)', textDecoration: 'underline', textUnderlineOffset: 3 }}>
            My payment history (download)
          </a>
        )}
      </div>

      {!canRecord && (
        <p style={{ marginTop: 14, fontSize: 13, color: 'var(--dim)' }}>
          Only your group&rsquo;s treasurer records contributions and sends M-Pesa requests. You can view the group&rsquo;s capital below.
        </p>
      )}
      {canRecord && (<>
      <div style={{ marginTop: 16, background: 'var(--bone-2)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
        <label style={{ flex: '1 1 180px' }}>
          <span style={lab}>Member</span>
          <select value={selected} onChange={(e) => setSelected(e.target.value)} style={inp}>
            {members.map((m) => (<option key={m.memberId} value={m.memberId}>{m.name} · {m.role}</option>))}
          </select>
        </label>
        <label style={{ flex: '1 1 140px' }}>
          <span style={lab}>Amount (KES)</span>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" className="mono" style={inp} />
        </label>
        <label style={{ flex: '1 1 200px' }}>
          <span style={lab}>How it was paid</span>
          <select value={way} onChange={(e) => setWay(e.target.value as CollectWay)} style={inp}>
            {COLLECT_WAYS.map((w) => (<option key={w.id} value={w.id}>{w.icon} {w.label.en}</option>))}
          </select>
        </label>
        {witnessesNeeded && (
          <fieldset className="wit-pick">
            <legend>Two witnesses who saw it handed over</legend>
            <select value={witnessA} onChange={(e) => setWitnessA(e.target.value)} style={inp} aria-label="First witness">
              <option value="">First witness…</option>
              {witnessChoices.filter((m) => m.memberId !== witnessB).map((m) => (<option key={m.memberId} value={m.memberId}>{m.name}</option>))}
            </select>
            <select value={witnessB} onChange={(e) => setWitnessB(e.target.value)} style={inp} aria-label="Second witness">
              <option value="">Second witness…</option>
              {witnessChoices.filter((m) => m.memberId !== witnessA).map((m) => (<option key={m.memberId} value={m.memberId}>{m.name}</option>))}
            </select>
            <small>Not you, and not the member paying. Each witness confirms in the app; until then the entry shows &ldquo;Awaiting witnesses&rdquo;.</small>
          </fieldset>
        )}
        {way !== 'CASH' && (
          <label style={{ flex: '1 1 160px' }}>
            <span style={lab}>{way === 'BANK' ? 'Bank reference' : 'M-Pesa code'} (if you have it)</span>
            <input value={ref} onChange={(e) => setRef(e.target.value.toUpperCase().slice(0, 30))} placeholder={way === 'BANK' ? 'FT-…' : 'SKL4AB12CD'} className="mono" style={inp} autoCapitalize="characters" />
          </label>
        )}
        <button onClick={askToRecord} disabled={saving} style={{ ...btnGold, opacity: saving ? 0.7 : 1, cursor: saving ? 'default' : 'pointer' }}>{saving ? 'Recording…' : '＋ Record contribution'}</button>
      </div>
      <CollectTips />
      <ConfirmSheet
        confirm={pending?.confirm ?? null}
        busy={saving}
        onNo={() => setPending(null)}
        onYes={() => { if (pending?.kind === 'stk') void requestViaMpesa(); else void record(); }}
      />

      <div style={{ marginTop: 12, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
        <label style={{ flex: '1 1 180px' }}>
          <span style={lab}>Collect via M-Pesa · payer phone</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="0712 345 678" className="mono" style={{ ...inp, background: 'var(--bone)' }} />
        </label>
        <button onClick={askToSendStk} disabled={stkBusy} style={{ padding: '12px 20px', borderRadius: 10, border: '1px solid var(--forest-deep)', background: stkBusy ? 'var(--bone-2)' : 'var(--forest-deep)', color: stkBusy ? 'var(--dim)' : 'var(--bone)', fontWeight: 700, fontSize: 14, cursor: stkBusy ? 'default' : 'pointer', fontFamily: 'inherit' }}>
          {stkBusy ? 'Sending…' : '↗ Request STK Push'}
        </button>
      </div>
      </>)}

      <h2 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--dim)', margin: '22px 2px 10px' }}>Capital ratio · {members.length} members</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {snapshot.members.map((m, i) => {
          const sm = members.find((x) => x.memberId === m.memberId)!;
          return (
            <div key={m.memberId} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', flex: 'none', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 700, fontSize: 13, background: PALETTE[i % PALETTE.length] }}>{initials(m.name)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</div>
                <div style={{ fontSize: 12, color: 'var(--dim)' }}>{sm.role} ·{' '}<span style={{ color: sm.paid ? 'var(--good)' : 'var(--warn)', fontWeight: 600 }}>{sm.paid ? 'Paid' : 'Pending'}</span></div>
                <div style={{ height: 6, borderRadius: 6, background: 'var(--bone-2)', overflow: 'hidden', marginTop: 6 }}>
                  <div style={{ height: '100%', width: `${m.sharePct}%`, borderRadius: 6, background: 'linear-gradient(90deg,var(--gold),var(--clay))', transition: 'width .5s ease' }} />
                </div>
              </div>
              <div className="mono" style={{ fontWeight: 600, color: 'var(--ink-2)', fontSize: 14 }}>{m.sharePct.toFixed(1)}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const lab: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--dim)', marginBottom: 6 };
const inp: React.CSSProperties = { width: '100%', padding: '11px 12px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--paper)', fontFamily: 'inherit', fontSize: 14, color: 'var(--ink)' };
const btnGold: React.CSSProperties = { padding: '12px 20px', borderRadius: 10, border: 'none', background: 'var(--gold)', color: 'var(--forest-deep)', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' };
