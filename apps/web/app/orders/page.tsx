import { RESTOCK_STATUS, type RestockStatus } from '@stawi/core';
import { dbEnabled } from '@/lib/data';
import { BackLink } from '@/components/BackLink';
import { Picture } from '@/components/Pictures';
import { myPhoneKey } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Orders from shops · Stawi' };

const dmy = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}`;

/**
 * Orders from shops (owner 28/11/26): every restock request sent to the phone
 * number this supplier signed in with, newest first.
 */
export default async function OrdersPage() {
  const key = dbEnabled() ? await myPhoneKey() : null;
  const { prisma } = await import('@stawi/db');
  const rows = key ? await prisma.bizRestockRequest.findMany({ where: { supplierPhoneKey: key }, orderBy: { createdAt: 'desc' }, take: 100 }) : [];
  const open = rows.filter((r) => RESTOCK_STATUS[r.status as RestockStatus]?.open);
  return (
    <main className="pillar-3" style={{ maxWidth: 760, margin: '0 auto', padding: '20px 16px 110px' }}>
      <BackLink fallback="/business" />
      <div className="bk-sheet-head" style={{ marginTop: 8 }}>
        <Picture name="box" size={44} />
        <div>
          <h1 className="display" style={{ fontSize: 28, fontWeight: 600 }}>Orders from shops</h1>
          <p style={{ color: 'var(--ink-2)' }}>Shops that buy from you ask for goods here. Confirm, say when you will deliver, and they see it at once.</p>
        </div>
      </div>
      {!key && <p className="bk-note" style={{ marginTop: 16 }}>Sign in with the phone number the shops have for you to see their orders.</p>}
      {key && rows.length === 0 && <p className="bk-note" style={{ marginTop: 16 }}>No orders yet. When a shop that uses Stawi runs low on goods you supply, its request shows here and on your phone.</p>}
      {rows.length > 0 && <p className="bk-note" style={{ marginTop: 16 }}>{open.length} waiting for you.</p>}
      <ul className="bk-book" style={{ marginTop: 10 }}>
        {rows.map((r) => {
          const lines = (r.lines as { name: string; unit: string; qty: number | null }[]) ?? [];
          const st = RESTOCK_STATUS[r.status as RestockStatus];
          return (
            <li key={r.id} className={st?.open ? '' : 'fixed'}>
              <a href={`/orders/${r.id}`} style={{ color: 'inherit', textDecoration: 'none', display: 'grid', gap: 3 }}>
                <div className="bk-book-main"><strong>{r.shopName}</strong><span className={`rs-status rs-${r.status.toLowerCase()}`}>{st?.en ?? r.status}</span></div>
                <small>{r.branchLabel} · {dmy(r.createdAt)}</small>
                <small>{lines.map((l) => `${l.name}${l.qty === null ? '' : ` × ${l.qty} ${l.unit}`}`).join(', ')}</small>
              </a>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
