'use server';

/**
 * Business books: writing (owner 28/11/26). Every rule is checked here on the
 * server, whatever the screen shows:
 *  - who may write (owner and officials: every branch; staff: their branch only),
 *  - a closed day is locked (later corrections go on an open day),
 *  - nothing is deleted: a mistake is corrected by a reversing entry,
 *  - the cost of goods sold is worked out here from the stock, never sent by the phone,
 *  - free text (names, notes) is screened like every other text in Stawi.
 * No money moves here: this is a record book.
 */
import { revalidatePath } from 'next/cache';
import {
  assertClean, bizEntryProblem, closeDay, costOfSale, crossedRedLine, dayIsLocked, balancesOf, itemPositions, journal, phoneKey, restockMessage, restockMoveProblem, whatsappLink,
  EXPENSE_CATEGORIES, type RestockStatus, type BizChannel, type BizEntry, type BizKind, type BizLevel, type ExpenseCategory, type BizOpening,
} from '@stawi/core';
import { dbEnabled } from '@/lib/data';
import { bizAccessFor, ensureBranches, loadBizBooks } from '@/lib/biz';
import { groupChannel, publishEvent } from '@/lib/events';
import type { PrismaClient } from '@stawi/db';

type Result = { ok: boolean; error?: string; id?: string };
const OFF = 'Your books open when the live records are connected.';
const KINDS: BizKind[] = ['SALE', 'STOCK_IN', 'EXPENSE', 'DEBT_PAID_IN', 'DEBT_PAID_OUT', 'OWNER_IN', 'OWNER_OUT', 'MOVE', 'STOCK_LOSS', 'OTHER_INCOME', 'EQUIPMENT', 'STOCK_COUNT', 'OPENING'];
const CHANNELS: BizChannel[] = ['CASH', 'MPESA', 'BANK', 'CREDIT'];
const OPENINGS: BizOpening[] = ['CASH', 'MPESA', 'BANK', 'STOCK', 'DEBTORS', 'CREDITORS', 'EQUIPMENT'];
const LEVELS: BizLevel[] = ['SIMPLE', 'GROWING', 'BUSY'];

function clean(text: string | undefined, max = 120): { ok: true; value?: string } | { ok: false; error: string } {
  const value = text?.trim().slice(0, max) || undefined;
  if (!value) return { ok: true };
  try { assertClean(value); } catch (e) { return { ok: false, error: e instanceof Error ? e.message : 'Please change the words.' }; }
  return { ok: true, value };
}

async function context(groupId: string) {
  if (!dbEnabled()) return { error: OFF } as const;
  const { prisma } = await import('@stawi/db');
  const biz = await prisma.business.findUnique({ where: { groupId }, select: { id: true } });
  if (!biz) return { error: 'This business has no books yet.' } as const;
  const branches = await ensureBranches(biz.id, groupId);
  const who = await bizAccessFor(groupId, biz.id, branches.map((b) => b.id));
  if (!who) return { error: 'You can only write in the books of your own business.' } as const;
  const me = await prisma.membership.findFirst({ where: { id: { in: who.membershipIds } }, select: { id: true, fullName: true } });
  return { prisma, businessId: biz.id, branches, access: who.access, me: { id: me?.id ?? who.membershipIds[0]!, name: me?.fullName ?? 'Member' } } as const;
}

const done = (groupId: string) => {
  revalidatePath('/business');
  publishEvent({ type: 'ledger', channel: groupChannel(groupId) });
};

/** Entries of one branch as the engine needs them (for stock cost and day close). */
async function branchEntries(prisma: PrismaClient, businessId: string, branchId: string): Promise<BizEntry[]> {
  const rows = await prisma.bizEntry.findMany({ where: { businessId, branchId }, orderBy: [{ day: 'asc' }, { recordedAt: 'asc' }] });
  return rows.map((r) => ({
    id: r.id, kind: r.kind as BizKind, amountCents: r.amountCents, channel: r.channel as BizChannel, toChannel: (r.toChannel ?? undefined) as BizEntry['toChannel'], day: r.day,
    branchId: r.branchId, itemId: r.itemId ?? undefined, qty: r.qty ?? undefined, costCents: r.costCents ?? undefined,
    party: r.party ?? undefined, category: (r.category ?? undefined) as BizEntry['category'], opening: (r.opening ?? undefined) as BizEntry['opening'], reverses: r.reversesId ?? undefined,
    recordedAt: r.recordedAt.toISOString(),
  }));
}

