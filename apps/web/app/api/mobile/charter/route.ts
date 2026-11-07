import { assertClean } from '@stawi/core';
import { dbEnabled } from '@/lib/data';
import { ok, bad, authorize, requireMobileGroupRole, preflight, seedAllowed, dbRequired } from '@/lib/mobileApi';

export const runtime = 'nodejs';

export function OPTIONS() { return preflight(); }

/** POST /api/mobile/charter { groupId, charter } */
export async function POST(req: Request) {
  const auth = await authorize(req); if (auth instanceof Response) return auth;
  let body: any; try { body = await req.json(); } catch { return bad('Invalid JSON'); }
  const { groupId, charter } = body ?? {};
  if (!groupId || !charter?.name?.trim()) return bad('groupId and charter.name are required');
  if (dbEnabled()) { const denied = await requireMobileGroupRole(auth.identity, groupId, 'records'); if (denied) return denied; }
  for (const field of [charter.constitution, charter.motto, charter.mission, charter.vision, charter.notes]) {
    if (field) { try { assertClean(String(field)); } catch (e) { return bad(e instanceof Error ? e.message : 'Content not allowed'); } }
  }
  if (!dbEnabled()) return seedAllowed() ? ok({ ok: true, persisted: false }) : dbRequired();
  try {
    const { prisma, upsertGroupCharter, provisionRosterMemberships } = await import('@stawi/db');
    await upsertGroupCharter(prisma, { groupId, name: charter.name, logoUrl: charter.logoUrl, schedule: charter.schedule, members: charter.members, constitution: charter.constitution ?? '', constitutionFileUrl: charter.constitutionFileUrl, motto: charter.motto ?? '', mission: charter.mission ?? '', vision: charter.vision ?? '', coreValues: charter.coreValues ?? [], notes: charter.notes, registeredNumber: charter.registeredNumber, countryCode: charter.countryCode ?? 'KE' });
    const roster = (Array.isArray(charter.members) ? charter.members : []).filter((m: any) => m?.phone && m?.fullName).map((m: any) => ({ fullName: m.fullName, phone: m.phone, designation: m.designation }));
    if (roster.length) await provisionRosterMemberships(prisma, { groupId, roster });
    return ok({ ok: true, persisted: true });
  } catch (e) { return bad(e instanceof Error ? e.message : 'Save failed', 500); }
}
