'use server';

/**
 * Server actions for writes. Guarantees:
 *  1. Content safety — free-text screened with @stawi/core moderation (server-side).
 *  2. Tenant isolation — writes are scoped to the caller's tenant (assertGroupInTenant).
 *  3. Persistence — hit Postgres when DATABASE_URL is set, else no-op on seed data.
 */

import { assertClean, duplicateRosterPhones, SACCO_PLUS_DISABLED_MESSAGE } from '@stawi/core';
import { dbEnabled } from '@/lib/data';
import { saccoPlusEnabled } from '@/lib/features';

/**
 * Per-group authority, enforced here on the server (the UI only mirrors it).
 * Money (recording contributions) → treasurer; records (charter, minutes,
 * statements) → chair, secretary or treasurer. Seed/demo mode (no DATABASE_URL)
 * persists nothing, so it is not gated.
 */
async function requireGroupRole(groupId: string | undefined, allowed: 'money' | 'records'): Promise<string | null> {
  if (!dbEnabled()) return null;
  if (!groupId) return 'Missing group.';
  const { myGroupRole, MONEY_ROLES, RECORD_EDITOR_ROLES } = await import('@/lib/group-access');
  const role = await myGroupRole(groupId);
  const set = allowed === 'money' ? MONEY_ROLES : RECORD_EDITOR_ROLES;
  if (!role || !set.has(role)) {
    return allowed === 'money'
      ? 'Only the group treasurer can record contributions.'
      : 'Only group officials (chair, secretary, treasurer) can change records.';
  }
  return null;
}
import { groupChannel, publishEvent } from '@/lib/events';

async function tenantId(): Promise<string | undefined> {
  const { prisma, getTenantContext } = await import('@stawi/db');
  const { getUserId } = await import('@/lib/auth');
  const userId = await getUserId();
  if (!userId) return undefined;
  const ctx = await getTenantContext(prisma, userId);
  return ctx?.tenantId;
}

export async function recordContributionAction(input: {
  groupId?: string;
  membershipId: string;
  amountCents: number;
  /** How the money came in, when written by hand (owner 20/11/26). Default cash. */
  way?: string;
  /** M-Pesa code or bank reference, when there is one. */
  reference?: string;
  /** Two members who saw cash / M-Pesa-to-a-phone handed over (owner 26/11/26). */
  witnessIds?: string[];
}): Promise<{ ok: boolean; persisted: boolean; contributionId?: string; error?: string }> {
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) return { ok: false, persisted: false, error: 'Amount must be positive' };
  const { COLLECT_WAYS, collectWay, checkPaymentRef, isDuplicateRef } = await import('@stawi/core');
  const way = collectWay(input.way);
  const ref = checkPaymentRef(way, input.reference);
  if (!ref.ok) return { ok: false, persisted: false, error: ref.error.en };
  const channel = COLLECT_WAYS.find((w) => w.id === way)!.channel;
  if (!dbEnabled() || !input.groupId) {
    publishEvent({ type: 'contribution', channel: 'public' });
    return { ok: true, persisted: false };
  }
  const denied = await requireGroupRole(input.groupId, 'money');
  if (denied) return { ok: false, persisted: false, error: denied };
  const { prisma, recordContribution } = await import('@stawi/db');
  const { getUserId } = await import('@/lib/auth');
  const userId = await getUserId();
  const member = await prisma.membership.findFirst({ where: { id: input.membershipId, groupId: input.groupId }, select: { id: true } });
  if (!member) return { ok: false, persisted: false, error: 'Member not found in this group.' };
  // Cash and M-Pesa to an official's phone are recorded before two witnesses (owner 26/11/26).
  const { needsWitnesses, witnessProblem } = await import('@stawi/core');
  const witnessIds = needsWitnesses(way) ? [...new Set((input.witnessIds ?? []).filter(Boolean))] : [];
  if (needsWitnesses(way)) {
    const { myMembershipIds } = await import('@/lib/group-access');
    const [recorderIds, all] = await Promise.all([
      myMembershipIds(input.groupId),
      prisma.membership.findMany({ where: { groupId: input.groupId }, select: { id: true } }),
    ]);
    const problem = witnessProblem({ way, witnessIds: input.witnessIds ?? [], recorderIds, contributorId: input.membershipId, memberIds: all.map((m) => m.id) });
    if (problem) return { ok: false, persisted: false, error: problem };
  }
  // The same M-Pesa code written twice is the same money.
  if (ref.ref) {
    const seen = await prisma.contribution.findMany({ where: { groupId: input.groupId, mpesaRef: ref.ref }, select: { mpesaRef: true }, take: 1 });
    if (isDuplicateRef(ref.ref, seen.map((x) => x.mpesaRef))) return { ok: false, persisted: false, error: 'This M-Pesa code is already written in. Each payment is written once.' };
  }
  let contributionId: string;
  const tenant = await tenantId();
  try {
    // One write: the entry and its witnesses together, or nothing.
    const groupId = input.groupId;
    contributionId = await prisma.$transaction(async (tx) => {
      const { id } = await recordContribution(tx as unknown as typeof prisma, {
        groupId,
        membershipId: input.membershipId,
        amountCents: input.amountCents,
        channel,
        confirmed: true,
        mpesaRef: ref.ref ?? undefined,
        recordedByClerkUserId: userId ?? undefined,
        tenantId: tenant,
      });
      if (witnessIds.length) {
        await tx.contributionWitness.createMany({
          data: witnessIds.map((membershipId) => ({ groupId, contributionId: id, membershipId })),
          skipDuplicates: true,
        });
      }
      return id;
    });
  } catch (e) {
    return { ok: false, persisted: false, error: e instanceof Error ? e.message : 'Write failed' };
  }
  publishEvent({ type: 'contribution', channel: groupChannel(input.groupId!) });
  // Every other member gets a phone alert (owner 26/11/26); never blocks the write.
  void (await import('@/lib/group-alerts')).alertNewContribution(contributionId, userId);
  // The receipt is opened by this id only (loaded from the database, never from URL values).
  return { ok: true, persisted: true, contributionId };
}

