import { notFound } from 'next/navigation';
import { EARNING_WORDS, formatMoney, groupEarningsCsv, type EarningState } from '@stawi/core';
import { dbEnabled } from '@/lib/data';
import { myMembershipIds } from '@/lib/group-access';
import { LiveRefresh } from '@/components/LiveRefresh';

export const dynamic = 'force-dynamic';

/**
 * Group earnings (owner 28/11/26): "where did the fines go?" answered for
 * every member. The table banking extra and every fine, each with who, when
 * and why. Open to every member, because the money is everyone's. Read-only.
 */
const kes = (c: number) => `KES ${formatMoney(Math.abs(c))}`;
const ddmmyy = (iso: string) => (/^\d{4}-\d{2}-\d{2}/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}` : iso || '—');
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthName = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1] ?? ym} ${ym.slice(0, 4)}`;
const TONE: Record<EarningState, { bg: string; fg: string }> = {
  in: { bg: 'rgba(47,133,90,.12)', fg: 'var(--good)' },
  coming: { bg: 'rgba(224,163,46,.16)', fg: 'var(--gold-deep)' },
  late: { bg: 'rgba(196,69,47,.12)', fg: 'var(--danger)' },
  draft: { bg: 'var(--bone-2)', fg: 'var(--ink-2)' },
  short: { bg: 'rgba(196,69,47,.12)', fg: 'var(--danger)' },
};

