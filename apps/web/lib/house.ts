/**
 * One house, four rooms (owner 20/11/26): the papers a group already holds,
 * checked against what each section needs — so no section asks for a document
 * Stawi already has. Server only; membership is checked here.
 */
import { buildHouse, checkHouse, type HouseCheck, type HouseDocument } from '@stawi/core';
import { getCockpit, type Cockpit } from './cockpit';
import { dbEnabled, getBusinessMap, getViewerRole } from './data';
import { myGroupRole, RECORD_EDITOR_ROLES } from './group-access';
import { saccoPlusEnabled } from './features';

export interface GroupHouse {
  groupId: string;
  groupName: string;
  documents: HouseDocument[];
  checks: HouseCheck[];
  /** Officials may open the full pack (it lists members' details). */
  canOpenPack: boolean;
}

export interface GroupHouseFull extends GroupHouse {
  cockpit: Cockpit;
  business: { name: string; entries: { type: string; amountCents: number; occurredAt: string }[]; stockItems: number } | null;
}

/** null = not found, or the caller is not a member of the group. */
export async function loadGroupHouse(groupId: string): Promise<GroupHouseFull | null> {
  if (!groupId) return null;
  const [viewer, role] = await Promise.all([getViewerRole(), myGroupRole(groupId)]);
  if (dbEnabled() && !role && viewer !== 'SUPER_ADMIN') return null;
  const cockpit = await getCockpit(groupId);
  if (!cockpit) return null;
  const books = (await getBusinessMap([groupId]))[groupId] ?? null;
  const business = books
    ? {
        name: books.name,
        entries: books.entries.map((e) => ({ type: String(e.type), amountCents: e.amountCents, occurredAt: String(e.occurredAt) })),
        stockItems: books.stock.length,
      }
    : null;
  const documents = buildHouse({
    charter: cockpit.charter,
    meetings: cockpit.meetings,
    business: business ? { name: business.name, entryDates: business.entries.map((e) => e.occurredAt), stockItems: business.stockItems } : null,
  });
  const canOpenPack = dbEnabled()
    ? viewer === 'SUPER_ADMIN' || (!!role && RECORD_EDITOR_ROLES.has(role))
    : viewer === 'OFFICIAL' || viewer === 'SUPER_ADMIN';
  return {
    groupId,
    groupName: cockpit.groupName,
    documents,
    checks: checkHouse(documents, { savingsCredit: saccoPlusEnabled() }),
    canOpenPack,
    cockpit,
    business,
  };
}