export interface RecordInput {
  groupId: string;
  branchId: string;
  kind: BizKind;
  amountCents: number;
  channel: BizChannel;
  toChannel?: BizChannel;
  day: string;
  itemId?: string;
  qty?: number;
  party?: string;
  category?: string;
  opening?: string;
  note?: string;
  etims?: boolean;
}

/** Write one entry in the books. */
export async function recordBizEntryAction(input: RecordInput): Promise<Result> {
  const c = await context(input.groupId);
  if ('error' in c) return { ok: false, error: c.error };
  const { prisma, businessId, access, me } = c;
  if (!KINDS.includes(input.kind) || !CHANNELS.includes(input.channel)) return { ok: false, error: 'That entry is not known.' };
  if (!access.branchIds.includes(input.branchId)) return { ok: false, error: 'You can only write for your own branch.' };
  if (!access.manage && ['OWNER_IN', 'OWNER_OUT', 'EQUIPMENT', 'STOCK_COUNT', 'OPENING'].includes(input.kind)) {
    return { ok: false, error: 'Only the owner writes this kind of entry.' };
  }
  const party = clean(input.party, 80);
  const note = clean(input.note, 160);
  if (!party.ok) return { ok: false, error: party.error };
  if (!note.ok) return { ok: false, error: note.error };
  const category = EXPENSE_CATEGORIES.includes(input.category as ExpenseCategory) ? (input.category as ExpenseCategory) : undefined;
  const opening = OPENINGS.includes(input.opening as BizOpening) ? (input.opening as BizOpening) : undefined;
  const toChannel = input.toChannel && input.toChannel !== 'CREDIT' ? input.toChannel : undefined;
  const qty = input.qty !== undefined && Number.isFinite(Number(input.qty)) && Number(input.qty) > 0 ? Math.round(Number(input.qty) * 1000) / 1000 : undefined;

  // A day already closed for this branch is locked.
  const closes = await prisma.bizDayClose.findMany({ where: { businessId, branchId: input.branchId }, select: { branchId: true, day: true } });
  if (dayIsLocked(closes, input.branchId, input.day)) return { ok: false, error: 'That day is closed for this branch. Write it on the next open day (tomorrow, if today is closed) and say in the note which day it was for.' };

  let itemId: string | undefined;
  let costCents: number | undefined;
  let amountCents = Math.round(Number(input.amountCents));
  let redLineCheck: { name: string; unit: string; reorderAt: number; before: number } | null = null;
  if (input.itemId) {
    const item = await prisma.bizItem.findFirst({ where: { id: input.itemId, businessId, archivedAt: null }, select: { id: true, service: true, name: true, unit: true, reorderAt: true } });
    if (!item) return { ok: false, error: 'That item is not in your list.' };
    if (!qty) return { ok: false, error: 'Enter how many.' };
    itemId = item.id;
    const before = await branchEntries(prisma, businessId, input.branchId);
    if ((input.kind === 'SALE' || input.kind === 'STOCK_LOSS') && !item.service && item.reorderAt > 0) {
      redLineCheck = { name: item.name, unit: item.unit, reorderAt: item.reorderAt, before: itemPositions(before, { branchId: input.branchId }).get(item.id)?.qty ?? 0 };
    }
    if (input.kind === 'SALE' && !item.service) costCents = costOfSale(before, item.id, qty, input.branchId, input.day);
    if (input.kind === 'STOCK_LOSS') amountCents = costOfSale(before, item.id, qty, input.branchId, input.day);
    if (input.kind === 'STOCK_LOSS' && amountCents <= 0) return { ok: false, error: 'This item has no cost in the books yet. Write the goods you bought first.' };
  }
  if (input.kind === 'STOCK_COUNT') {
    // The book value of goods counted by value, just before this count.
    const before = await branchEntries(prisma, businessId, input.branchId);
    costCents = balancesOf(journal(before).filter((l) => l.day <= input.day))['1210'] ?? 0;
  }

  const entry = { kind: input.kind, amountCents, channel: input.channel, toChannel, day: input.day, branchId: input.branchId, itemId, qty, costCents, party: party.value, category, opening, note: note.value, etims: !!input.etims };
  const problem = bizEntryProblem(entry);
  if (problem) return { ok: false, error: problem };

  const row = await prisma.bizEntry.create({
    data: {
      businessId, groupId: input.groupId, branchId: input.branchId, kind: entry.kind, amountCents: entry.amountCents, channel: entry.channel,
      toChannel: entry.toChannel ?? null, day: entry.day, itemId: entry.itemId ?? null, qty: entry.qty ?? null, costCents: entry.costCents ?? null,
      party: entry.party ?? null, category: entry.category ?? null, opening: entry.opening ?? null, note: entry.note ?? null, etims: entry.etims,
      recordedByMembershipId: me.id, recordedByName: me.name,
    },
    select: { id: true },
  });
  done(input.groupId);
  // Red line (owner 28/11/26): the sale that takes an item to its red line alerts the owner's phone.
  if (redLineCheck && qty && crossedRedLine(redLineCheck.before, redLineCheck.before - qty, redLineCheck.reorderAt)) {
    const left = Math.max(0, redLineCheck.before - qty);
    const branch = c.branches.find((b) => b.id === input.branchId)?.name ?? '';
    const { alertBusinessOfficials } = await import('@/lib/group-alerts');
    void alertBusinessOfficials(input.groupId, {
      title: `${redLineCheck.name} is at its red line`,
      body: `${left} ${redLineCheck.unit} left${c.branches.length > 1 ? ` at ${branch}` : ''}. Tap to ask your supplier to bring more.`,
      url: `/business?group=${encodeURIComponent(input.groupId)}&tab=restock`,
      tag: `redline-${itemId}`,
    });
  }
  return { ok: true, id: row.id };
}