export default async function EarningsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!dbEnabled()) notFound();
  const mine = await myMembershipIds(id);
  if (mine.length === 0) notFound();
  const { prisma } = await import('@stawi/db');
  const group = await prisma.group.findUnique({ where: { id }, select: { name: true } });
  if (!group) notFound();
  const { loadGroupEarnings } = await import('@/lib/group-earnings');
  const e = await loadGroupEarnings(id);
  const csv = `data:text/csv;charset=utf-8,${encodeURIComponent(groupEarningsCsv(e))}`;

  return (
    <main className="pillar-1" style={{ maxWidth: 860, margin: '0 auto', padding: '28px max(16px, 3vw) 110px' }}>
      <LiveRefresh channel={`g:${id}`} />
      <a href={`/groups/${id}`} className="back-link no-print">← {group.name}</a>
      <p style={{ fontSize: 12.5, color: 'var(--gold-deep)', fontWeight: 700, marginTop: 12 }}>Open to every member</p>
      <h1 className="display" style={{ fontWeight: 600, fontSize: 32, marginTop: 4 }}>Group earnings</h1>
      <p style={{ color: 'var(--ink-2)', marginTop: 6, maxWidth: 620 }}>
        Money the group itself earned: the extra members bring back in table banking, and fines. Every shilling shows who, when and why, so nobody has to ask where it went.
      </p>

      <section className="ge-hero">
        <span className="ge-label">Earned by {group.name}</span>
        <strong className="mono ge-big">{kes(e.inCents)}</strong>
        <div className="ge-tiles">
          <div><span>Extra from table banking</span><b className="mono">{kes(e.roundInCents)}</b></div>
          <div><span>Fines</span><b className="mono">{kes(e.finesInCents)}</b></div>
          <div><span>Still to come</span><b className="mono">{kes(e.comingCents)}</b>{e.lateCents > 0 && <small>{kes(e.lateCents)} of it is late</small>}</div>
        </div>
      </section>

      {(e.draftCents > 0 || e.shortCents > 0) && (
        <div className="ge-notes">
          {e.draftCents > 0 && <p><b>{kes(e.draftCents)} in fines is not final yet.</b> It is in meeting minutes that are not posted. It counts once the secretary posts them.</p>}
          {e.shortCents > 0 && <p><b>{kes(e.shortCents)} was brought back short.</b> Some members returned less than they took. It is taken off the earnings until it is paid.</p>}
        </div>
      )}

      {e.lines.length === 0 ? (
        <section className="ge-card">
          <h2 className="display">Nothing earned yet</h2>
          <p className="mr-meta">Earnings appear here by themselves when a member brings back table banking money with the extra, or when fines are written in the meeting minutes.</p>
          <p style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
            <a className="mr-btn" href={`/groups/${id}/round`}>Open the table banking round</a>
          </p>
        </section>
      ) : (
        <>
          {e.byMonth.length > 0 && (
            <section className="ge-card">
              <h2 className="display">Month by month</h2>
              <div className="ge-scroll">
                <table className="ge-table">
                  <thead><tr><th>Month</th><th>Table banking extra</th><th>Fines</th><th>Total</th></tr></thead>
                  <tbody>
                    {e.byMonth.map((m) => (
                      <tr key={m.month}><td>{monthName(m.month)}</td><td className="mono">{m.roundCents < 0 ? '−' : ''}{kes(m.roundCents)}</td><td className="mono">{kes(m.finesCents)}</td><td className="mono"><b>{kes(m.roundCents + m.finesCents)}</b></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="ge-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 className="display">Every shilling, traced</h2>
              <a className="mr-btn" href={csv} download={`${group.name.replace(/[^\w-]+/g, '-')}-earnings.csv`}>Download (Excel)</a>
            </div>
            <ul className="ge-lines">
              {e.lines.map((l, i) => (
                <li key={i}>
                  <div className="ge-l1">
                    <span className="ge-who">{l.who}</span>
                    <span className={`mono ge-amt${l.amountCents < 0 ? ' neg' : ''}`}>{l.amountCents < 0 ? '−' : '+'}{kes(l.amountCents)}</span>
                  </div>
                  <div className="ge-l2">
                    <span>{ddmmyy(l.date)} · {l.kind === 'round' ? 'Table banking' : 'Fine'} · {l.why}</span>
                    <span className="ge-chip" style={{ background: TONE[l.state].bg, color: TONE[l.state].fg }}>{EARNING_WORDS[l.state]}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <p className="mr-meta" style={{ marginTop: 16 }}>
        This is a record of what your group wrote down: the round book and the meeting minutes. Stawi never holds, moves or shares out this money; the group decides together what to do with it.
      </p>
      <style>{`
        .ge-hero{margin-top:18px;background:var(--forest-deep);color:var(--bone);border-radius:18px;padding:18px;display:grid;gap:6px}
        .ge-label{font-size:13px;opacity:.85}
        .ge-big{font-size:clamp(30px,9vw,42px);font-weight:600;color:var(--gold)}
        .ge-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:6px}
        .ge-tiles>div{background:rgba(255,255,255,.08);border-radius:12px;padding:10px 12px;display:grid;gap:2px}
        .ge-tiles span{font-size:12.5px;opacity:.85}.ge-tiles b{font-size:17px}.ge-tiles small{font-size:12px;color:#f3c38a}
        .ge-notes{margin-top:12px;padding:10px 14px;border-radius:12px;background:rgba(224,163,46,.12);border:1px solid rgba(224,163,46,.45);font-size:13.5px}
        .ge-notes p{margin:4px 0}
        .ge-card{margin-top:14px;background:var(--paper);border:1px solid var(--line);border-radius:16px;padding:16px;min-width:0}
        .ge-card h2{font-size:20px;font-weight:600;margin:0 0 8px}
        .ge-scroll{overflow-x:auto}
        .ge-table{border-collapse:collapse;width:100%;min-width:420px;font-size:13.5px}
        .ge-table th,.ge-table td{text-align:left;padding:8px 6px;border-bottom:1px solid var(--line)}
        .ge-table th{font-size:12.5px;color:var(--dim);font-weight:700}
        .ge-lines{list-style:none;margin:6px 0 0;padding:0;display:grid}
        .ge-lines li{padding:10px 0;border-bottom:1px solid var(--line);display:grid;gap:3px}
        .ge-l1,.ge-l2{display:flex;justify-content:space-between;gap:10px;align-items:baseline}
        .ge-who{font-weight:700;font-size:14.5px;min-width:0}
        .ge-amt{font-weight:700;color:var(--good);white-space:nowrap}.ge-amt.neg{color:var(--danger)}
        .ge-l2 span:first-child{font-size:12.5px;color:var(--ink-2);min-width:0}
        .ge-chip{font-size:11.5px;font-weight:700;padding:2px 8px;border-radius:99px;white-space:nowrap}
      `}</style>
    </main>
  );
}
