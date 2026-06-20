'use client';

import { useMemo, useState } from 'react';
import {
  applyContribution,
  computeCapitalShares,
  formatMoney,
  type MemberContribution,
} from '@stawi/core';

interface SeedMember extends MemberContribution {
  role: string;
  paid: boolean;
}

const PALETTE = ['#1f4d3a', '#c5613c', '#e0a32e', '#3c7d8c', '#7a5230', '#5a7d52'];
const initials = (n: string) =>
  n.split(' ').map((w) => w[0]).slice(0, 2).join('');

export function TableBanking({ seed }: { seed: SeedMember[] }) {
  const [members, setMembers] = useState<SeedMember[]>(seed);
  const [flash, setFlash] = useState<string | null>(null);
  const [selected, setSelected] = useState(seed[0]?.memberId ?? '');
  const [amount, setAmount] = useState('5000');

  const snapshot = useMemo(() => computeCapitalShares(members), [members]);

  function record() {
    const cents = Math.round((parseFloat(amount) || 0) * 100);
    if (cents <= 0) return;
    // Core engine recomputes every member's share — the live fan-out.
    const next = applyContribution(members, selected, cents);
    setMembers((prev) =>
      prev.map((m) => {
        const updated = next.members.find((x) => x.memberId === m.memberId)!;
        return { ...m, totalCents: updated.totalCents, paid: m.memberId === selected ? true : m.paid };
      }),
    );
    const who = members.find((m) => m.memberId === selected)?.name ?? '';
    setFlash(`${who} +KES ${formatMoney(cents)} · ratios updated`);
    setTimeout(() => setFlash(null), 2400);
  }

  return (
    <div style={{ marginTop: 24 }}>
      {/* Capital summary */}
      <div
        style={{
          background: 'var(--paper)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius)',
          padding: 22,
          boxShadow: 'var(--shadow)',
        }}
      >
        <div style={{ fontSize: 12, color: 'var(--dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em' }}>
          Total group capital
        </div>
        <div className="mono" style={{ fontSize: 34, fontWeight: 600, color: 'var(--forest-deep)', marginTop: 4 }}>
          KES {formatMoney(snapshot.totalCents)}
        </div>
        {flash && (
          <div style={{ marginTop: 8, color: 'var(--good)', fontWeight: 600, fontSize: 14 }}>▲ {flash}</div>
        )}
      </div>

      {/* Treasurer control */}
      <div
        style={{
          marginTop: 16,
          background: 'var(--bone-2)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-sm)',
          padding: 16,
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'end',
        }}
      >
        <label style={{ flex: '1 1 180px' }}>
          <span style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--dim)', marginBottom: 6 }}>
            Member
          </span>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            style={{ width: '100%', padding: '11px 12px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--paper)', fontFamily: 'inherit', fontSize: 14 }}
          >
            {members.map((m) => (
              <option key={m.memberId} value={m.memberId}>
                {m.name} · {m.role}
              </option>
            ))}
          </select>
        </label>
        <label style={{ flex: '1 1 140px' }}>
          <span style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--dim)', marginBottom: 6 }}>
            Amount (KES)
          </span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="numeric"
            className="mono"
            style={{ width: '100%', padding: '11px 12px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--paper)', fontSize: 14 }}
          />
        </label>
        <button
          onClick={record}
          style={{ padding: '12px 20px', borderRadius: 10, border: 'none', background: 'var(--gold)', color: 'var(--forest-deep)', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          ＋ Record contribution
        </button>
      </div>

      {/* Member ratios */}
      <h2 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--dim)', margin: '22px 2px 10px' }}>
        Capital ratio · {members.length} members
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {snapshot.members.map((m, i) => {
          const sm = members.find((x) => x.memberId === m.memberId)!;
          return (
            <div
              key={m.memberId}
              style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}
            >
              <div
                style={{ width: 36, height: 36, borderRadius: '50%', flex: 'none', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 700, fontSize: 13, background: PALETTE[i % PALETTE.length] }}
              >
                {initials(m.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</div>
                <div style={{ fontSize: 12, color: 'var(--dim)' }}>
                  {sm.role} ·{' '}
                  <span style={{ color: sm.paid ? 'var(--good)' : 'var(--warn)', fontWeight: 600 }}>
                    {sm.paid ? 'Paid' : 'Pending'}
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 6, background: 'var(--bone-2)', overflow: 'hidden', marginTop: 6 }}>
                  <div style={{ height: '100%', width: `${m.sharePct}%`, borderRadius: 6, background: 'linear-gradient(90deg,var(--gold),var(--clay))', transition: 'width .5s ease' }} />
                </div>
              </div>
              <div className="mono" style={{ fontWeight: 600, color: 'var(--ink-2)', fontSize: 14 }}>
                {m.sharePct.toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
