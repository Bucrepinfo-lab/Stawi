/**
 * Which sections a group or business uses (owner 20/11/26). Read on the server
 * and applied there; the group's officials change it (see saveModulesAction).
 */
import { resolveModules, type GroupModules } from '@stawi/core';
import { dbEnabled } from './data';
import { MY_GROUPS } from './groups';
import { saccoPlusEnabled } from './features';

/** Demo mode (no database): choices live for the life of the server process. */
const demoChoices = new Map<string, unknown>();

export function setDemoModules(groupId: string, modules: unknown): void {
  demoChoices.set(groupId, modules);
}

export async function getModulesMap(groupIds: string[]): Promise<Record<string, GroupModules>> {
  const out: Record<string, GroupModules> = {};
  const savingsCredit = saccoPlusEnabled();
  if (groupIds.length === 0) return out;
  if (!dbEnabled()) {
    for (const id of groupIds) {
      const seed = MY_GROUPS.find((g) => g.id === id);
      out[id] = resolveModules(demoChoices.get(id), { groupType: seed?.type === 'Business' ? 'BUSINESS' : 'CHAMA', savingsCredit });
    }
    return out;
  }
  const { prisma } = await import('@stawi/db');
  const rows = await prisma.group.findMany({ where: { id: { in: groupIds } }, select: { id: true, type: true, modules: true } });
  for (const id of groupIds) {
    const row = rows.find((r) => r.id === id);
    out[id] = resolveModules(row?.modules, { groupType: row?.type, savingsCredit });
  }
  return out;
}

export async function getGroupModules(groupId: string): Promise<GroupModules> {
  return (await getModulesMap([groupId]))[groupId]!;
}
