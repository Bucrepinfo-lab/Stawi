'use client';

import { useMemo, useState } from 'react';
import {
  applyContribution,
  computeCapitalShares,
  formatMoney,
  type MemberContribution,
} from '@stawi/core';
import { recordContributionAction } from '@/app/actions';

interface SeedMember extends MemberContribution {
  role: string;
  paid: boolean;
}

interface LastReceipt {
  id: string;
  memberName: string;
  amountCents: number;
  capitalCents: number;
  dateISO: string;
}

const PALETTE = ['#1f4d3a', '#c5613c', '#e0a32e', '#3c7d8c', '#7a5230', '#5a7d52'];
const initials = (n: string) =>
  n.split(' ').map((w) => w[0]).slice(0, 2).join('');

export function TableBanking({
  seed,
  groupId,
  groupName = 'Stawi Group',
}: {
  seed: SeedMember[];
  groupId?: string;
  groupName?: string;
}) {
  const [members, setMembers] = useState<SeedMember[]>(seed);
  const [flash, setFlash] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<LastReceipt | null>(null);
  const [selected, setSelected] = useState(seed[0]?.memberId ?? '');
  const [amount, setAmount] = useState('5000');
  const [phone, setPhone] = useState('0708374149'); // Daraja sandbox test MSISDN
  const [stkBusy, setStkBusy] = useState(false);

  const snapshot = useMemo(() => computeCapitalShares(members), [members]);

  function record() {
    const cents = Math.round((parseFloat(amount) || 0) * 100);
    if (cents <= 0) return;
    const next = applyContribution(members, selected, cents);
    setMembers((prev) =>
      prev.map((m) => {
        const updated = next.members.find((x) => x.memberId === m.memberId)!;
        return { ...m, totalCents: updated.totalCents, paid: m.memberId === selected ? true : m.paid };
      }),
    );
    const me = next.members.find((x) => x.memberId === selected);
    const who = me?.name ?? '';
    setFlash(`${who} +KES ${formatMoney(cents)} · ratios updated`);
    setReceipt({
      id: Math.random().toString(36).slice(2, 9),
      memberName: who,
      amountCents: cents,
      capitalCents: me?.totalCents ?? cents,
      dateISO: new Date().toISOString(),
    });
    setTimeout(() => setFlash(null), 2400);
    void recordContributionAction({ groupId, membershipId: selected, amountCents: cents }).catch(() => {});
  }

  const receiptHref = (r: LastReceipt) =>
    `/receipt/${r.id}?group=${encodeURIComponent(groupName)}&member=${encodeURIComponent(r.memberName)}&amount=${r.amountCents}&capital=${r.capitalCents}&date=${encodeURIComponent(r.dateISO)}&channel=CASH`;

  async function requestViaMpesa() {
    const cents = Math.round((parseFloat(amount) || 0) * 100);
    if (cents <= 0) return;
    setStkBusy(true);
    setFlash('Sending STK Push…');
    try {
      const res = await fetch('/api/mpesa/stk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountCents: cents, payerPhone: phone, accountReference: 'Umoja', description: 'Contribution', membershipId: selected, groupId }),
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
        {flash && <div style={{ marginTop: 8, color: 'var(--good)', fontWeight: 600, fontSize: 14 }}>▲ {flash}</div>}
        {receipt && (
          <a href={receiptHref(receipt)} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 10, fontSize: 13, fontWeight: 700, color: 'var(--forest-deep)', background: 'var(--bone-2)', padding: '7px 13px', borderRadius: 9, textDecoration: 'none' }}>
            ↓ Download receipt for {receipt.memberName}
          </a>
        )}
      </div>

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
        <button onClick={record} style={btnGold}>＋ Record contribution</button>
      </div>

      <div style={{ marginTop: 12, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
        <label style={{ flex: '1 1 180px' }}>
          <span style={lab}>Collect via M-Pesa · payer phone</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className="mono" style={{ ...inp, background: 'var(--bone)' }} />
        </label>
        <button onClick={requestViaMpesa} disabled={stkBusy} style={{ padding: '12px 20px', borderRadius: 10, border: '1px solid var(--forest-deep)', background: stkBusy ? 'var(--bone-2)' : 'var(--forest-deep)', color: stkBusy ? 'var(--dim)' : 'var(--bone)', fontWeight: 700, fontSize: 14, cursor: stkBusy ? 'default' : 'pointer', fontFamily: 'inherit' }}>
          {stkBusy ? 'Sending…' : '↗ Request STK Push'}
        </button>
      </div>

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
