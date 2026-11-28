/**
 * Table banking round: return reminders (owner 28/11/26) — run by /api/cron.
 *
 * The day before a member's money is due back, one reminder is written in the
 * group's own Messages, in that member's private thread with the officials: the
 * member sees it, and so do the treasurer and the other officials. Never by SMS
 * (owner 20/11/26: alerts go through the app's own messaging), and nothing here
 * moves, holds or asks for money. Each reminder is remembered (AttentionNotice,
 * key "round_return:<turnId>") so nobody is reminded twice. Off with
 * ROUND_REMINDERS=off, or for a group that switched Messages off.
 */
import { escalationToday, resolveModules, roundReminderKey, roundReminderText, roundRemindersDue } from '@stawi/core';
import { saccoPlusEnabled } from './features';
import { alertNewMessage } from './group-alerts';
import { STAWI_SENDER } from './messages';

export interface RoundReminderRun {
  due: number;
  sent: number;
  capped: boolean;
  reminders: 'on' | 'off';
}

const CAP = 150;
const WINDOW_DAYS = 3; // a wide net by date; the group's own "tomorrow" decides.
const day = (d: Date) => d.toISOString().slice(0, 10);

export async function runRoundReminders(now: Date = new Date()): Promise<RoundReminderRun> {
  const on = (process.env.ROUND_REMINDERS ?? '').trim().toLowerCase() !== 'off';
  const run: RoundReminderRun = { due: 0, sent: 0, capped: false, reminders: on ? 'on' : 'off' };
  const { prisma } = await import('@stawi/db');
  const near = await prisma.tableRoundTurn.findMany({
    where: {
      givenAt: { not: null },
      returnedAt: null,
      round: { closedAt: null },
      returnOn: { gte: new Date(now.getTime() - WINDOW_DAYS * 86_400_000), lte: new Date(now.getTime() + WINDOW_DAYS * 86_400_000) },
    },
    select: { id: true, groupId: true, membershipId: true, returnOn: true, givenCents: true, returnCents: true, givenAt: true, returnedAt: true },
    orderBy: { returnOn: 'asc' },
    take: 2000,
  });
  if (near.length === 0) return run;

  const groupIds = [...new Set(near.map((t) => t.groupId))];
  const groups = await prisma.group.findMany({ where: { id: { in: groupIds } }, select: { id: true, type: true, modules: true, countryCode: true } });
  const savingsCredit = saccoPlusEnabled();

  for (const g of groups) {
    const turns = near.filter((t) => t.groupId === g.id).map((t) => ({ ...t, returnOn: day(t.returnOn) }));
    const due = roundRemindersDue(turns, escalationToday(g.countryCode, now));
    if (due.length === 0) continue;
    const told = await prisma.attentionNotice.findMany({ where: { groupId: g.id, key: { in: due.map((t) => roundReminderKey(t.id)) } }, select: { key: true } });
    const done = new Set(told.map((t) => t.key));
    const fresh = due.filter((t) => !done.has(roundReminderKey(t.id)));
    run.due += fresh.length;
    if (!on || fresh.length === 0) continue;
    if (!resolveModules(g.modules, { groupType: g.type, savingsCredit }).messages) continue;

    const members = await prisma.membership.findMany({ where: { id: { in: fresh.map((t) => t.membershipId) }, groupId: g.id }, select: { id: true, fullName: true } });
    for (const t of fresh) {
      if (run.sent >= CAP) {
        run.capped = true;
        return run;
      }
      const member = members.find((m) => m.id === t.membershipId);
      if (!member) continue;
      const body = roundReminderText({ name: member.fullName, returnOn: t.returnOn, givenCents: t.givenCents, returnCents: t.returnCents });
      const posted = await prisma.groupMessage
        .create({ data: { groupId: g.id, channel: 'OFFICIALS', threadMemberId: member.id, senderMembershipId: STAWI_SENDER, body } })
        .then(() => true)
        .catch(() => false);
      if (!posted) continue;
      run.sent += 1;
      await prisma.attentionNotice.create({ data: { groupId: g.id, key: roundReminderKey(t.id), level: 1, memberId: member.id } }).catch(() => undefined);
      // Phone alert to the member and the officials (lock-screen text shows no amounts). Never throws.
      await alertNewMessage({ groupId: g.id, senderMembershipId: STAWI_SENDER, body, channel: 'OFFICIALS', threadMemberId: member.id });
    }
  }
  return run;
}
