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
  assertClean, bizEntryProblem, closeDay, costOfSale, dayIsLocked, balancesOf, journal,
  EXPENSE_CATEGORIES, type BizChannel, type BizEntry, type BizKind, type BizLevel, type ExpenseCategory, type BizOpening,
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
  if (input.itemId) {
    const item = await prisma.bizItem.findFirst({ where: { id: input.itemId, businessId, archivedAt: null }, select: { id: true, service: true } });
    if (!item) return { ok: false, error: 'That item is not in your list.' };
    if (!qty) return { ok: false, error: 'Enter how many.' };
    itemId = item.id;
    const before = await branchEntries(prisma, businessId, input.branchId);
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
export async function saveBizItemAction(input: { groupId: string; id?: string; name: string; unit: string; priceCents: number; reorderAt: number; service?: boolean; archive?: boolean }): Promise<Result> {
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
  const data = { name: name.value, unit: unit.value ?? 'piece', priceCents, reorderAt, service: !!input.service };
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
