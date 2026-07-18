'use client';

import { useMemo, useState } from 'react';
import {
  reconcile,
  classifyStock,
  financialSuggestions,
  computeBusinessTaxes,
  formatMoney,
  buildBusinessPack,
  buildPosReceipt,
  ledgerCsv,
  stockCsv,
  taxCsv,
  criticalStockAlerts,
  acknowledgeAlert,
  ackFor,
  feedbackLabel,
  ALERT_FEEDBACK_OPTIONS,
  type LedgerEntry,
  type StockItem,
  type Period,
  type EntryType,
  type Industry,
  type BusinessAccountingPack,
  type SupplierLink,
  type PosReceiptModel,
  type AlertAck,
  type AlertFeedback,
} from '@stawi/core';
import { addLedgerEntryAction } from '@/app/actions';

export interface BooksProps {
  businessId?: string;
  businessName: string;
  vatRegistered: boolean;
  tourismSector: boolean;
  initialEntries: LedgerEntry[];
  stock: StockItem[];
  /** Business sector — drives supplier matching. Defaults to retail. */
  industry?: Industry;
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

export function Books({ businessId, businessName, vatRegistered, tourismSector, initialEntries, stock, industry = 'retail' }: BooksProps) {
  const [entries, setEntries] = useState<LedgerEntry[]>(initialEntries);
  const [period, setPeriod] = useState<Period>('day');
  const [type, setType] = useState<EntryType>('SALE');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [acks, setAcks] = useState<AlertAck[]>([]);
  const [receipt, setReceipt] = useState<PosReceiptModel | null>(null);

  const pnl = useMemo(() => reconcile(entries, period, new Date()), [entries, period]);
  const insights = useMemo(() => classifyStock(stock), [stock]);
  const critical = useMemo(() => criticalStockAlerts(insights), [insights]);

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

  // Pre-packed business accounting pack: toolkit + owner metrics + supplier links.
  const pack = useMemo(
    () => buildBusinessPack({ businessId: businessId ?? businessName, name: businessName, industry, vatRegistered, tourismSector }, entries, stock),
    [businessId, businessName, industry, vatRegistered, tourismSector, entries, stock],
  );

  function addEntry() {
    const cents = Math.round((parseFloat(amount) || 0) * 100);
    if (cents <= 0) return;
    const id = Math.random().toString(36).slice(2);
    const description = desc || type;
    setEntries((prev) => [
      { id, type, description, amountCents: cents, occurredAt: new Date() },
      ...prev,
    ]);
    // A sale produces a printable receipt.
    if (type === 'SALE') {
      setReceipt(
        buildPosReceipt({
          businessName,
          saleId: id,
          dateISO: new Date().toISOString(),
          amountCents: cents,
          taxCents: vatRegistered ? Math.round((cents * 0.16) / 1.16) : 0,
          paymentMethod: 'CASH',
        }),
      );
    }
    // Persist when a DB is configured (no-op on seed data).
    void addLedgerEntryAction({ businessId, type, description, amountCents: cents }).catch(() => {});
    setAmount('');
    setDesc('');
  }

  function saveCsv(name: string, text: string) {
    if (typeof window === 'undefined') return;
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function printReceipt() {
    if (typeof document === 'undefined') return;
    document.body.classList.add('books-printing');
    window.print();
    setTimeout(() => document.body.classList.remove('books-printing'), 400);
  }

  function acknowledge(itemId: string, feedback: AlertFeedback) {
    setAcks((prev) => [...prev.filter((a) => a.itemId !== itemId), acknowledgeAlert(itemId, feedback)]);
  }

  return (
    <>
    <div id="books-root">
      <BusinessPackPanel pack={pack} />

      {/* Downloadable tools */}
      <div style={{ ...card, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--dim)' }}>Download</span>
        <button onClick={() => saveCsv('stawi-ledger.csv', ledgerCsv(entries))} style={dlBtn}>⬇ Ledger CSV</button>
        <button onClick={() => saveCsv('stawi-stock.csv', stockCsv(insights))} style={dlBtn}>⬇ Stock CSV</button>
        <button onClick={() => saveCsv('stawi-tax.csv', taxCsv(taxes))} style={dlBtn}>⬇ Tax report CSV</button>
        {receipt && <button onClick={printReceipt} style={{ ...dlBtn, background: 'var(--gold)', borderColor: 'var(--gold)' }}>🖨 Print last receipt ({receipt.receiptNo})</button>}
      </div>

      {/* Last sale receipt */}
      {receipt && (
        <div style={{ ...card, borderStyle: 'dashed' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="display" style={{ fontWeight: 600, fontSize: 18 }}>Receipt {receipt.receiptNo}</h2>
            <button onClick={printReceipt} style={btnGold}>🖨 Print</button>
          </div>
          {receipt.lines.map((l, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 13.5 }}>
              <span style={{ color: 'var(--ink-2)' }}>{l.qty}× {l.name} @ {l.unitDisplay}</span>
              <span className="mono">{l.lineDisplay}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--line)', fontSize: 13 }}>
            <span style={{ color: 'var(--dim)' }}>VAT</span><span className="mono">{receipt.taxDisplay}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontWeight: 700 }}>
            <span>Total</span><span className="mono" style={{ color: 'var(--forest-deep)' }}>{receipt.totalDisplay}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 4 }}>Paid by {receipt.paymentLabel} · {receipt.dateDisplay}</div>
        </div>
      )}

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

        {critical.length > 0 && (
          <div style={{ marginTop: 14, padding: 14, background: 'rgba(196,69,47,.06)', border: '1px solid var(--clay)', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontWeight: 700, color: 'var(--danger)', fontSize: 13.5 }}>Critical stock alerts</div>
              <span style={{ fontSize: 12, color: 'var(--dim)' }}>{critical.filter((c) => !ackFor(c.itemId, acks)).length} awaiting action</span>
            </div>
            {critical.map((a) => {
              const ack = ackFor(a.itemId, acks);
              const stk = stock.find((s) => s.id === a.itemId);
              return (
                <div key={a.itemId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(196,69,47,.18)' }}>
                  <span style={{ fontSize: 13 }}>
                    {a.critical && <b style={{ color: 'var(--danger)' }}>⚠ </b>}
                    {a.itemName} — {a.quantity} left (level {a.reorderLevel}){stk?.supplierName ? ` · ${stk.supplierName}` : ''}
                  </span>
                  {ack ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--forest-deep)', background: 'rgba(47,133,90,.14)', padding: '3px 9px', borderRadius: 8 }}>✓ {feedbackLabel(ack.feedback)}</span>
                      <button onClick={() => setAcks((prev) => prev.filter((x) => x.itemId !== a.itemId))} style={{ ...dlBtn, padding: '5px 10px' }}>Undo</button>
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <select id={`fb-${a.itemId}`} defaultValue="REORDERED" style={{ ...inp, width: 'auto', padding: '7px 10px' }}>
                        {ALERT_FEEDBACK_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                      </select>
                      <button
                        onClick={() => {
                          const el = document.getElementById(`fb-${a.itemId}`) as HTMLSelectElement | null;
                          acknowledge(a.itemId, (el?.value as AlertFeedback) ?? 'REORDERED');
                        }}
                        style={btnGold}
                      >Acknowledge</button>
                      {stk?.supplierPhone
                        ? <a href={`tel:${stk.supplierPhone}`} style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--forest-deep)', border: '1px solid var(--line)', padding: '6px 12px', borderRadius: 9, textDecoration: 'none' }}>Order ↗</a>
                        : <a href="/match" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--forest-deep)', border: '1px solid var(--line)', padding: '6px 12px', borderRadius: 9, textDecoration: 'none' }}>Find supplier ↗</a>}
                    </span>
                  )}
                </div>
              );
            })}
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

      <div id="books-print-portal">{receipt && <PrintReceipt r={receipt} businessName={businessName} />}</div>
      <style>{`#books-print-portal{display:none} @media print { body.books-printing #books-root{display:none} body.books-printing #books-print-portal{display:block} }`}</style>
    </>
  );
}

function PrintReceipt({ r, businessName }: { r: PosReceiptModel; businessName: string }) {
  return (
    <div style={{ maxWidth: 360, margin: '0 auto', fontFamily: 'ui-monospace, monospace', color: '#111', padding: 20 }}>
      <div style={{ textAlign: 'center', borderBottom: '2px dashed #999', paddingBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{businessName}</div>
        <div style={{ fontSize: 11 }}>Sales Receipt · {r.receiptNo}</div>
        <div style={{ fontSize: 11 }}>{r.dateDisplay}</div>
      </div>
      <div style={{ marginTop: 8 }}>
        {r.lines.map((l, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '3px 0' }}>
            <span>{l.qty} × {l.name}</span><span>{l.lineDisplay}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '3px 0' }}><span>VAT</span><span>{r.taxDisplay}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px dashed #999', marginTop: 8, paddingTop: 8, fontWeight: 700 }}><span>TOTAL</span><span>{r.totalDisplay}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '3px 0' }}><span>Payment</span><span>{r.paymentLabel}</span></div>
      </div>
      <div style={{ textAlign: 'center', marginTop: 12, fontSize: 11 }}>Asante sana — powered by Stawi</div>
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

// ───────────────── Pre-packed business accounting pack (Pillar 3) ─────────────────
// Everything a business owner gets on activation: the toolkit, the owner
// analytics metrics, and demand→supply supplier links — from one source.

function KpiChip({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div style={{ background: 'var(--bone)', border: '1px solid var(--line)', borderRadius: 11, padding: '11px 13px' }}>
      <div style={{ fontSize: 10.5, color: 'var(--dim)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
      <div className="mono" style={{ fontSize: 17, fontWeight: 700, color: tone ?? 'var(--forest-deep)', marginTop: 3 }}>{value}</div>
    </div>
  );
}

function BusinessPackPanel({ pack }: { pack: BusinessAccountingPack }) {
  const m = pack.metrics;
  const kes = (c: number) => `KES ${formatMoney(c)}`;
  return (
    <div style={{ ...card, marginTop: 0, background: 'linear-gradient(135deg, var(--forest-deep), var(--forest))', color: 'var(--bone)', border: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ maxWidth: 560 }}>
          <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', opacity: .82 }}>Business accounting — pre-packed</div>
          <h2 className="display" style={{ fontSize: 22, fontWeight: 600, margin: '5px 0 6px' }}>{pack.name}</h2>
          <p style={{ fontSize: 13.5, lineHeight: 1.55, opacity: .92 }}>
            POS, QuickBooks-style books, inventory, tax and supplier links — all ready to use. {pack.readinessPct}% of your toolkit is live with data.
          </p>
        </div>
        <div style={{ textAlign: 'center', minWidth: 96 }}>
          <div className="mono" style={{ fontSize: 34, fontWeight: 800, lineHeight: 1 }}>{pack.readinessPct}%</div>
          <div style={{ fontSize: 11, opacity: .85, marginTop: 3 }}>activated</div>
        </div>
      </div>

      {/* Pre-packed toolkit checklist */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 8, marginTop: 14 }}>
        {pack.tools.map((t) => (
          <div key={t.id} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', background: 'rgba(255,255,255,.09)', borderRadius: 10, padding: '9px 11px' }}>
            <span aria-hidden style={{ fontSize: 14 }}>{t.active ? '✅' : '⬜'}</span>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700 }}>{t.label}</div>
              <div style={{ fontSize: 11, opacity: .8 }}>{t.detail}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Owner analytics metrics */}
      <div style={{ background: 'var(--paper)', color: 'var(--ink)', borderRadius: 12, padding: 14, marginTop: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--forest-deep)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>Owner metrics</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: 9 }}>
          <KpiChip label="Revenue" value={kes(m.revenueCents)} />
          <KpiChip label="Gross margin" value={`${m.grossMarginPct}%`} />
          <KpiChip label="Net profit" value={kes(m.netProfitCents)} tone={m.netProfitCents >= 0 ? 'var(--good)' : 'var(--danger)'} />
          <KpiChip label="Net margin" value={`${m.netMarginPct}%`} />
          <KpiChip label="Avg sale" value={kes(m.averageSaleCents)} />
          <KpiChip label="Expense ratio" value={`${m.expenseRatioPct}%`} />
          <KpiChip label="Est. tax" value={kes(m.estimatedTaxCents)} />
          <KpiChip label="Stock units" value={String(m.inventoryUnits)} />
          <KpiChip label="To reorder" value={`${m.reorderCount}${m.criticalCount ? ` · ${m.criticalCount} crit` : ''}`} tone={m.criticalCount ? 'var(--danger)' : undefined} />
        </div>
      </div>

      {/* Demand → supply links */}
      {(pack.supplierLinks.length > 0 || pack.recommendedSuppliers.length > 0) && (
        <div style={{ background: 'var(--paper)', color: 'var(--ink)', borderRadius: 12, padding: 14, marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--forest-deep)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>Suppliers · demand → supply</div>
          {pack.supplierLinks.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--dim)' }}>No reorders needed right now — stock levels are healthy.</div>}
          {pack.supplierLinks.map((s: SupplierLink) => (
            <div key={s.itemId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
              <span style={{ fontSize: 13 }}>
                {s.critical && <span style={{ color: 'var(--danger)', fontWeight: 800 }}>⚠ </span>}
                {s.itemName} — {s.quantity} left{s.supplierName ? ` · ${s.supplierName}` : ''}
              </span>
              {s.action.kind === 'order'
                ? <a href={`tel:${s.action.supplierPhone}`} style={{ fontSize: 12, fontWeight: 700, color: 'var(--forest-deep)', background: 'var(--gold)', padding: '6px 12px', borderRadius: 9, textDecoration: 'none', whiteSpace: 'nowrap' }}>Order ↗</a>
                : <a href={s.action.href} style={{ fontSize: 12, fontWeight: 700, color: 'var(--forest-deep)', border: '1px solid var(--line)', padding: '6px 12px', borderRadius: 9, textDecoration: 'none', whiteSpace: 'nowrap' }}>Find supplier ↗</a>}
            </div>
          ))}
          {pack.recommendedSuppliers.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11.5, color: 'var(--dim)', marginBottom: 6 }}>Matched supplier partners for your sector:</div>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {pack.recommendedSuppliers.map((v, i) => (
                  <a key={i} href="/match" title={v.description} style={{ fontSize: 12, fontWeight: 600, color: 'var(--forest-deep)', background: 'var(--bone-2)', border: '1px solid var(--line)', padding: '5px 11px', borderRadius: 999, textDecoration: 'none' }}>{v.title}</a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const lab: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--dim)', marginBottom: 6 };
const inp: React.CSSProperties = { width: '100%', padding: '11px 12px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--bone)', fontFamily: 'inherit', fontSize: 14, color: 'var(--ink)' };
const btnGold: React.CSSProperties = { padding: '12px 20px', borderRadius: 10, border: 'none', background: 'var(--gold)', color: 'var(--forest-deep)', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' };
const dlBtn: React.CSSProperties = { padding: '8px 13px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--bone)', color: 'var(--forest-deep)', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' };
const td: React.CSSProperties = { padding: '10px', borderBottom: '1px solid var(--line)' };