export async function addLedgerEntryAction(input: {
  businessId?: string;
  type: 'SALE' | 'PURCHASE' | 'EXPENSE';
  description: string;
  amountCents: number;
}): Promise<{ ok: boolean; persisted: boolean; error?: string }> {
  if (input.amountCents <= 0) return { ok: false, persisted: false, error: 'Amount must be positive' };
  try {
    assertClean(input.description);
  } catch (e) {
    return { ok: false, persisted: false, error: e instanceof Error ? e.message : 'Content blocked' };
  }
  if (!dbEnabled() || !input.businessId) return { ok: true, persisted: false };
  const { prisma, addLedgerEntry } = await import('@stawi/db');
  // The books belong to one group's business: only that group's members may
  // write to them (the page only offers the caller's own groups; this is the
  // server-side check behind it).
  const biz = await prisma.business.findUnique({ where: { id: input.businessId }, select: { groupId: true } });
  if (!biz) return { ok: false, persisted: false, error: 'Business not found.' };
  // Owner (07/11/26): only the group's officials (chair, secretary, treasurer)
  // write to the books; ordinary members read only.
  const { myGroupRole } = await import('@/lib/group-access');
  const { canWriteBooks } = await import('@stawi/core');
  const role = await myGroupRole(biz.groupId);
  if (!role) return { ok: false, persisted: false, error: 'You can only add entries to your own group’s books.' };
  if (!canWriteBooks(role)) return { ok: false, persisted: false, error: 'Only group officials (chair, secretary, treasurer) can add entries to the books.' };
  try {
    await addLedgerEntry(prisma, {
      businessId: input.businessId,
      type: input.type,
      description: input.description,
      amountCents: input.amountCents,
      tenantId: await tenantId(),
    });
  } catch (e) {
    return { ok: false, persisted: false, error: e instanceof Error ? e.message : 'Write failed' };
  }
  return { ok: true, persisted: true };
}

/** Generic content check usable by any composer (messages, venture notes, names). */
export async function moderateAction(text: string): Promise<{ ok: boolean; error?: string }> {
  try {
    assertClean(text);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Content blocked' };
  }
}

// ───────────────────────── SACCO+ (Pillar 4) actions ─────────────────────────
// Every action below refuses when SACCO_PLUS_ENABLED is off (the default), and
// the @stawi/db repo refuses again underneath — so nothing is scored, lent,
// accrued or debited by a v1 deployment, whatever the client sends.

export async function openSaccoAccountAction(input: {
  entityType: 'REGISTERED_GROUP' | 'BUSINESS' | 'INDIVIDUAL' | 'INSTITUTION';
  displayName: string;
  countryCode?: string;
  ownerGroupId?: string;
}): Promise<{ ok: boolean; persisted: boolean; id?: string; error?: string }> {
  if (!saccoPlusEnabled()) return { ok: false, persisted: false, error: SACCO_PLUS_DISABLED_MESSAGE };
  try {
    assertClean(input.displayName);
  } catch (e) {
    return { ok: false, persisted: false, error: e instanceof Error ? e.message : 'Content blocked' };
  }
  if (!dbEnabled()) return { ok: true, persisted: false };
  try {
    const { prisma, openSaccoAccount } = await import('@stawi/db');
    const { getUserId } = await import('@/lib/auth');
    const userId = await getUserId();
    const tid = await tenantId();
    if (!userId || !tid) return { ok: false, persisted: false, error: 'Not signed in to a tenant' };
    const r = await openSaccoAccount(prisma, {
      tenantId: tid,
      entityType: input.entityType,
      displayName: input.displayName,
      countryCode: input.countryCode,
      ownerClerkId: input.ownerGroupId ? undefined : userId,
      ownerGroupId: input.ownerGroupId,
    });
    return { ok: true, persisted: true, id: r.id };
  } catch (e) {
    return { ok: false, persisted: false, error: e instanceof Error ? e.message : 'Write failed' };
  }
}

/**
 * One-tap SACCO+ activation for a group already enrolled through Pillar 1.
 * Opens the group's Stawi SACCO+ account (KYC fast-tracked from the charter)
 * and seeds it with the group's proven pooled savings so credit eligibility is
 * live immediately. Degrades to a no-op success in seed mode (no DATABASE_URL).
 */
