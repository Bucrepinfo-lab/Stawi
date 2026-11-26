import { amountQuery, formatMoney, matches, searchPlaces } from '@stawi/core';
import { getMyGroups } from '@/lib/data';
import { dbEnabled } from '@/lib/data';
import { BackLink } from '@/components/BackLink';

export const dynamic = 'force-dynamic';

/**
 * Search (owner 26/11/26): members, payments, meetings and group messages in
 * the caller's OWN chamas only, plus the app's own places ("PIN", "loan",
 * "lugha"). Private member–officials threads are not searched here.
 */
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q: raw } = await searchParams;
  const q = (raw ?? '').trim().slice(0, 60);
  const places = q.length >= 2 ? searchPlaces(q) : [];
  const groups = await getMyGroups().catch(() => []);
  const ids = groups.map((g) => g.id);
  const gname = new Map(groups.map((g) => [g.id, g.name]));
  const p = (n: number) => String(n).padStart(2, '0');
  const dmy = (d: Date) => `${p(d.getDate())}/${p(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`;

  let people: { id: string; groupId: string; name: string; role: string }[] = [];
  let payments: { id: string; groupId: string; who: string; cents: number; at: string; ref: string | null }[] = [];
  let meetings: { id: string; groupId: string; no: number; date: string; hit: string }[] = [];
  let messages: { id: string; groupId: string; body: string; at: string }[] = [];

  if (q.length >= 2 && ids.length && dbEnabled()) {
    const { prisma } = await import('@stawi/db');
    const cents = amountQuery(q);
    const [mem, pay, meet, msg] = await Promise.all([
      prisma.membership.findMany({ where: { groupId: { in: ids }, fullName: { contains: q, mode: 'insensitive' } }, select: { id: true, groupId: true, fullName: true, role: true }, take: 12 }),
      prisma.contribution.findMany({
        where: {
          groupId: { in: ids },
          status: 'CONFIRMED',
          OR: [
            { member: { fullName: { contains: q, mode: 'insensitive' } } },
            { mpesaRef: { contains: q, mode: 'insensitive' } },
            ...(cents ? [{ amountCents: cents }] : []),
          ],
        },
        select: { id: true, groupId: true, amountCents: true, createdAt: true, mpesaRef: true, member: { select: { fullName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 12,
      }),
      prisma.meeting.findMany({ where: { groupId: { in: ids } }, select: { id: true, groupId: true, meetingNo: true, date: true, venue: true, agendas: true }, orderBy: { date: 'desc' }, take: 200 }),
      prisma.groupMessage.findMany({ where: { groupId: { in: ids }, channel: 'ALL', body: { contains: q, mode: 'insensitive' } }, select: { id: true, groupId: true, body: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);
    people = mem.map((m) => ({ id: m.id, groupId: m.groupId, name: m.fullName, role: m.role.charAt(0) + m.role.slice(1).toLowerCase() }));
    payments = pay.map((c) => ({ id: c.id, groupId: c.groupId, who: c.member.fullName, cents: c.amountCents, at: dmy(c.createdAt), ref: c.mpesaRef }));
    meetings = meet.flatMap((m) => {
      const items = Array.isArray(m.agendas) ? (m.agendas as { title?: string; discussion?: string; resolution?: string }[]) : [];
      const hit = items.map((a) => [a.title, a.discussion, a.resolution].filter(Boolean).join(' — ')).find((t) => matches(t, q)) ?? (matches(m.venue, q) ? `Venue: ${m.venue}` : null);
      return hit ? [{ id: m.id, groupId: m.groupId, no: m.meetingNo, date: m.date, hit: hit.slice(0, 160) }] : [];
    }).slice(0, 10);
    messages = msg.map((m) => ({ id: m.id, groupId: m.groupId, body: m.body.slice(0, 160), at: dmy(m.createdAt) }));
  }
  const total = places.length + people.length + payments.length + meetings.length + messages.length;

  return (
    <main className="pillar-1" style={{ maxWidth: 760, margin: '0 auto', padding: '20px 18px 110px' }}>
      <BackLink fallback="/dashboard" />
      <form role="search" action="/search" className="sr-form">
        <label htmlFor="sr-q" className="hist-kicker">Search / Tafuta</label>
        <div className="sr-row">
          <input id="sr-q" name="q" type="search" defaultValue={q} autoFocus className="mr-input sr-input" placeholder="A name, an amount, an M-Pesa code, a word from the minutes…" enterKeyHint="search" />
          <button type="submit" className="mr-btn go">Search</button>
        </div>
        <p className="mr-meta">Searches your own chamas only. Tip: tap the microphone on your keyboard to say it.</p>
      </form>

      {q.length >= 2 && total === 0 && <p className="mr-empty" style={{ marginTop: 16 }}>Nothing found for &ldquo;{q}&rdquo;. Try fewer letters, or another spelling.</p>}

      {places.length > 0 && (
        <section className="mr-section"><h2>In the app</h2>
          <ul className="sr-list">{places.map((pl) => <li key={pl.title}><a href={pl.href}>{pl.title}</a></li>)}</ul>
        </section>
      )}
      {people.length > 0 && (
        <section className="mr-section"><h2>Members</h2>
          <ul className="sr-list">{people.map((m) => <li key={m.id}><a href={`/groups/${encodeURIComponent(m.groupId)}`}><strong>{m.name}</strong> <span className="mr-meta">{m.role} · {gname.get(m.groupId)}</span></a></li>)}</ul>
        </section>
      )}
      {payments.length > 0 && (
        <section className="mr-section"><h2>Payments</h2>
          <ul className="sr-list">{payments.map((c) => <li key={c.id}><a href={`/groups/${encodeURIComponent(c.groupId)}/money`}><strong>{c.who}</strong> <span className="mono">KES {formatMoney(c.cents)}</span> <span className="mr-meta">{c.at}{c.ref ? ` · ${c.ref}` : ''} · {gname.get(c.groupId)}</span></a></li>)}</ul>
        </section>
      )}
      {meetings.length > 0 && (
        <section className="mr-section"><h2>Meetings</h2>
          <ul className="sr-list">{meetings.map((m) => <li key={m.id}><a href={`/groups/${encodeURIComponent(m.groupId)}?tab=minutes`}><strong>Meeting {m.no}</strong> <span className="mr-meta">{m.date} · {gname.get(m.groupId)}</span><br /><span className="mr-meta">{m.hit}</span></a></li>)}</ul>
        </section>
      )}
      {messages.length > 0 && (
        <section className="mr-section"><h2>Group messages</h2>
          <ul className="sr-list">{messages.map((m) => <li key={m.id}><a href={`/groups/${encodeURIComponent(m.groupId)}?tab=messages`}><span>{m.body}</span><br /><span className="mr-meta">{m.at} · {gname.get(m.groupId)}</span></a></li>)}</ul>
        </section>
      )}
    </main>
  );
}
