import { notFound } from 'next/navigation';
import { RESTOCK_STATUS, type RestockStatus } from '@stawi/core';
import { dbEnabled } from '@/lib/data';
import { BackLink } from '@/components/BackLink';
import { myPhoneKey } from '../actions';
import { AnswerOrder } from './AnswerOrder';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Order from a shop · Stawi' };

/** One restock request, opened by its supplier (from the WhatsApp link or the phone alert). */
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!dbEnabled()) notFound();
  const key = await myPhoneKey();
  const { prisma } = await import('@stawi/db');
  const r = key ? await prisma.bizRestockRequest.findFirst({ where: { id, supplierPhoneKey: key } }) : null;
  if (!r) {
    return (
      <main className="pillar-3" style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 110px' }}>
        <BackLink fallback="/orders" />
        <h1 className="display" style={{ fontSize: 26, fontWeight: 600, marginTop: 10 }}>Order from a shop</h1>
        <p className="bk-note" style={{ marginTop: 10 }}>This order was sent to a different phone number. Sign in with the number the shop has for you.</p>
      </main>
    );
  }
  // The shop sees "Seen by the supplier" once the supplier opens it.
  if (r.status === 'SENT') await prisma.bizRestockRequest.update({ where: { id: r.id }, data: { status: 'SEEN', seenAt: new Date() } }).catch(() => undefined);
  const status = (r.status === 'SENT' ? 'SEEN' : r.status) as RestockStatus;
  const shopPhone = (await prisma.membership.findUnique({ where: { id: r.createdByMembershipId }, select: { phone: true } }).catch(() => null))?.phone ?? null;
  const lines = (r.lines as { name: string; unit: string; qty: number | null }[]) ?? [];
  return (
    <main className="pillar-3" style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 110px' }}>
      <BackLink fallback="/orders" />
      <p className="bk-kicker" style={{ marginTop: 10 }}>Order from a shop</p>
      <h1 className="display" style={{ fontSize: 28, fontWeight: 600 }}>{r.shopName}</h1>
      <p style={{ color: 'var(--ink-2)' }}>{r.branchLabel} · asked by {r.createdByName}</p>
      <table className="bk-table" style={{ marginTop: 14 }}>
        <thead><tr><th>Item</th><th>How many</th></tr></thead>
        <tbody>{lines.map((l, i) => <tr key={i}><td>{l.name}</td><td className="mono">{l.qty === null ? 'You advise' : `${l.qty} ${l.unit}`}</td></tr>)}</tbody>
      </table>
      {r.note && <p className="bk-warn" style={{ marginTop: 12 }}>{r.note}</p>}
      <p style={{ marginTop: 12 }}><span className={`rs-status rs-${status.toLowerCase()}`}>{RESTOCK_STATUS[status].en}</span>{r.deliverOn ? <> · delivery {r.deliverOn.slice(8, 10)}/{r.deliverOn.slice(5, 7)}/{r.deliverOn.slice(2, 4)}</> : null}</p>
      <AnswerOrder requestId={r.id} status={status} shopPhone={shopPhone} shopName={r.shopName} />
    </main>
  );
}