/** Correct a mistake: a reversing entry cancels it; both stay in the record. Owner and officials only. */
export async function reverseBizEntryAction(input: { groupId: string; entryId: string; reason: string; today: string }): Promise<Result> {
  const c = await context(input.groupId);
  if ('error' in c) return { ok: false, error: c.error };
  const { prisma, businessId, access, me } = c;
  if (!access.manage) return { ok: false, error: 'Ask the owner to correct an entry.' };
  const reason = clean(input.reason, 160);
  if (!reason.ok) return { ok: false, error: reason.error };
  if (!reason.value) return { ok: false, error: 'Write why it is being corrected.' };
  const original = await prisma.bizEntry.findFirst({ where: { id: input.entryId, businessId } });
  if (!original) return { ok: false, error: 'That entry is not in these books.' };
  if (original.reversesId) return { ok: false, error: 'This is already a correction.' };
  if (await prisma.bizEntry.findFirst({ where: { reversesId: original.id }, select: { id: true } })) return { ok: false, error: 'This entry was already corrected.' };
  const closes = await prisma.bizDayClose.findMany({ where: { businessId, branchId: original.branchId }, select: { branchId: true, day: true } });
  // On the same day if it is still open, otherwise on today (the closed day stays as it was closed).
  const day = dayIsLocked(closes, original.branchId, original.day) ? input.today : original.day;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || dayIsLocked(closes, original.branchId, day)) return { ok: false, error: 'Today is already closed for this branch. Correct it tomorrow.' };
  const { id: _id, recordedAt: _at, recordedByMembershipId: _by, recordedByName: _name, reversesId: _r, ...same } = original;
  await prisma.bizEntry.create({
    data: { ...same, day, reversesId: original.id, note: `Correction: ${reason.value}`, recordedByMembershipId: me.id, recordedByName: me.name },
  });
  done(input.groupId);
  return { ok: true };
}

