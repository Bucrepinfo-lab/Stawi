'use client';

import { useMemo, useState } from 'react';
import {
  reconcile,
  classifyStock,
  reorderAlerts,
  financialSuggestions,
  computeBusinessTaxes,
  formatMoney,
  type LedgerEntry,
  type StockItem,
  type Period,
  type EntryType,
} from '@stawi/core';

export interface BooksProps {
  businessName: string;
  vatRegistered: boolean;
  tourismSector: boolean;
  initialEntries: LedgerEntry[];
  stock: StockItem[];
}

const card: React.CSSProperties = {
  background: 'var(--paper)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--radius)',
  padding: 22,
  boxShadow: 'var(--shadow)',
  marginTop: 18,
};

const PERIODS: Period[] = ['day', 'week', 'month', 'year'];
const MOVE_COLOR = { fast: 'var(--good)', slow: 'var(--danger)', dead: 'var(--dim)' } as const;

export function Books({ businessName, vatRegistered, tourismSector, initialEntries, stock }: BooksProps) {
  const [entries, setEntries] = useState<LedgerEntry[]>(initialEntries);
  const [period, setPeriod] = useState<Period>('day');
  const [type, setType] = useState<EntryType>('SALE');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');

  const pnl = useMemo(() => reconcile(entries, period, new Date()), [entries, period]);
  const insights = useMemo(() => classifyStock(stock), [stock]);
  const alerts = useMemo(() => reorderAlerts(insights), [insights]);

  const taxes = useMemo(
    () =>
      computeBusinessTaxes({
        country: 'KE',
        grossSalesCents: pnl.salesCents,
        vatRegistered,
        tourismSector,
      }),
    [pnl.salesCents, vatRegistered, tourismSector],
  );

  const tips = useMemo(() => financialSuggestions(pnl, insights), [pnl, insights]);

  function addEntry() {
    const cents = Math.round((parseFloat(amount) || 0) * 100);
    if (cents <= 0) return;
    setEntries((prev) => [
      { id: Math.random().toString(36).slice(2), type, description: desc || type, amountCents: cents, occurredAt: new Date() },
      ...prev,
    ]);
    setAmount('');
    setDesc('');
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginTop: 22, background: 'var(--bone-2)', padding: 6, borderRadius: 999, width: 'fit-content' }}>
        {PERIODS.map((p) => (
          <button key={p} onClick={() => setPeriod(p)} style={{ padding: '8px 18px', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 13, textTransform: 'capitalize', background: period === p ? 'var(--forest-deep)' : 'transparent', color: period === p ? 'var(--bone)' : 'var(--ink-2)' }}>
            {p}
          </button>
        ))}
      </div>

      <div style={card}>
        <h2 className="display" style={{ fontWeight: 600, fontSize: 20, textTransform: 'capitalize' }}>{period} profit &amp; loss</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 12, marginTop: 14 }}>
          <Stat label="Sales" value={pnl.salesCents} />
          <Stat label="Cost of goods" value={pnl.costOfGoodsCents} />
          <Stat label="Expenses" value={pnl.expensesCents} />
          <Stat label="Net profit" value={pnl.netProfitCents} accent={pnl.netProfitCents >= 0 ? 'var(--good)' : 'var(--danger)'} />
        </div>
        <div className="mono" style={{ marginTop: 12, fontSize: 13, color: 'var(--dim)' }}>
          Net margin: <b style={{ color: 'var(--ink)' }}>{pnl.marginPct}%</b>
        </div>
      </div>

      <div style={{ ...card, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
        <label style={{ flex: '0 0 140px' }}>
          <span style={lab}>Type</span>
          <select value={type} onChange={(e) => setType(e.target.value as EntryType)} style={inp}>
            <option value="SALE">Sale</option>
            <option value="PURCHASE">Purchase</option>
            <option value="EXPENSE">Expense</option>
          </select>
        </label>
        <label style={{ flex: '1 1 160px' }}>
          <span style={lab}>Description</span>
          <input value={desc} onChange={(e) => setDesc(e.target.value)} style={inp} placeholder="e.g. afternoon sales" />
        </label>
        <label style={{ flex: '0 0 140px' }}>
          <span style={lab}>Amount (KES)</span>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" className="mono" style={inp} />
        </label>
        <button onClick={addEntry} style={btnGold}>＋ Add entry</button>
      </div>

      <div style={card}>
        <h2 className="display" style={{ fontWeight: 600, fontSize: 20 }}>Auto-calculated levies</h2>
        <p style={{ color: 'var(--dim)', fontSize: 13, marginTop: 4 }}>On {period} sales of KES {formatMoney(pnl.salesCents)}</p>
        {taxes.length === 0 ? (
          <p style={{ marginTop: 12, fontSize: 13, color: 'var(--dim)' }}>No VAT/levy applies for {businessName} this period.</p>
        ) : (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {taxes.map((t) => (
              <div key={t.code} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: 'var(--bone)', border: '1px solid var(--line)', borderRadius: 11 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{t.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--dim)' }}>
                    {t.remitTo} · due {t.dueBy} · <a href={t.link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--sky)', fontWeight: 600 }}>remit ↗</a>
                  </div>
                </div>
                <div className="mono" style={{ fontWeight: 600, color: 'var(--ink)' }}>KES {formatMoney(t.amountCents)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={card}>
        <h2 className="display" style={{ fontWeight: 600, fontSize: 20 }}>Stock movement</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12, fontSize: 13.5 }}>
          <thead>
            <tr>
              {['Item', 'Qty', 'Sold (wk)', 'Movement', 'Status'].map((h, i) => (
                <th key={h} style={{ textAlign: i > 0 && i < 3 ? 'right' : 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--dim)', fontWeight: 700, padding: '8px 10px', borderBottom: '1.5px solid var(--line)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {insights.map((s) => (
              <tr key={s.id}>
                <td style={td}>{s.name}</td>
                <td className="mono" style={{ ...td, textAlign: 'right' }}>{s.quantity}</td>
                <td className="mono" style={{ ...td, textAlign: 'right' }}>{s.soldInWindow}</td>
                <td style={td}><span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 7, background: 'var(--bone-2)', color: MOVE_COLOR[s.movement], textTransform: 'capitalize' }}>{s.movement}</span></td>
                <td style={td}>
                  {s.critical ? <span style={{ color: 'var(--danger)', fontWeight: 700, fontSize: 12 }}>⚠ Critical</span> : s.needsReorder ? <span style={{ color: 'var(--warn)', fontWeight: 600, fontSize: 12 }}>Low</span> : <span style={{ color: 'var(--good)', fontWeight: 600, fontSize: 12 }}>OK</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {alerts.length > 0 && (
          <div style={{ marginTop: 14, padding: 14, background: 'rgba(196,69,47,.06)', border: '1px solid var(--clay)', borderRadius: 12 }}>
            <div style={{ fontWeight: 700, color: 'var(--danger)', fontSize: 13.5 }}>Supplier alerts</div>
            {alerts.map((a) => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{ fontSize: 13 }}>{a.name} — {a.quantity} left {a.supplierName ? `· ${a.supplierName}` : ''}</span>
                {a.supplierPhone && <a href={`tel:${a.supplierPhone}`} style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--forest-deep)', background: 'var(--gold)', padding: '6px 12px', borderRadius: 9, textDecoration: 'none' }}>Call supplier ↗</a>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={card}>
        <h2 className="display" style={{ fontWeight: 600, fontSize: 20 }}>Financial suggestions</h2>
        <ul style={{ marginTop: 10, paddingLeft: 18, color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.7 }}>
          {tips.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div style={{ background: 'var(--bone)', border: '1px solid var(--line)', borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 11, color: 'var(--dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</div>
      <div className="mono" style={{ fontSize: 20, fontWeight: 600, color: accent ?? 'var(--forest-deep)', marginTop: 4 }}>KES {formatMoney(value)}</div>
    </div>
  );
}

const lab: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--dim)', marginBottom: 6 };
const inp: React.CSSProperties = { width: '100%', padding: '11px 12px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--bone)', fontFamily: 'inherit', fontSize: 14, color: 'var(--ink)' };
const btnGold: React.CSSProperties = { padding: '12px 20px', borderRadius: 10, border: 'none', background: 'var(--gold)', color: 'var(--forest-deep)', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' };
const td: React.CSSProperties = { padding: '10px', borderBottom: '1px solid var(--line)' };
