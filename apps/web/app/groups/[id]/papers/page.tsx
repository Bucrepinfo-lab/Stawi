import { notFound } from 'next/navigation';
import {
  HOUSE_PURPOSES, checkPurpose, computePnL, formatMoney, houseRoomName, monthLabel, paraphraseMinutes,
  postedMeetings, reconcilePostedMonth, statementMonths, escalationToday, harmoniseMoney, stepLabel, type LedgerEntry,
} from '@stawi/core';
import { loadGroupHouse } from '@/lib/house';
import { saccoPlusEnabled } from '@/lib/features';
import { PrintButton } from '@/components/PrintButton';
import { ReturnBar } from '@/components/ReturnBar';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Stawi' };

/**
 * The papers pack (owner 20/11/26): everything one purpose needs, taken from
 * what the group already wrote in its records and its books. Officials only —
 * it lists members' names and ID numbers. Print it, or save it as a PDF.
 */

const dmy = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}`;
const h2: React.CSSProperties = { fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 21, margin: '0 0 10px' };
const th: React.CSSProperties = { textAlign: 'left', padding: '7px 8px', borderBottom: '2px solid var(--line)', fontSize: 12.5 };
const td: React.CSSProperties = { padding: '7px 8px', borderBottom: '1px solid var(--line)', fontSize: 14, verticalAlign: 'top' };
const num: React.CSSProperties = { ...td, textAlign: 'right', fontFamily: 'var(--font-mono)' };

export default async function PapersPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ for?: string }> }) {
  const { id } = await params;
  const { for: wanted } = await searchParams;
  const house = await loadGroupHouse(id);
  if (!house || !house.canOpenPack) notFound();

  const purpose = HOUSE_PURPOSES.find((p) => p.id === wanted && (!p.needsSavingsCredit || saccoPlusEnabled())) ?? HOUSE_PURPOSES[0]!;
  const check = checkPurpose(house.documents, purpose);
  const needs = (docId: string) => purpose.needs.find((n) => n.doc === docId);
  const { charter, meetings } = house.cockpit;
  const today = escalationToday(charter.countryCode);
  const posted = postedMeetings(meetings).filter((m) => m.date).sort((a, b) => b.date.localeCompare(a.date));

  const minutesWanted = needs('minutes') ? Math.max(needs('minutes')!.atLeast ?? 1, 1) : 0;
  const minutes = posted.slice(0, minutesWanted);
  const decisions = needs('resolution')
    ? posted.flatMap((m) => m.agendas.filter((a) => a.resolution?.trim()).map((a) => ({ date: m.date, no: m.meetingNo, title: a.title, text: a.resolution.trim() })))
    : [];
  const monthsWanted = needs('statements') ? Math.max(needs('statements')!.atLeast ?? 3, 3) : 0;
  const months = statementMonths(meetings).slice(0, monthsWanted).map((ym) => {
    const [y, mo] = ym.split('-').map(Number);
    return { ym, s: reconcilePostedMonth(meetings, charter, { year: y!, month: mo! }) };
  });

  const showBusiness = !!house.business && (!!needs('business_books') || !!needs('business_profile'));
  const byMonth = new Map<string, LedgerEntry[]>();
  if (showBusiness) {
    house.business!.entries.forEach((e, i) => {
      const when = new Date(e.occurredAt);
      if (Number.isNaN(when.getTime())) return;
      const ym = when.toISOString().slice(0, 7);
      const list = byMonth.get(ym) ?? [];
      list.push({ id: String(i), type: e.type as LedgerEntry['type'], description: '', amountCents: e.amountCents, occurredAt: when });
      byMonth.set(ym, list);
    });
  }
  const bizMonths = [...byMonth.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12);

  // One statement for group and business together, with the checks that show it agrees.
  const money = harmoniseMoney({ meetings, entries: house.business?.entries ?? [] });
  const showTogether = monthsWanted > 0 && money.hasGroup && money.hasBusiness && showBusiness;

  const signers = (['Chairperson', 'Secretary', 'Treasurer'] as const).map((post) => ({
    post,
    name: charter.members.find((m) => m.designation === post)?.fullName ?? '',
  }));
  const sheet: React.CSSProperties = { background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: 22, boxShadow: 'var(--shadow)', marginTop: 16 };

  return (
    <main className={`pillar-${purpose.pillar}`} style={{ maxWidth: 860, margin: '0 auto', padding: '28px 24px 90px' }}>
      <style>{`@media print { .no-print, .app-tabs { display: none !important; } body { background: #fff !important; padding: 0 !important; } .print-doc { box-shadow: none !important; border: none !important; padding: 0 !important; break-inside: auto; } .page-break { break-before: page; } }`}</style>
      <a href={`/groups/${encodeURIComponent(id)}`} className="back-link no-print">← {house.groupName}</a>
      <ReturnBar href={`/groups/${encodeURIComponent(id)}`} label={house.groupName} />

      <section className="print-doc s-card" style={sheet}>
        <p style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase', fontWeight: 800, color: 'var(--gold-deep)' }}>{purpose.icon} {purpose.name.en}</p>
        <h1 className="display" style={{ fontWeight: 600, fontSize: 30, marginTop: 6 }}>{house.groupName}</h1>
        <p style={{ color: 'var(--ink-2)', marginTop: 6 }}>
          Papers taken from the group&rsquo;s own records and books kept in Stawi. Prepared on {dmy(today)}.
          {charter.registeredNumber ? ` Registration number: ${charter.registeredNumber}.` : ''}
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 14 }}>
          <thead><tr><th style={th}>Paper</th><th style={th}>What the group holds</th><th style={th}>From</th><th style={th}>Ready</th></tr></thead>
          <tbody>
            {check.lines.map((l) => (
              <tr key={l.doc.id}>
                <td style={td}><b>{l.doc.name.en}</b>{l.kind === 'helps' ? ' (helps)' : ''}</td>
                <td style={td}>{l.doc.have.en}{!l.ok && l.shortBy > 0 ? ` — ${l.shortBy} more needed` : ''}</td>
                <td style={td}>{houseRoomName(l.doc.room)}</td>
                <td style={td}>{l.ok ? 'Yes' : 'Not yet'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ marginTop: 12, fontWeight: 700 }}>{check.mustReady} of {check.mustTotal} needed papers are ready.</p>
        <div className="no-print" style={{ marginTop: 14 }}><PrintButton label="Print, or save as PDF" /></div>
        <p className="no-print" style={{ marginTop: 10, fontSize: 13.5, color: 'var(--dim)' }}>
          Inside Stawi these papers pass from one section to the next as they are. An outside office may still ask the officials to sign or stamp the printed copy; the last page leaves room for that.
        </p>
      </section>

      {(needs('officials') || needs('member_list') || needs('member_ids')) && (
        <section className="print-doc" style={sheet}>
          <h2 style={h2}>Officials and members</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>No.</th><th style={th}>Name</th><th style={th}>Post</th><th style={th}>ID number</th><th style={th}>Signature</th></tr></thead>
            <tbody>
              {charter.members.map((m) => (
                <tr key={m.id}><td style={td}>{m.serial}</td><td style={td}>{m.fullName}</td><td style={td}>{m.designation}</td><td style={td}>{m.idNumber ?? ''}</td><td style={{ ...td, minWidth: 110 }} /></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {needs('rules') && charter.constitution?.trim() && (
        <section className="print-doc page-break" style={sheet}>
          <h2 style={h2}>Group rules</h2>
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{charter.constitution.trim()}</p>
        </section>
      )}

      {decisions.length > 0 && (
        <section className="print-doc" style={sheet}>
          <h2 style={h2}>Decisions the group agreed</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>Date</th><th style={th}>Meeting</th><th style={th}>Matter</th><th style={th}>Decision</th></tr></thead>
            <tbody>
              {decisions.slice(0, 24).map((r, i) => (
                <tr key={i}><td style={td}>{dmy(r.date)}</td><td style={td}>{r.no}</td><td style={td}>{r.title}</td><td style={td}>{r.text}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {months.length > 0 && (
        <section className="print-doc" style={sheet}>
          <h2 style={h2}>Monthly money statements</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>Month</th><th style={th}>Meetings</th><th style={{ ...th, textAlign: 'right' }}>Money in</th><th style={{ ...th, textAlign: 'right' }}>Money out</th><th style={{ ...th, textAlign: 'right' }}>Left at month end</th></tr></thead>
            <tbody>
              {months.map(({ ym, s }) => (
                <tr key={ym}><td style={td}>{monthLabel(ym)}</td><td style={td}>{s.meetingsHeld}</td><td style={num}>{formatMoney(s.finance.totalInCents)}</td><td style={num}>{formatMoney(s.finance.totalOutCents)}</td><td style={num}>{formatMoney(s.finance.closingCents)}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {showBusiness && (
        <section className="print-doc" style={sheet}>
          <h2 style={h2}>Business: {house.business!.name}</h2>
          {bizMonths.length === 0 ? <p style={{ color: 'var(--ink-2)' }}>No sales or costs are written in the books yet.</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>Month</th><th style={{ ...th, textAlign: 'right' }}>Sales</th><th style={{ ...th, textAlign: 'right' }}>Cost of goods</th><th style={{ ...th, textAlign: 'right' }}>Other costs</th><th style={{ ...th, textAlign: 'right' }}>Left over</th></tr></thead>
              <tbody>
                {bizMonths.map(([ym, entries]) => {
                  const p = computePnL(entries);
                  return <tr key={ym}><td style={td}>{monthLabel(ym)}</td><td style={num}>{formatMoney(p.salesCents)}</td><td style={num}>{formatMoney(p.costOfGoodsCents)}</td><td style={num}>{formatMoney(p.expensesCents)}</td><td style={num}>{formatMoney(p.netProfitCents)}</td></tr>;
                })}
              </tbody>
            </table>
          )}
        </section>
      )}

      {(months.length > 0 || showBusiness) && (
        <section className="print-doc" style={sheet}>
          <h2 style={h2}>{showTogether ? 'Group and business together, month by month' : 'The record was checked'}</h2>
          {showTogether && (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
              <thead><tr><th style={th}>Month</th><th style={{ ...th, textAlign: 'right' }}>Money in</th><th style={{ ...th, textAlign: 'right' }}>Money out</th><th style={{ ...th, textAlign: 'right' }}>Left</th></tr></thead>
              <tbody>
                {money.month.together.slice(0, 12).map((r) => (
                  <tr key={r.start}><td style={td}>{stepLabel(r.start, 'month')}</td><td style={num}>{formatMoney(r.inCents)}</td><td style={num}>{formatMoney(r.outCents)}</td><td style={num}>{formatMoney(r.leftCents)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
          <ul style={{ listStyle: 'none', display: 'grid', gap: 6 }}>
            {money.checks.map((c) => <li key={c.id} style={{ fontSize: 14 }}>{c.ok ? '✓' : '!'} {c.text.en}</li>)}
          </ul>
        </section>
      )}

      {minutes.map((m) => (
        <section key={m.id} className="print-doc page-break" style={sheet}>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-body)', fontSize: 14.5, lineHeight: 1.6 }}>{paraphraseMinutes(m, charter).plainText}</pre>
        </section>
      ))}

      <section className="print-doc page-break" style={sheet}>
        <h2 style={h2}>Signed by the officials</h2>
        <p style={{ color: 'var(--ink-2)', marginBottom: 18 }}>We confirm that these papers are taken from the true records of {house.groupName}.</p>
        <div style={{ display: 'grid', gap: 26, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {signers.map((s) => (
            <div key={s.post}>
              <div style={{ borderBottom: '1px solid var(--ink)', height: 44 }} />
              <p style={{ fontWeight: 700, marginTop: 6 }}>{s.name || ' '}</p>
              <p style={{ fontSize: 13, color: 'var(--dim)' }}>{s.post} · Date ____________</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