/** Close a branch's day: compare counted money with the books and lock the day. */
export async function closeBizDayAction(input: { groupId: string; branchId: string; day: string; counted: Partial<Record<'CASH' | 'MPESA' | 'BANK', number>> }): Promise<Result & { differences?: { channel: string; expectedCents: number; countedCents: number; diffCents: number }[] }> {
  const c = await context(input.groupId);
  if ('error' in c) return { ok: false, error: c.error };
  const { prisma, businessId, access, me } = c;
  if (!access.branchIds.includes(input.branchId)) return { ok: false, error: 'You can only close your own branch.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.day)) return { ok: false, error: 'Choose the day.' };
  if (await prisma.bizDayClose.findUnique({ where: { branchId_day: { branchId: input.branchId, day: input.day } } })) return { ok: false, error: 'This day is already closed.' };
  const counted: Partial<Record<'CASH' | 'MPESA' | 'BANK', number>> = {};
  for (const k of ['CASH', 'MPESA', 'BANK'] as const) {
    const v = input.counted[k];
    if (v !== undefined && v !== null && Number.isFinite(Number(v))) {
      if (Number(v) < 0) return { ok: false, error: 'A count cannot be below zero.' };
      counted[k] = Math.round(Number(v));
    }
  }
  if (counted.CASH === undefined) return { ok: false, error: 'Count the cash in the till first.' };
  const entries = await branchEntries(prisma, businessId, input.branchId);
  const result = closeDay(entries, { branchId: input.branchId, day: input.day, counted });
  await prisma.$transaction([
    ...result.adjustments.map((a) => prisma.bizEntry.create({
      data: { businessId, groupId: input.groupId, branchId: a.branchId, kind: a.kind, amountCents: a.amountCents, channel: a.channel, day: a.day, note: a.note ?? null, recordedByMembershipId: me.id, recordedByName: me.name },
    })),
    prisma.bizDayClose.create({ data: { businessId, groupId: input.groupId, branchId: input.branchId, day: input.day, expected: result.expected, counted, closedByMembershipId: me.id, closedByName: me.name } }),
  ]);
  done(input.groupId);
  return { ok: true, differences: result.differences };
}

/** Add or change an item (name, unit, price, warning level). Owner and officials. */
export async function saveBizItemAction(input: { groupId: string; id?: string; name: string; unit: string; priceCents: number; reorderAt: number; service?: boolean; archive?: boolean; supplierId?: string | null }): Promise<Result> {
  const c = await context(input.groupId);
  if ('error' in c) return { ok: false, error: c.error };
  const { prisma, businessId, access } = c;
  if (!access.manage) return { ok: false, error: 'Only the owner changes the item list.' };
  const name = clean(input.name, 60);
  const unit = clean(input.unit || 'piece', 20);
  if (!name.ok) return { ok: false, error: name.error };
  if (!unit.ok) return { ok: false, error: unit.error };
  if (!name.value) return { ok: false, error: 'Write the item’s name.' };
  const priceCents = Math.round(Number(input.priceCents));
  const reorderAt = Math.max(0, Math.round(Number(input.reorderAt) || 0));
  if (!Number.isFinite(priceCents) || priceCents < 0) return { ok: false, error: 'Check the selling price.' };
  let supplierId: string | null = null;
  if (input.supplierId) {
    const sup = await prisma.bizSupplier.findFirst({ where: { id: input.supplierId, businessId, archivedAt: null }, select: { id: true } });
    if (!sup) return { ok: false, error: 'That supplier is not in your list.' };
    supplierId = sup.id;
  }
  const data = { name: name.value, unit: unit.value ?? 'piece', priceCents, reorderAt, service: !!input.service, supplierId };
  if (input.id) {
    const found = await prisma.bizItem.findFirst({ where: { id: input.id, businessId }, select: { id: true } });
    if (!found) return { ok: false, error: 'That item is not in your list.' };
    await prisma.bizItem.update({ where: { id: found.id }, data: input.archive ? { archivedAt: new Date() } : data });
    done(input.groupId);
    return { ok: true, id: found.id };
  }
  const dup = await prisma.bizItem.findFirst({ where: { businessId, archivedAt: null, name: { equals: data.name, mode: 'insensitive' } }, select: { id: true } });
  if (dup) return { ok: false, error: 'An item with that name is already in your list.' };
  const row = await prisma.bizItem.create({ data: { ...data, businessId, groupId: input.groupId }, select: { id: true } });
  done(input.groupId);
  return { ok: true, id: row.id };
}

/** Add or rename a branch. Owner and officials. */
export async function saveBizBranchAction(input: { groupId: string; id?: string; name: string; town?: string }): Promise<Result> {
  const c = await context(input.groupId);
  if ('error' in c) return { ok: false, error: c.error };
  const { prisma, businessId, access, branches } = c;
  if (!access.manage) return { ok: false, error: 'Only the owner adds branches.' };
  const name = clean(input.name, 50);
  const town = clean(input.town, 50);
  if (!name.ok) return { ok: false, error: name.error };
  if (!town.ok) return { ok: false, error: town.error };
  if (!name.value) return { ok: false, error: 'Write the branch name.' };
  if (input.id) {
    if (!branches.some((b) => b.id === input.id)) return { ok: false, error: 'That branch is not in this business.' };
    await prisma.bizBranch.update({ where: { id: input.id }, data: { name: name.value, town: town.value ?? null } });
    done(input.groupId);
    return { ok: true, id: input.id };
  }
  if (branches.length >= 50) return { ok: false, error: 'A business can have up to 50 branches.' };
  const row = await prisma.bizBranch.create({ data: { businessId, groupId: input.groupId, name: name.value, town: town.value ?? null }, select: { id: true } });
  done(input.groupId);
  return { ok: true, id: row.id };
}

/**
 * Add a staff member who records for one branch. The owner only. They sign in
 * with their own phone and a joining code the owner gives them; they get no
 * official role, so they see only their branch.
 */
export async function addBizStaffAction(input: { groupId: string; name: string; phone: string; branchId: string }): Promise<Result> {
  const c = await context(input.groupId);
  if ('error' in c) return { ok: false, error: c.error };
  const { prisma, businessId, access, branches } = c;
  if (!access.owner) return { ok: false, error: 'Only the owner adds staff.' };
  if (!branches.some((b) => b.id === input.branchId)) return { ok: false, error: 'Choose one of your branches.' };
  const name = clean(input.name, 60);
  if (!name.ok) return { ok: false, error: name.error };
  if (!name.value) return { ok: false, error: 'Write the staff member’s name.' };
  const { phoneKey } = await import('@stawi/core');
  const key = phoneKey(input.phone ?? '');
  if (!key) return { ok: false, error: 'Write a full phone number.' };
  const { provisionRosterMemberships } = await import('@stawi/db');
  await provisionRosterMemberships(prisma, { groupId: input.groupId, roster: [{ fullName: name.value, phone: input.phone.trim(), designation: 'Member' }] });
  const rows = await prisma.membership.findMany({ where: { groupId: input.groupId }, select: { id: true, phone: true, role: true } });
  const member = rows.find((r) => r.phone && phoneKey(r.phone) === key);
  if (!member) return { ok: false, error: 'Could not add them. Try again.' };
  if (member.role !== 'MEMBER') return { ok: false, error: 'This person is already an official of the business and sees every branch.' };
  await prisma.bizStaff.upsert({
    where: { businessId_membershipId: { businessId, membershipId: member.id } },
    create: { businessId, groupId: input.groupId, membershipId: member.id, branchId: input.branchId },
    update: { branchId: input.branchId },
  });
  done(input.groupId);
  return { ok: true, id: member.id };
}

/** Stop a staff member recording (their past entries stay, with their name). The owner only. */
export async function removeBizStaffAction(input: { groupId: string; membershipId: string }): Promise<Result> {
  const c = await context(input.groupId);
  if ('error' in c) return { ok: false, error: c.error };
  if (!c.access.owner) return { ok: false, error: 'Only the owner removes staff.' };
  await c.prisma.bizStaff.deleteMany({ where: { businessId: c.businessId, membershipId: input.membershipId } });
  done(input.groupId);
  return { ok: true };
}

/** Simple, Growing or Busy. Owner and officials. */
export async function setBizLevelAction(input: { groupId: string; level: BizLevel }): Promise<Result> {
  const c = await context(input.groupId);
  if ('error' in c) return { ok: false, error: c.error };
  if (!c.access.manage) return { ok: false, error: 'Only the owner changes this.' };
  if (!LEVELS.includes(input.level)) return { ok: false, error: 'Choose Simple, Growing or Busy.' };
  await c.prisma.business.update({ where: { id: c.businessId }, data: { level: input.level } });
  done(input.groupId);
  return { ok: true };
}

/** Re-read the books (after a change, or when the live channel says so). */
export async function reloadBizBooksAction(groupId: string) {
  return loadBizBooks(groupId);
}

// ───────────────────────────── Suppliers and restocking (owner 28/11/26) ─────────────────────────────

const SITE = (process.env.NEXT_PUBLIC_APP_URL || 'https://getstawi.com').replace(/\/$/, '');
const REQUESTS_PER_DAY = 30;

/** Add or change a supplier (name, phone, days to deliver). Owner and officials. */
export async function saveBizSupplierAction(input: { groupId: string; id?: string; name: string; phone: string; leadDays: number; archive?: boolean }): Promise<Result> {
  const c = await context(input.groupId);
  if ('error' in c) return { ok: false, error: c.error };
  const { prisma, businessId, access } = c;
  if (!access.manage) return { ok: false, error: 'Only the owner changes suppliers.' };
  if (input.id && input.archive) {
    const found = await prisma.bizSupplier.findFirst({ where: { id: input.id, businessId }, select: { id: true } });
    if (!found) return { ok: false, error: 'That supplier is not in your list.' };
    await prisma.bizSupplier.update({ where: { id: found.id }, data: { archivedAt: new Date() } });
    done(input.groupId);
    return { ok: true };
  }
  const name = clean(input.name, 60);
  if (!name.ok) return { ok: false, error: name.error };
  if (!name.value) return { ok: false, error: 'Write the supplier’s name.' };
  const key = phoneKey(input.phone ?? '');
  if (!key) return { ok: false, error: 'Write the supplier’s full phone number.' };
  const leadDays = Math.min(30, Math.max(0, Math.round(Number(input.leadDays) || 0)));
  const data = { name: name.value, phone: input.phone.trim().slice(0, 20), phoneKey: key, leadDays };
  if (input.id) {
    const found = await prisma.bizSupplier.findFirst({ where: { id: input.id, businessId }, select: { id: true } });
    if (!found) return { ok: false, error: 'That supplier is not in your list.' };
    await prisma.bizSupplier.update({ where: { id: found.id }, data });
    done(input.groupId);
    return { ok: true, id: found.id };
  }
  if ((await prisma.bizSupplier.count({ where: { businessId, archivedAt: null } })) >= 200) return { ok: false, error: 'A business can list up to 200 suppliers.' };
  const row = await prisma.bizSupplier.create({ data: { ...data, businessId, groupId: input.groupId }, select: { id: true } });
  done(input.groupId);
  return { ok: true, id: row.id };
}

/**
 * Ask a supplier to bring more (owner 28/11/26). Owner and officials only: a
 * request commits the business to buy. Saved in Stawi (the supplier sees it if
 * they use Stawi and gets a phone alert), and returns a WhatsApp link with the
 * message ready so the owner can also send it there with one more tap.
 */
export async function sendRestockRequestAction(input: { groupId: string; branchId: string; supplierId: string; lines: { itemId: string; qty: number | null }[]; note?: string; lang?: 'en' | 'sw' }): Promise<Result & { whatsapp?: string | null; onStawi?: boolean }> {
  const c = await context(input.groupId);
  if ('error' in c) return { ok: false, error: c.error };
  const { prisma, businessId, access, branches, me } = c;
  if (!access.manage) return { ok: false, error: 'Only the owner asks suppliers for goods.' };
  if (!access.branchIds.includes(input.branchId)) return { ok: false, error: 'Choose one of your branches.' };
  const supplier = await prisma.bizSupplier.findFirst({ where: { id: input.supplierId, businessId, archivedAt: null } });
  if (!supplier) return { ok: false, error: 'Choose one of your suppliers.' };
  const note = clean(input.note, 200);
  if (!note.ok) return { ok: false, error: note.error };
  const wanted = (input.lines ?? []).slice(0, 40);
  if (wanted.length === 0) return { ok: false, error: 'Choose at least one item.' };
  const items = await prisma.bizItem.findMany({ where: { businessId, id: { in: wanted.map((l) => l.itemId) } }, select: { id: true, name: true, unit: true } });
  const lines = wanted.flatMap((l) => {
    const it = items.find((i) => i.id === l.itemId);
    if (!it) return [];
    const qty = l.qty === null || l.qty === undefined ? null : Math.round(Number(l.qty) * 1000) / 1000;
    if (qty !== null && !(qty > 0 && qty < 1_000_000)) return [];
    return [{ itemId: it.id, name: it.name, unit: it.unit, qty }];
  });
  if (lines.length === 0) return { ok: false, error: 'Check the quantities.' };
  const since = new Date(Date.now() - 86_400_000);
  if ((await prisma.bizRestockRequest.count({ where: { businessId, createdAt: { gte: since } } })) >= REQUESTS_PER_DAY) return { ok: false, error: 'That is many requests today. Try again tomorrow.' };
  const biz = await prisma.business.findUnique({ where: { id: businessId }, select: { name: true, group: { select: { countryCode: true } } } });
  const branch = branches.find((b) => b.id === input.branchId)!;
  const row = await prisma.bizRestockRequest.create({
    data: {
      businessId, groupId: input.groupId, branchId: branch.id, supplierId: supplier.id, supplierPhoneKey: supplier.phoneKey, supplierName: supplier.name,
      shopName: biz?.name ?? 'A shop', branchLabel: [branch.name, branch.town].filter(Boolean).join(', '), lines, note: note.value ?? null,
      createdByMembershipId: me.id, createdByName: me.name,
    },
    select: { id: true },
  });
  const link = `${SITE}/orders/${row.id}`;
  const text = restockMessage({ supplierName: supplier.name, shopName: biz?.name ?? 'A shop', branch: branch.name, town: branch.town, lines, note: note.value, link, lang: input.lang });
  const { alertByPhoneKey } = await import('@/lib/group-alerts');
  const onStawi = (await prisma.authPin.count({ where: { phone: { endsWith: supplier.phoneKey } } })) > 0;
  void alertByPhoneKey(supplier.phoneKey, {
    title: `Order request from ${biz?.name ?? 'a shop'}`,
    body: `${lines.length} item${lines.length > 1 ? 's' : ''} wanted${branch.town ? ` in ${branch.town}` : ''}. Tap to see and confirm.`,
    url: `/orders/${row.id}`,
    tag: `restock-${row.id}`,
  });
  done(input.groupId);
  return { ok: true, id: row.id, onStawi, whatsapp: whatsappLink(supplier.phone, text, biz?.group.countryCode ?? 'KE') };
}

/** The shop cancels a request, or says the goods arrived. Owner and officials. */
export async function updateRestockByShopAction(input: { groupId: string; requestId: string; to: RestockStatus }): Promise<Result> {
  const c = await context(input.groupId);
  if ('error' in c) return { ok: false, error: c.error };
  if (!c.access.manage) return { ok: false, error: 'Only the owner changes a request.' };
  const req = await c.prisma.bizRestockRequest.findFirst({ where: { id: input.requestId, businessId: c.businessId } });
  if (!req) return { ok: false, error: 'That request is not in these books.' };
  const problem = restockMoveProblem(req.status as RestockStatus, input.to, 'SHOP');
  if (problem) return { ok: false, error: problem };
  await c.prisma.bizRestockRequest.update({ where: { id: req.id }, data: { status: input.to } });
  if (input.to === 'CANCELLED') {
    const { alertByPhoneKey } = await import('@/lib/group-alerts');
    void alertByPhoneKey(req.supplierPhoneKey, { title: `${req.shopName} cancelled a request`, body: 'No need to deliver that order.', url: `/orders/${req.id}`, tag: `restock-${req.id}` });
  }
  done(input.groupId);
  return { ok: true };
}

/** Close the business (the owner only, name typed to confirm). Nothing is deleted; it can be reopened. */
export async function closeBusinessAction(input: { groupId: string; typedName: string }): Promise<Result> {
  const c = await context(input.groupId);
  if ('error' in c) return { ok: false, error: c.error };
  const { closeBusinessProblem } = await import('@stawi/core');
  const biz = await c.prisma.business.findUnique({ where: { id: c.businessId }, select: { name: true } });
  const problem = closeBusinessProblem({ owner: c.access.owner, name: biz?.name ?? '', typed: input.typedName ?? '' });
  if (problem) return { ok: false, error: problem };
  await c.prisma.group.update({ where: { id: input.groupId }, data: { closedAt: new Date() } });
  revalidatePath('/business');
  revalidatePath('/dashboard');
  return { ok: true };
}

/** Reopen a closed business (the owner only). */
export async function reopenBusinessAction(input: { groupId: string }): Promise<Result> {
  const c = await context(input.groupId);
  if ('error' in c) return { ok: false, error: c.error };
  if (!c.access.owner) return { ok: false, error: 'Only the owner reopens the business.' };
  await c.prisma.group.update({ where: { id: input.groupId }, data: { closedAt: null } });
  revalidatePath('/business');
  return { ok: true };
}