export async function activateSaccoFromPillar1Action(input: {
  groupId: string;
  displayName: string;
  countryCode?: string;
  openingDepositCents?: number;
}): Promise<{ ok: boolean; persisted: boolean; accountId?: string; seededCents?: number; error?: string }> {
  if (!saccoPlusEnabled()) return { ok: false, persisted: false, error: SACCO_PLUS_DISABLED_MESSAGE };
  try {
    assertClean(input.displayName);
  } catch (e) {
    return { ok: false, persisted: false, error: e instanceof Error ? e.message : 'Content blocked' };
  }
  if (!dbEnabled()) return { ok: true, persisted: false, seededCents: input.openingDepositCents ?? 0 };
  try {
    const { prisma, openSaccoAccount, postSaccoTxn } = await import('@stawi/db');
    const { getUserId } = await import('@/lib/auth');
    const userId = await getUserId();
    const tid = await tenantId();
    if (!userId || !tid) return { ok: false, persisted: false, error: 'Not signed in to a tenant' };
    const acct = await openSaccoAccount(prisma, {
      tenantId: tid,
      entityType: 'REGISTERED_GROUP',
      displayName: input.displayName,
      countryCode: input.countryCode,
      ownerGroupId: input.groupId,
    });
    let seededCents = 0;
    if (input.openingDepositCents && input.openingDepositCents > 0) {
      try {
        await postSaccoTxn(prisma, {
          tenantId: tid,
          accountId: acct.id,
          type: 'DEPOSIT',
          amountCents: input.openingDepositCents,
          reference: 'Pillar 1 pooled savings (activation)',
        });
        seededCents = input.openingDepositCents;
      } catch {
        // Account is open even if the seeding deposit needs a manual retry.
      }
    }
    publishEvent({ type: 'sacco_txn', channel: tid });
    return { ok: true, persisted: true, accountId: acct.id, seededCents };
  } catch (e) {
    return { ok: false, persisted: false, error: e instanceof Error ? e.message : 'Write failed' };
  }
}

export async function saccoTxnAction(input: {
  accountId: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'SHARE_PURCHASE' | 'REMITTANCE_OUT' | 'REMITTANCE_IN';
  amountCents: number;
  reference?: string;
}): Promise<{ ok: boolean; persisted: boolean; balanceCents?: number; error?: string }> {
  if (!saccoPlusEnabled()) return { ok: false, persisted: false, error: SACCO_PLUS_DISABLED_MESSAGE };
  if (input.amountCents <= 0) return { ok: false, persisted: false, error: 'Amount must be positive' };
  if (!dbEnabled()) return { ok: true, persisted: false };
  try {
    const { prisma, postSaccoTxn } = await import('@stawi/db');
    const { getUserId } = await import('@/lib/auth');
    const userId = await getUserId();
    const tid = await tenantId();
    if (!userId || !tid) return { ok: false, persisted: false, error: 'Not signed in to a tenant' };
    const r = await postSaccoTxn(prisma, {
      tenantId: tid,
      accountId: input.accountId,
      type: input.type,
      amountCents: input.amountCents,
      reference: input.reference,
      // Debits carry the caller as the approving officer; the repo enforces
      // that debits cannot post without an approver identity on record.
      approvedByClerkId:
        input.type === 'WITHDRAWAL' || input.type === 'REMITTANCE_OUT' ? userId : undefined,
    });
    publishEvent({ type: 'sacco_txn', channel: tid });
    return { ok: true, persisted: true, balanceCents: r.balanceCents };
  } catch (e) {
    return { ok: false, persisted: false, error: e instanceof Error ? e.message : 'Write failed' };
  }
}

export async function applyLoanAction(input: {
  accountId: string;
  product: 'DEVELOPMENT' | 'EMERGENCY' | 'BUSINESS_BOOST';
  principalCents: number;
  termMonths: number;
  monthsActive: number;
  savingStreakMonths: number;
  onTimeRepaymentRate?: number;
  guarantorCoverageCents?: number;
}): Promise<{
  ok: boolean;
  persisted: boolean;
  qualified?: boolean;
  tier?: string;
  monthlyRatePct?: number;
  reasons?: string[];
  error?: string;
}> {
  if (!saccoPlusEnabled()) return { ok: false, persisted: false, error: SACCO_PLUS_DISABLED_MESSAGE };
  if (input.principalCents <= 0) return { ok: false, persisted: false, error: 'Amount must be positive' };
  if (!dbEnabled()) return { ok: true, persisted: false };
  try {
    const { prisma, applyForLoan } = await import('@stawi/db');
    const tid = await tenantId();
    if (!tid) return { ok: false, persisted: false, error: 'Not signed in to a tenant' };
    const r = await applyForLoan(prisma, {
      tenantId: tid,
      accountId: input.accountId,
      product: input.product,
      principalCents: input.principalCents,
      termMonths: input.termMonths,
      monthsActive: input.monthsActive,
      savingStreakMonths: input.savingStreakMonths,
      onTimeRepaymentRate: input.onTimeRepaymentRate ?? 1,
      guarantorCoverageCents: input.guarantorCoverageCents,
    });
    publishEvent({ type: 'loan', channel: tid });
    return {
      ok: true,
      persisted: true,
      qualified: r.qualified,
      tier: r.tier,
      monthlyRatePct: r.monthlyRatePct,
      reasons: r.reasons,
    };
  } catch (e) {
    return { ok: false, persisted: false, error: e instanceof Error ? e.message : 'Write failed' };
  }
}

