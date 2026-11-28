/**
 * Which of a person's records are a business of their own and which are a
 * group (owner 28/11/26: "My group" and "Business" are separate tabs). A
 * business is a BUSINESS-type record, or one that uses the books alone.
 */
import { booksOnly, type GroupModules } from '@stawi/core';
import type { GroupAccount } from './groups';

export function isBusiness(group: Pick<GroupAccount, 'id' | 'type'>, modulesById: Record<string, GroupModules | undefined>): boolean {
  const mods = modulesById[group.id];
  return group.type === 'Business' || (!!mods && booksOnly(mods));
}

export function splitGroups<T extends Pick<GroupAccount, 'id' | 'type'>>(groups: T[], modulesById: Record<string, GroupModules | undefined>): { groups: T[]; businesses: T[] } {
  return { groups: groups.filter((g) => !isBusiness(g, modulesById)), businesses: groups.filter((g) => isBusiness(g, modulesById)) };
}
