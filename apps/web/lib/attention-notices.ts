/**
 * Daily alerts for stalled work (owner approved 20/11/26) — run by /api/cron.
 *
 * For every group: work out the stalled duties (only for sections the group
 * has switched on), decide who has not yet been told, and tell each person in
 * the group's own Messages ("Ask the officials", their private thread) — never
 * by SMS (owner 20/11/26: alerts go through the app's own messaging). Each
 * notice is remembered so nobody is told twice. Off with ATTENTION_SMS=off, or
 * for a group that switched Messages off (the attention card still shows).
 */
import {
  ATTENTION_SMS_CAP, attentionNoticeId, escalationToday, findEscalations, planAttentionNotices, resolveModules,
  phoneKey, watchAllowed,
} from '@stawi/core';
import { getCockpit } from './cockpit';
import { saccoPlusEnabled } from './features';
import { STAWI_SENDER } from './messages';

export interface AttentionRun {
  groups: number;
  due: number;
  sent: number;
  capped: boolean;
  sms: 'on' | 'off';
}

const GROUPS_PER_RUN = 500;

export async function runAttentionNotices(now: Date = new Date()): Promise<AttentionRun> {
  const on = (process.env.ATTENTION_SMS ?? '').trim().toLowerCase() !== 'off';
  const run: AttentionRun = { groups: 0, due: 0, sent: 0, capped: false, sms: on ? 'on' : 'off' };
  const { prisma } = await import('@stawi/db');
  const groups = await prisma.group.findMany({
    where: { charter: { isNot: null } },
    select: { id: true, type: true, modules: true },
    orderBy: { id: 'asc' },
    take: GROUPS_PER_RUN,
  });
  const savingsCredit = saccoPlusEnabled();

  for (const g of groups) {
    const cockpit = await getCockpit(g.id);
    if (!cockpit) continue;
    run.groups += 1;
    const modules = resolveModules(g.modules, { groupType: g.type, savingsCredit });
    const findings = findEscalations({
      charter: cockpit.charter,
      meetings: cockpit.meetings,
      today: escalationToday(cockpit.charter.countryCode, now),
    }).filter((f) => watchAllowed(f.rule, modules));
    if (findings.length === 0) continue;

    const told = await prisma.attentionNotice.findMany({ where: { groupId: g.id }, select: { key: true, level: true, memberId: true } });
    const plan = planAttentionNotices({
      groupName: cockpit.groupName,
      members: cockpit.charter.members,
      findings,
      alreadyTold: new Set(told.map((t) => attentionNoticeId(t.key, t.level, t.memberId))),
    });
    run.due += plan.length;
    if (!on || !modules.messages) continue;

    // The person's row in this group (matched by the phone on the member list).
    const rows = await prisma.membership.findMany({ where: { groupId: g.id }, select: { id: true, phone: true } });
    const rowFor = (phone: string) => rows.find((r) => r.phone && phoneKey(r.phone) === phoneKey(phone))?.id;

    for (const notice of plan) {
      if (run.sent >= ATTENTION_SMS_CAP) {
        run.capped = true;
        return run;
      }
      const thread = rowFor(notice.phone);
      if (!thread) continue;
      const posted = await prisma.groupMessage
        .create({ data: { groupId: g.id, channel: 'OFFICIALS', threadMemberId: thread, senderMembershipId: STAWI_SENDER, body: notice.text } })
        .then(() => true)
        .catch(() => false);
      if (!posted) continue;
      run.sent += 1;
      await prisma.attentionNotice
        .create({ data: { groupId: g.id, key: notice.key, level: notice.level, memberId: notice.memberId } })
        .catch(() => undefined);
    }
  }
  return run;
}
