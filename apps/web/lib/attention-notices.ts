/**
 * Daily alerts for stalled work (owner approved 20/11/26) — run by /api/cron.
 *
 * For every group: work out the stalled duties (only for sections the group
 * has switched on), decide who has not yet been told, send each an SMS, and
 * remember it so nobody is told twice. An SMS is remembered only when it was
 * actually sent. Sends nothing when SMS is not configured or ATTENTION_SMS=off.
 */
import {
  ATTENTION_SMS_CAP, attentionNoticeId, escalationToday, findEscalations, planAttentionNotices, resolveModules,
  watchAllowed,
} from '@stawi/core';
import { getCockpit } from './cockpit';
import { saccoPlusEnabled } from './features';
import { sendSms } from './notify';

export interface AttentionRun {
  groups: number;
  due: number;
  sent: number;
  capped: boolean;
  sms: 'on' | 'off';
}

const GROUPS_PER_RUN = 500;

export async function runAttentionNotices(now: Date = new Date()): Promise<AttentionRun> {
  const smsOn = (process.env.ATTENTION_SMS ?? '').trim().toLowerCase() !== 'off' && !!(process.env.AT_USERNAME && process.env.AT_API_KEY);
  const run: AttentionRun = { groups: 0, due: 0, sent: 0, capped: false, sms: smsOn ? 'on' : 'off' };
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
    if (!smsOn) continue;

    for (const notice of plan) {
      if (run.sent >= ATTENTION_SMS_CAP) {
        run.capped = true;
        return run;
      }
      const result = await sendSms(notice.phone, notice.text, 'transactional');
      if (!result.sent) continue;
      run.sent += 1;
      await prisma.attentionNotice
        .create({ data: { groupId: g.id, key: notice.key, level: notice.level, memberId: notice.memberId } })
        .catch(() => undefined);
    }
  }
  return run;
}
