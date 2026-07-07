'use client';

import type { ReceiptModel } from '@stawi/core';

export function ReceiptView({ model }: { model: ReceiptModel }) {
  const row = (label: string, value: string, strong = false) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
      <span style={{ color: 'var(--dim)', fontSize: 13 }}>{label}</span>
      <span className={strong ? 'mono' : undefined} style={{ fontWeight: strong ? 700 : 600, fontSize: strong ? 18 : 14, color: strong ? 'var(--forest-deep)' : 'var(--ink)' }}>{value}</span>
    </div>
  );

  return (
    <main style={{ maxWidth: 520, margin: '0 auto', padding: '32px 24px 80px' }}>
      <style>{`@media print { .no-print { display: none !important; } body { background: #fff; } }`}</style>

      <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: 28, boxShadow: 'var(--shadow)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid var(--forest-deep)', paddingBottom: 14 }}>
          <div className="display" style={{ fontWeight: 600, fontSize: 22, color: 'var(--forest-deep)' }}>Stawi</div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700 }}>Payment Receipt</div>
            <div className="mono" style={{ fontSize: 13, color: 'var(--ink)', marginTop: 2 }}>{model.receiptNo}</div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          {row('Group', model.groupName)}
          {row('Member', model.memberName)}
          {row('Date', model.dateDisplay)}
          {row('Channel', model.channelLabel)}
          {row('Reference', model.reference)}
          {row('Amount paid', model.amountDisplay, true)}
          {row('Running capital', model.runningCapitalDisplay)}
        </div>

        <div style={{ marginTop: 18, padding: 12, background: 'var(--bone-2)', borderRadius: 10, fontSize: 12, color: 'var(--dim)', textAlign: 'center' }}>
          Acknowledged by Stawi · Keep this receipt for your records.
        </div>
      </div>

      <div className="no-print" style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'center' }}>
        <button
          onClick={() => window.print()}
          style={{ padding: '12px 22px', borderRadius: 12, border: 'none', background: 'var(--gold)', color: 'var(--forest-deep)', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          ↓ Download / Print PDF
        </button>
        <a href="/dashboard" style={{ padding: '12px 22px', borderRadius: 12, border: '1px solid var(--line)', color: 'var(--forest-deep)', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
          Back to dashboard
        </a>
      </div>
      <p className="no-print" style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: 'var(--dim)' }}>
        Use your browser&rsquo;s &ldquo;Save as PDF&rdquo; in the print dialog to download.
      </p>
    </main>
  );
}