// ───────────────── Pillar 1 — cockpit writes (charter / minutes) ─────────

/** Create a new group. Officials only (enforced in the page via viewer role). */
export async function createGroupAction(input: {
  name: string;
  type?: 'CHAMA' | 'SELF_HELP_GROUP' | 'SACCO' | 'BUSINESS';
  countryCode?: string;
  /** How the person chose to start (owner 20/11/26): everything, meetings only, or the books only. */
  start?: string;
}): Promise<{ ok: boolean; groupId?: string; persisted: boolean; error?: string; booksOnly?: boolean }> {
  const { startChoice, booksOnly, MAX_SELF_STARTED } = await import('@stawi/core');
  const name = input.name?.trim();
  if (!name || name.length < 2) return { ok: false, persisted: false, error: 'Enter a name.' };
  const clean = await assertCleanSafe(name);
  if (!clean.ok) return { ok: false, persisted: false, error: clean.error };
  // The way of starting sets which sections open; a business opens the books alone.
  const choice = input.start ? startChoice(input.start) : null;
  const type = choice?.type === 'BUSINESS' ? 'BUSINESS' : (input.type ?? 'CHAMA');
  const modules = choice ? choice.modules : type === 'BUSINESS' ? startChoice('books_only').modules : null;
  const isBooksOnly = !!modules && booksOnly(modules);
  if (!dbEnabled()) {
    // Demo: derive a stable-ish slug so the workspace opens.
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'group';
    if (modules) (await import('@/lib/modules')).setDemoModules(slug, modules);
    publishEvent({ type: 'group', channel: 'public' });
    return { ok: true, persisted: false, groupId: slug, booksOnly: isBooksOnly };
  }
  try {
    const { prisma } = await import('@stawi/db');
    const { getUserId } = await import('@/lib/auth');
    const userId = await getUserId();
    if (!userId) return { ok: false, persisted: false, error: 'Please sign in first.' };
    // Anyone signed in may start a group or business (owner 20/11/26), a few at most.
    const started = await prisma.membership.count({ where: { clerkUserId: userId, role: 'CHAIRMAN' } });
    const { getViewerRole } = await import('@/lib/data');
    if (started >= MAX_SELF_STARTED && (await getViewerRole()) === 'MEMBER') {
      return { ok: false, persisted: false, error: `You have already started ${MAX_SELF_STARTED}. Please contact us to add more.` };
    }
    const tid = await tenantId();
    const g = await prisma.group.create({
      data: { name, type, countryCode: input.countryCode ?? 'KE', tenantId: tid, clerkOrgId: `manual-${Date.now()}`, ...(modules ? { modules } : {}) },
      select: { id: true },
    });
    // A business gets its books at once — no group records are needed first.
    if (type === 'BUSINESS') {
      await prisma.business.create({ data: { groupId: g.id, name } }).catch(() => {});
    }
    if (userId) {
      const { getUserPhone } = await import('@/lib/auth');
      const phone = await getUserPhone().catch(() => null);
      // The founder's own name from another group, if they have one (owner 26/11/26).
      const { founderName } = await import('@stawi/core');
      const known = await prisma.membership.findMany({ where: { clerkUserId: userId }, select: { fullName: true }, orderBy: { joinedAt: 'desc' }, take: 10 });
      await prisma.membership.create({ data: { groupId: g.id, clerkUserId: userId, fullName: founderName(known.map((k) => k.fullName)), phone, role: 'CHAIRMAN' } }).catch(() => {});
    }
    publishEvent({ type: 'group', channel: groupChannel(g.id) });
    return { ok: true, persisted: true, groupId: g.id, booksOnly: isBooksOnly };
  } catch (e) {
    return { ok: false, persisted: false, error: e instanceof Error ? e.message : 'Create failed' };
  }
}

/**
 * Join the Stawi Demo Chama (owner 26/11/26): anyone signed in becomes an
 * ordinary MEMBER of the one shared demo group, with one tap and no joining
 * code (it holds sample money only). Shown as "Tester 482" with no phone
 * number, so testers never see each other's numbers. Never changes a role
 * someone already has there.
 */
