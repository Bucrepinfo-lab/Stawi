/**
 * Flow & escalation for one group (owner 20/11/26; Telpen Edu standing orders).
 *
 * Works out, on the server, which stalled duties THIS viewer may see: their own
 * and the ones that have climbed to them. Nothing else leaves the server, so a
 * colleague's list cannot be read from the page.
 */
import {
  findEscalations, memberIdForPhone, visibleEscalations, isOfficial, watchAllowed, type GroupModules,
  type EscalationFinding, type EscalationLevel,
} from '@stawi/core';
import type { Cockpit } from './cockpit';
import { dbEnabled, type ViewerRole } from './data';

export interface AttentionItem {
  key: string;
  rule: string;
  level: EscalationLevel;
  daysOverdue: number;
  mine: boolean;
  responsibleName: string;
  href: string;
  title: EscalationFinding['title'];
  detail: EscalationFinding['detail'];
  action: EscalationFinding['action'];
}

export interface GroupAttention {
  items: AttentionItem[];
  /** True when the viewer holds a post, so an empty list can say "all in order". */
  isOfficial: boolean;
}

export async function groupAttention(cockpit: Cockpit, viewer: ViewerRole, modules?: GroupModules): Promise<GroupAttention> {
  const members = cockpit.charter.members ?? [];
  let memberId: string | null = null;
  if (dbEnabled()) {
    const { getUserPhone } = await import('./auth');
    memberId = memberIdForPhone(members, await getUserPhone().catch(() => null));
  } else {
    // Demo (no database): show the Chairperson's view so the screen can be tried.
    memberId = members.find((m) => m.designation === 'Chairperson')?.id ?? null;
  }
  const me = members.find((m) => m.id === memberId);
  const findings = visibleEscalations(
    // A watch is raised only for a section the group has switched on.
    findEscalations({ charter: cockpit.charter, meetings: cockpit.meetings }).filter((f) => !modules || watchAllowed(f.rule, modules)),
    { memberId, overseer: viewer === 'SUPER_ADMIN' },
  );
  return {
    isOfficial: viewer === 'SUPER_ADMIN' || (!!me && isOfficial(me.designation)),
    items: findings.slice(0, 12).map((f) => ({
      key: f.key,
      rule: f.rule,
      level: f.level,
      daysOverdue: f.daysOverdue,
      mine: f.level === 1 && !!memberId && f.audienceIds.includes(memberId),
      responsibleName: f.responsibleName,
      href: `/groups/${encodeURIComponent(cockpit.groupId)}?tab=${f.tab}`,
      title: f.title,
      detail: f.detail,
      action: f.action,
    })),
  };
}
