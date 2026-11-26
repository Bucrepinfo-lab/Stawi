import { notFound } from 'next/navigation';
import { formatMoney } from '@stawi/core';
import { dbEnabled } from '@/lib/data';
import { BackLink } from '@/components/BackLink';
import { PrintButton } from './PrintButton';
import { historyFor } from './access';

export const dynamic = 'force-dynamic';

/**
 * My payment history (owner 26/11/26): every contribution in my name in this
 * group, with date, amount, way and a running total — to keep, print or save
 * as PDF, or download for a spreadsheet. Officials may open any member's.
 */
export default async function HistoryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ member?: string }> }) {
  const { id } = await params;
  const { member } = await searchParams;
  if (!dbEnabled()) notFound();
  const access = await historyFor(id, member);
  if (!access) notFound();
  const { loadMemberHistory } = await import('@/lib/money-trust');
  const h = await loadMemberHistory(id, access.ids);
  let others: { id: string; fullName: string }[] = [];
  if (access.official) {
    const { prisma } = await import('@stawi/db');
    others = await prisma.membership.findMany({ where: { groupId: id }, select: { id: true, fullName: true }, orderBy: { rotationOrder: 'asc' } });
  }
  const today = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const printed = `${p(today.getDate())}/${p(today.getMonth() + 1)}/${String(today.getFullYear()).slice(2)}`;
  const csvHref = `/groups/${encodeURIComponent(id)}/history/csv${member ? `?member=${encodeURIComponent(member)}` : ''}`;
  return (
    <main className="pillar-1 hist" style={{ maxWidth: 820, margin: '0 auto', padding: '28px 24px 90px' }}>
      <BackLink fallback={`/groups/${id}`} />
      <p className="hist-kicker">{h.groupName} · Payment history</p>
      <h1 className="display" style={{ fontWeight: 600, fontSize: 32, marginTop: 6 }}>{h.memberName}</h1>
      <p style={{ color: 'var(--ink-2)', marginTop: 6 }}>
        Every contribution recorded in this name{h.first ? `, from ${h.first} to ${h.last}` : ''}. Printed {printed}.
      </p>

      <div className="hist-summary">
        <div><span>Total contributed</span><strong className="mono">KES {formatMoney(h.totalCents)}</strong></div>
        <div><span>Payments</span><strong className="mono">{h.count}</strong></div>
      </div>

      <div className="hist-actions no-print">
        <PrintButton />
        <a className="mr-btn" href={csvHref} download>Download for Excel (CSV)</a>
        {access.official && others.length > 1 && (
          <form method="get" className="hist-pick">
            <label htmlFor="hist-member" className="mr-meta">Officials: see a member&rsquo;s history</label>
            <select id="hist-member" name="member" defaultValue={member ?? ''} className="mr-input">
              <option value="">My own</option>
              {others.map((o) => <option key={o.id} value={o.id}>{o.fullName}</option>)}
            </select>
            <button type="submit" className="mr-btn">Show</button>
          </form>
        )}
      </div>

      {h.lines.length === 0 ? (
        <p className="mr-empty" style={{ marginTop: 18 }}>No contributions are recorded in this name yet.</p>
      ) : (
        <div className="hist-table-wrap">
          <table className="hist-table">
            <thead>
              <tr><th>Date</th><th>Way</th><th>Reference</th><th className="num">Amount (KES)</th><th className="num">Running total</th></tr>
            </thead>
            <tbody>
              {h.lines.map((l) => (
                <tr key={l.id} className={l.isCorrection ? 'corr' : undefined}>
                  <td className="mono">{l.date}</td>
                  <td>{l.way}{l.witnessed ? <small> · witnessed {l.witnessed}</small> : null}</td>
                  <td className="mono">{l.ref ?? '—'}</td>
                  <td className="num mono">{l.amountCents < 0 ? '−' : ''}{formatMoney(Math.abs(l.amountCents))}</td>
                  <td className="num mono">{formatMoney(l.runningCents)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={3}>Total</td><td className="num mono">{formatMoney(h.totalCents)}</td><td /></tr>
            </tfoot>
          </table>
        </div>
      )}
      <p className="mr-meta" style={{ marginTop: 14 }}>
        A correction shows as its own line, approved by five members; the original entry is never changed. Questions about a line? Use &ldquo;That&rsquo;s wrong&rdquo; on the Money record.
      </p>
    </main>
  );
}