export async function joinDemoGroupAction(): Promise<{ ok: boolean; groupId?: string; error?: string }> {
  const { demoGroupId } = await import('@/lib/demo-group');
  const groupId = demoGroupId();
  if (!groupId || !dbEnabled()) return { ok: false, error: 'The demo chama is not open yet.' };
  try {
    const { prisma } = await import('@stawi/db');
    const { getUserId, getUserPhone } = await import('@/lib/auth');
    const userId = await getUserId();
    if (!userId) return { ok: false, error: 'Please open an account or sign in first.' };
    const group = await prisma.group.findUnique({ where: { id: groupId }, select: { id: true } });
    if (!group) return { ok: false, error: 'The demo chama is not open yet.' };
    const existing = await prisma.membership.findUnique({ where: { groupId_clerkUserId: { groupId, clerkUserId: userId } }, select: { id: true } });
    if (!existing) {
      const { demoMemberName } = await import('@stawi/core');
      const phone = await getUserPhone().catch(() => null);
      await prisma.membership.create({ data: { groupId, clerkUserId: userId, fullName: demoMemberName(phone), phone: null, role: 'MEMBER' } });
    }
    publishEvent({ type: 'group', channel: groupChannel(groupId) });
    return { ok: true, groupId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not join the demo chama.' };
  }
}

/** The group's officials choose which sections the group uses (owner 20/11/26). */
export async function saveModulesAction(input: {
  groupId: string;
  modules: unknown;
}): Promise<{ ok: boolean; persisted: boolean; error?: string }> {
  const { sanitizeModules } = await import('@stawi/core');
  if (!input.groupId) return { ok: false, persisted: false, error: 'Missing group.' };
  const chosen = sanitizeModules(input.modules);
  if (!dbEnabled()) {
    (await import('@/lib/modules')).setDemoModules(input.groupId, chosen);
    return { ok: true, persisted: false };
  }
  const denied = await requireGroupRole(input.groupId, 'records');
  if (denied) return { ok: false, persisted: false, error: 'Only group officials (chair, secretary, treasurer) can change what the group uses.' };
  try {
    const { prisma } = await import('@stawi/db');
    await prisma.group.update({ where: { id: input.groupId }, data: { modules: chosen } });
    publishEvent({ type: 'group', channel: groupChannel(input.groupId) });
    return { ok: true, persisted: true };
  } catch (e) {
    return { ok: false, persisted: false, error: e instanceof Error ? e.message : 'Save failed' };
  }
}

export async function saveCharterAction(input: {
  groupId: string;
  charter: unknown;
}): Promise<{ ok: boolean; persisted: boolean; error?: string }> {
  const c = input.charter as any;
  if (!c?.name?.trim()) return { ok: false, persisted: false, error: 'Charter needs a group name.' };
  // Each person once on the roster — a phone entered twice would create two
  // membership rows and list the same member twice in every picker.
  if (Array.isArray(c.members) && duplicateRosterPhones(c.members).length) {
    return { ok: false, persisted: false, error: 'The same phone number is on the roster more than once. Each member should appear once.' };
  }
  // Screen the free-text governance fields.
  for (const field of [c.constitution, c.motto, c.mission, c.vision, c.notes]) {
    if (field) {
      const clean = await assertCleanSafe(String(field));
      if (!clean.ok) return { ok: false, persisted: false, error: clean.error };
    }
  }
  if (!dbEnabled()) {
    publishEvent({ type: 'charter', channel: 'public' });
    return { ok: true, persisted: false };
  }
  const deniedCharter = await requireGroupRole(input.groupId, 'records');
  if (deniedCharter) return { ok: false, persisted: false, error: deniedCharter };
  // The member list is the secretary's (or the chairperson's) to change (owner 28/11/26).
  // Any other official saving the charter keeps the stored list exactly as it is.
  let rosterBefore: any[] | null = null;
  {
    const { myGroupRole } = await import('@/lib/group-access');
    const { canEditRoster, cleanRoster } = await import('@stawi/core');
    const { prisma, getGroupCharter } = await import('@stawi/db');
    const stored = await getGroupCharter(prisma, input.groupId);
    const storedMembers = Array.isArray(stored?.members) ? (stored!.members as any[]) : [];
    if (canEditRoster(await myGroupRole(input.groupId))) {
      c.members = cleanRoster(Array.isArray(c.members) ? c.members : []);
      const leave = await rosterLeaveProblem(input.groupId, storedMembers, c.members);
      if (leave) return { ok: false, persisted: false, error: leave };
      rosterBefore = storedMembers;
    } else {
      c.members = storedMembers;
    }
  }
  try {
    const { prisma, upsertGroupCharter, provisionRosterMemberships } = await import('@stawi/db');
    await upsertGroupCharter(prisma, {
      groupId: input.groupId,
      tenantId: await tenantId(),
      name: c.name,
      logoUrl: c.logoUrl,
      schedule: c.schedule,
      members: c.members,
      constitution: c.constitution ?? '',
      constitutionFileUrl: c.constitutionFileUrl,
      motto: c.motto ?? '',
      mission: c.mission ?? '',
      vision: c.vision ?? '',
      coreValues: c.coreValues ?? [],
      notes: c.notes,
      registeredNumber: c.registeredNumber,
      countryCode: c.countryCode ?? 'KE',
    });
    // Phone-first: seed membership rows from the roster so members are linked on sign-in.
    try {
      const roster = (Array.isArray(c.members) ? c.members : [])
        .filter((m: any) => m?.phone && m?.fullName)
        .map((m: any) => ({ fullName: m.fullName, phone: m.phone, designation: m.designation }));
      if (roster.length) await provisionRosterMemberships(prisma, { groupId: input.groupId, tenantId: await tenantId(), roster });
    } catch { /* non-fatal */ }
    if (rosterBefore) await applyRosterAccess(input.groupId, rosterBefore, c.members);
    publishEvent({ type: 'charter', channel: groupChannel(input.groupId) });
    return { ok: true, persisted: true };
  } catch (e) {
    return { ok: false, persisted: false, error: e instanceof Error ? e.message : 'Save failed' };
  }
}

export async function saveMeetingAction(input: {
  groupId: string;
  meeting: unknown;
}): Promise<{ ok: boolean; persisted: boolean; error?: string }> {
  const m = input.meeting as any;
  if (!m?.meetingNo) return { ok: false, persisted: false, error: 'Meeting number missing.' };
  if (!dbEnabled()) {
    publishEvent({ type: 'meeting', channel: 'public' });
    return { ok: true, persisted: false };
  }
  // Minutes: the secretary only, or the stand-in the chair named (owner 27/11/26).
  const { minutesAccess, MINUTES_DENIED } = await import('@/lib/minutes-access');
  if (!(await minutesAccess(input.groupId)).allowed) return { ok: false, persisted: false, error: MINUTES_DENIED };
  const { checkMeetingWrite } = await import('@/lib/meeting-guard');
  const refused = await checkMeetingWrite(input.groupId, m);
  if (refused) return { ok: false, persisted: false, error: refused.error };
  try {
    const { prisma, upsertMeeting } = await import('@stawi/db');
    await upsertMeeting(prisma, { groupId: input.groupId, tenantId: await tenantId(), ...m });
    publishEvent({ type: 'meeting', channel: groupChannel(input.groupId) });
    return { ok: true, persisted: true };
  } catch (e) {
    return { ok: false, persisted: false, error: e instanceof Error ? e.message : 'Save failed' };
  }
}

/** Official posts a meeting after editing its generated professional document. */
export async function postMeetingAction(input: {
  groupId: string;
  meetingNo: number;
  generatedDoc: string;
}): Promise<{ ok: boolean; persisted: boolean; error?: string }> {
  if (!dbEnabled()) {
    publishEvent({ type: 'meeting', channel: 'public' });
    return { ok: true, persisted: false };
  }
  // Minutes: the secretary only, or the stand-in the chair named (owner 27/11/26).
  const { minutesAccess, MINUTES_DENIED } = await import('@/lib/minutes-access');
  if (!(await minutesAccess(input.groupId)).allowed) return { ok: false, persisted: false, error: MINUTES_DENIED };
  const { checkMeetingPost } = await import('@/lib/meeting-guard');
  const refusedPost = await checkMeetingPost(input.groupId, input.meetingNo);
  if (refusedPost) return { ok: false, persisted: false, error: refusedPost.error };
  try {
    const { prisma, postMeeting } = await import('@stawi/db');
    await postMeeting(prisma, { groupId: input.groupId, meetingNo: input.meetingNo, generatedDoc: input.generatedDoc, tenantId: await tenantId() });
    publishEvent({ type: 'meeting', channel: groupChannel(input.groupId) });
    return { ok: true, persisted: true };
  } catch (e) {
    return { ok: false, persisted: false, error: e instanceof Error ? e.message : 'Post failed' };
  }
}

export async function saveStatementAction(input: {
  groupId: string;
  year: number;
  month: number;
  payload: unknown;
  post?: boolean;
}): Promise<{ ok: boolean; persisted: boolean; error?: string }> {
  if (!dbEnabled()) return { ok: true, persisted: false };
  const deniedStatement = await requireGroupRole(input.groupId, 'records');
  if (deniedStatement) return { ok: false, persisted: false, error: deniedStatement };
  // Only a month the picker offers (has meetings, not in the future); the
  // figures are recomputed from the stored meetings, never taken from the client.
  const narrative = (input.payload as any)?.narrative;
  if (Array.isArray(narrative)) {
    for (const p of narrative) {
      const clean = await assertCleanSafe(String(p ?? ''));
      if (!clean.ok) return { ok: false, persisted: false, error: clean.error };
    }
  }
  const { buildServerStatement } = await import('@/lib/meeting-guard');
  const built = await buildServerStatement(input.groupId, input.year, input.month, narrative);
  if ('error' in built) return { ok: false, persisted: false, error: built.error };
  try {
    const { prisma, saveMonthlyStatement } = await import('@stawi/db');
    await saveMonthlyStatement(prisma, { groupId: input.groupId, tenantId: await tenantId(), year: input.year, month: input.month, payload: built.statement, post: input.post });
    return { ok: true, persisted: true };
  } catch (e) {
    return { ok: false, persisted: false, error: e instanceof Error ? e.message : 'Save failed' };
  }
}

/** Moderation wrapper that never throws — returns a friendly error instead. */
async function assertCleanSafe(text: string): Promise<{ ok: boolean; error?: string }> {
  try {
    assertClean(text);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Content not allowed' };
  }
}

/**
 * Plain-language explanation of one member's month-end figures.
 *
 * Read-only and propose-only: it rephrases figures the statement already shows,
 * never moves money and gives no financial advice. The optional AI pass
 * (MEMBER_EXPLANATION_PROVIDER=anthropic + key) runs only for a signed-in user,
 * once per click; everyone else — and any failure — gets the free template.
 */
export async function explainMemberStatementAction(input: {
  groupName: string;
  periodLabel: string;
  meetingsHeld: number;
  member: {
    memberId: string;
    name: string;
    meetingsPresent: number;
    meetingsApology: number;
    meetingsAbsent: number;
    attendancePct: number;
    contributedCents: number;
    finesCents: number;
  };
  closingCents: number;
}): Promise<{ ok: boolean; text?: string; usedModel?: boolean; error?: string }> {
  const { explainMemberStatement } = await import('@stawi/core');
  const { createMemberStatementGenerate } = await import('@/lib/member-statement-ai');
  const { getUserId } = await import('@/lib/auth');

  const whole = (n: number) => (Number.isFinite(n) && n >= 0 ? Math.round(n) : 0);
  const text = (s: string, max: number) => String(s ?? '').slice(0, max);
  if (!input?.member) return { ok: false, error: 'Missing member' };

  const signedIn = Boolean(await getUserId());
  try {
    const result = await explainMemberStatement(
      {
        groupName: text(input.groupName, 120),
        periodLabel: text(input.periodLabel, 40),
        meetingsHeld: whole(input.meetingsHeld),
        member: {
          memberId: text(input.member.memberId, 80),
          name: text(input.member.name, 80),
          meetingsPresent: whole(input.member.meetingsPresent),
          meetingsApology: whole(input.member.meetingsApology),
          meetingsAbsent: whole(input.member.meetingsAbsent),
          attendancePct: Math.min(100, whole(input.member.attendancePct)),
          contributedCents: whole(input.member.contributedCents),
          finesCents: whole(input.member.finesCents),
        },
        finance: {
          openingCents: 0,
          contributionsCents: 0,
          finesCents: 0,
          otherInCents: 0,
          payoutsCents: 0,
          otherOutCents: 0,
          totalInCents: 0,
          totalOutCents: 0,
          closingCents: whole(input.closingCents),
        },
      },
      // AI only for a signed-in user; anonymous viewers get the free template.
      signedIn ? createMemberStatementGenerate() : undefined,
    );
    return { ok: true, text: result.text, usedModel: result.usedModel };
  } catch {
    return { ok: false, error: 'Could not prepare the explanation' };
  }
}

/**
 * Change the name you show in one group (owner 26/11/26). Only your own
 * membership rows in that group: matched by your login, or by your verified
 * phone for a roster row not yet linked. Role and money are untouched.
 */
export async function updateMyNameAction(input: { groupId: string; name: string }): Promise<{ ok: boolean; name?: string; error?: string }> {
  const { cleanDisplayName } = await import('@stawi/core');
  const checked = cleanDisplayName(input.name);
  if (!checked.ok) return { ok: false, error: checked.error };
  const clean = await assertCleanSafe(checked.name);
  if (!clean.ok) return { ok: false, error: clean.error };
  if (!dbEnabled()) return { ok: true, name: checked.name };
  const { getUserId, getUserPhone } = await import('@/lib/auth');
  const userId = await getUserId();
  if (!userId || !input.groupId) return { ok: false, error: 'Please sign in again.' };
  const phone = await getUserPhone().catch(() => null);
  const key = phone ? phone.replace(/\D/g, '').replace(/^0+/, '').slice(-9) : '';
  const { prisma } = await import('@stawi/db');
  const done = await prisma.membership.updateMany({
    where: { groupId: input.groupId, OR: [{ clerkUserId: userId }, ...(key.length === 9 ? [{ phone: { endsWith: key } }] : [])] },
    data: { fullName: checked.name },
  });
  if (done.count === 0) return { ok: false, error: 'You are not a member of this group.' };
  publishEvent({ type: 'group', channel: groupChannel(input.groupId) });
  return { ok: true, name: checked.name };
}

/** Name a stand-in to write the minutes while the secretary is away (chair or secretary only; owner 27/11/26). */
export async function appointStandInAction(input: { groupId: string; membershipId: string; days: number; reason?: string }): Promise<{ ok: boolean; error?: string }> {
  if (!dbEnabled()) return { ok: false, error: 'Stand-ins open when the live records are connected.' };
  const { standInProblem } = await import('@stawi/core');
  const { myGroupRole, myMembershipIds } = await import('@/lib/group-access');
  const { prisma } = await import('@stawi/db');
  const [role, myIds, members] = await Promise.all([
    myGroupRole(input.groupId),
    myMembershipIds(input.groupId),
    prisma.membership.findMany({ where: { groupId: input.groupId }, select: { id: true } }),
  ]);
  const problem = standInProblem({ appointerRole: role, membershipId: input.membershipId, memberIds: members.map((m) => m.id), days: Math.round(Number(input.days)) });
  if (problem) return { ok: false, error: problem };
  const now = new Date();
  const until = new Date(now.getTime() + Math.round(Number(input.days)) * 86_400_000);
  await prisma.$transaction([
    // One stand-in at a time: naming a new one ends the current one.
    prisma.minutesStandIn.updateMany({ where: { groupId: input.groupId, endedAt: null }, data: { endedAt: now } }),
    prisma.minutesStandIn.create({
      data: { groupId: input.groupId, membershipId: input.membershipId, until, reason: (input.reason ?? '').trim().slice(0, 200) || null, setByMembershipId: myIds[0] ?? 'unknown' },
    }),
  ]);
  publishEvent({ type: 'charter', channel: groupChannel(input.groupId) });
  return { ok: true };
}

/** End the stand-in early (chair or secretary). */
export async function endStandInAction(input: { groupId: string }): Promise<{ ok: boolean; error?: string }> {
  if (!dbEnabled()) return { ok: false, error: 'Stand-ins open when the live records are connected.' };
  const { myGroupRole } = await import('@/lib/group-access');
  const role = await myGroupRole(input.groupId);
  if (role !== 'CHAIRMAN' && role !== 'SECRETARY') return { ok: false, error: 'Only the chair or the secretary can end a stand-in.' };
  const { prisma } = await import('@stawi/db');
  await prisma.minutesStandIn.updateMany({ where: { groupId: input.groupId, endedAt: null }, data: { endedAt: new Date() } });
  publishEvent({ type: 'charter', channel: groupChannel(input.groupId) });
  return { ok: true };
}

/**
 * Save the member list straight away (owner 28/11/26: "Add member" must open a
 * form and save; only the secretary or the chairperson adds, changes or
 * removes members). Everything else in the charter stays as stored.
 */
export async function saveRosterAction(input: { groupId: string; members: unknown }): Promise<{ ok: boolean; error?: string }> {
  if (!dbEnabled()) return { ok: true };
  const { myGroupRole } = await import('@/lib/group-access');
  const { canEditRoster, cleanRoster, duplicateRosterPhones } = await import('@stawi/core');
  if (!canEditRoster(await myGroupRole(input.groupId))) return { ok: false, error: 'Only the secretary or the chairperson adds, changes or removes members.' };
  const members = cleanRoster(Array.isArray(input.members) ? (input.members as any[]) : []);
  if (members.length > 500) return { ok: false, error: 'A group can list up to 500 members.' };
  for (const m of members) {
    const clean = await assertCleanSafe(String(m.fullName ?? ''));
    if (!clean.ok) return { ok: false, error: clean.error };
  }
  if (duplicateRosterPhones(members).length) return { ok: false, error: 'The same phone number is on the list more than once. Each member should appear once.' };
  try {
    const { prisma, getGroupCharter, upsertGroupCharter, provisionRosterMemberships } = await import('@stawi/db');
    const stored = await getGroupCharter(prisma, input.groupId);
    const before = Array.isArray(stored?.members) ? (stored!.members as any[]) : [];
    const leave = await rosterLeaveProblem(input.groupId, before, members);
    if (leave) return { ok: false, error: leave };
    const group = stored ? null : await prisma.group.findUnique({ where: { id: input.groupId }, select: { name: true, countryCode: true } });
    const t = await tenantId();
    await upsertGroupCharter(prisma, {
      groupId: input.groupId,
      tenantId: t,
      name: stored?.name ?? group?.name ?? 'Our group',
      logoUrl: stored?.logoUrl ?? undefined,
      schedule: stored?.schedule ?? { venue: '', days: [], startTime: '', endTime: '', frequency: 'Weekly' },
      members,
      constitution: stored?.constitution ?? '',
      constitutionFileUrl: stored?.constitutionFileUrl ?? undefined,
      motto: stored?.motto ?? '',
      mission: stored?.mission ?? '',
      vision: stored?.vision ?? '',
      coreValues: stored?.coreValues ?? [],
      notes: stored?.notes ?? undefined,
      registeredNumber: stored?.registeredNumber ?? undefined,
      countryCode: stored?.countryCode ?? group?.countryCode ?? 'KE',
    });
    const roster = members.filter((m: any) => m.phone && m.fullName).map((m: any) => ({ fullName: m.fullName, phone: m.phone, designation: m.designation }));
    if (roster.length) await provisionRosterMemberships(prisma, { groupId: input.groupId, tenantId: t, roster }).catch(() => undefined);
    await applyRosterAccess(input.groupId, before, members);
    publishEvent({ type: 'charter', channel: groupChannel(input.groupId) });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Not saved. Try again.' };
  }
}

/**
 * Leaving and returning (owner 28/11/26). Before a list change is saved: the
 * person saving cannot take themselves off, and the chairperson cannot be
 * taken off until someone else holds that role. After it is saved: members no
 * longer on the list are marked as left (no access; records stay), and anyone
 * on the list regains access.
 */
async function rosterLeaveProblem(groupId: string, before: unknown[], after: unknown[]): Promise<string | null> {
  const { rosterAccessChanges } = await import('@stawi/core');
  const { left } = rosterAccessChanges(before as any[], after as any[]);
  if (!left.length) return null;
  const { getUserPhone } = await import('@/lib/auth');
  const mine = (await getUserPhone().catch(() => null))?.replace(/\D/g, '').slice(-9);
  if (mine && left.includes(mine)) return 'You cannot take yourself off the list. Ask the chairperson or the secretary.';
  const { prisma } = await import('@stawi/db');
  const chairs = await prisma.membership.findMany({ where: { groupId, leftAt: null, role: 'CHAIRMAN' }, select: { phone: true } });
  if (chairs.some((c) => c.phone && left.includes(c.phone.replace(/\D/g, '').slice(-9)))) return 'The chairperson cannot be taken off the list. Make someone else chairperson first.';
  return null;
}

async function applyRosterAccess(groupId: string, before: unknown[], after: unknown[]): Promise<void> {
  const { rosterAccessChanges } = await import('@stawi/core');
  const { left, onList } = rosterAccessChanges(before as any[], after as any[]);
  const { prisma } = await import('@stawi/db');
  for (const k of left) await prisma.membership.updateMany({ where: { groupId, phone: { endsWith: k }, leftAt: null }, data: { leftAt: new Date() } });
  if (onList.length) await prisma.membership.updateMany({ where: { groupId, leftAt: { not: null }, OR: onList.map((k) => ({ phone: { endsWith: k } })) }, data: { leftAt: null } });
}
