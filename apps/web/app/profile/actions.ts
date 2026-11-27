'use server';

/**
 * My profile actions (owner 26/11/26). Each changes only the caller's own
 * rows. Changing the phone or the PIN asks for the current PIN first.
 */
import { revalidatePath } from 'next/cache';
import { me, myMembershipsWhere, photoLink } from '@/lib/profile';
import { dbEnabled } from '@/lib/data';

type Result = { ok: boolean; error?: string; message?: string };

async function ready() {
  if (!dbEnabled()) return { error: 'Your profile opens when the live records are connected.' } as const;
  const who = await me();
  if (!who) return { error: 'Please sign in again.' } as const;
  const { prisma } = await import('@stawi/db');
  return { who, prisma } as const;
}

/** One name for me in every group I belong to. */
export async function saveMyNameAction(name: string): Promise<Result> {
  const ctx = await ready();
  if ('error' in ctx) return { ok: false, error: ctx.error };
  const { cleanDisplayName, assertClean } = await import('@stawi/core');
  const checked = cleanDisplayName(name);
  if (!checked.ok) return { ok: false, error: checked.error };
  try { assertClean(checked.name); } catch { return { ok: false, error: 'Please use your real name.' }; }
  const done = await ctx.prisma.membership.updateMany({ where: myMembershipsWhere(ctx.who), data: { fullName: checked.name } });
  revalidatePath('/', 'layout');
  return { ok: true, message: done.count ? `Saved. Every group now shows you as ${checked.name}.` : 'Saved. Join or start a group and it will show this name.' };
}

/** A photo already shrunk on the phone (about 256 px). Bytes kept apart from the roster. */
export async function saveMyPhotoAction(dataUrl: string): Promise<Result> {
  const ctx = await ready();
  if ('error' in ctx) return { ok: false, error: ctx.error };
  const { photoProblem } = await import('@stawi/core');
  const problem = photoProblem(dataUrl);
  if (problem) return { ok: false, error: problem };
  const { createHash } = await import('node:crypto');
  const version = createHash('sha256').update(dataUrl).digest('hex').slice(0, 10);
  await ctx.prisma.profilePhoto.upsert({
    where: { userId: ctx.who.userId },
    create: { userId: ctx.who.userId, dataUrl, version },
    update: { dataUrl, version },
  });
  await ctx.prisma.membership.updateMany({ where: myMembershipsWhere(ctx.who), data: { photoUrl: photoLink(ctx.who.userId, version) } });
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Photo saved.' };
}

/** My email (owner 27/11/26): optional, never used to sign in. Empty removes it. */
export async function saveMyEmailAction(email: string): Promise<Result> {
  const ctx = await ready();
  if ('error' in ctx) return { ok: false, error: ctx.error };
  const { contactEmail } = await import('@stawi/core');
  const checked = contactEmail(email);
  if (!checked.ok) return { ok: false, error: checked.error };
  await ctx.prisma.profileContact.upsert({
    where: { userId: ctx.who.userId },
    create: { userId: ctx.who.userId, email: checked.email },
    update: { email: checked.email },
  });
  revalidatePath('/profile');
  return { ok: true, message: checked.email ? 'Saved. Receipts and statements can go to this email.' : 'Your email was removed.' };
}

export async function removeMyPhotoAction(): Promise<Result> {
  const ctx = await ready();
  if ('error' in ctx) return { ok: false, error: ctx.error };
  await ctx.prisma.profilePhoto.deleteMany({ where: { userId: ctx.who.userId } });
  await ctx.prisma.membership.updateMany({ where: myMembershipsWhere(ctx.who), data: { photoUrl: null } });
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Photo removed.' };
}

/**
 * Move my account to a new phone number. Needs my current PIN. Refused when the
 * number already has a Stawi account, or a group has added it for someone else
 * (that person must keep it). From then on I sign in, and get M-Pesa prompts,
 * on the new number.
 */
export async function changeMyPhoneAction(input: { phone: string; pin: string }): Promise<Result> {
  const ctx = await ready();
  if ('error' in ctx) return { ok: false, error: ctx.error };
  const { phoneChange, phoneKey } = await import('@stawi/core');
  const current = (await ctx.prisma.authPin.findUnique({ where: { userId: ctx.who.userId }, select: { phone: true } }))?.phone ?? ctx.who.loginPhone;
  const change = phoneChange(current, input.phone);
  if (!change.ok) return { ok: false, error: change.error };
  const { confirmMyPin } = await import('@/lib/money-trust');
  const pinError = await confirmMyPin(input.pin);
  if (pinError) return { ok: false, error: pinError };
  const { findUserIdByPhone } = await import('@/lib/pin');
  const owner = await findUserIdByPhone(change.phone);
  if (owner && owner !== ctx.who.userId) return { ok: false, error: 'That number already has a Stawi account. Use another number.' };
  const mine = await ctx.prisma.membership.findMany({ where: myMembershipsWhere(ctx.who), select: { id: true } });
  const taken = await ctx.prisma.membership.count({ where: { phone: { endsWith: phoneKey(change.phone) }, id: { notIn: mine.map((m) => m.id) } } });
  if (taken > 0) return { ok: false, error: 'A group has that number for another member. Ask your group officials to correct it first.' };

  const { createSupabaseAdminClient } = await import('@/lib/supabase/admin');
  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: 'Changing the number is not set up yet.' };
  const upd = await admin.auth.admin.updateUserById(ctx.who.userId, { phone: change.phone, phone_confirm: true });
  if (upd.error) return { ok: false, error: 'Could not change the number. Try again.' };
  await ctx.prisma.$transaction([
    ctx.prisma.authPin.updateMany({ where: { userId: ctx.who.userId }, data: { phone: change.phone } }),
    ctx.prisma.membership.updateMany({ where: { id: { in: mine.map((m) => m.id) } }, data: { phone: change.phone } }),
    ctx.prisma.trustedDevice.updateMany({ where: { userId: ctx.who.userId }, data: { phone: change.phone } }),
  ]);
  revalidatePath('/', 'layout');
  return { ok: true, message: `Done. From now on sign in with ${change.phone} and your same PIN. M-Pesa prompts go to this number.` };
}

export async function changeMyPinAction(input: { current: string; next: string; repeat: string }): Promise<Result> {
  const ctx = await ready();
  if ('error' in ctx) return { ok: false, error: ctx.error };
  const { pinChangeProblem } = await import('@stawi/core');
  const problem = pinChangeProblem(input.current, input.next, input.repeat);
  if (problem) return { ok: false, error: problem };
  const row = await ctx.prisma.authPin.findUnique({ where: { userId: ctx.who.userId }, select: { phone: true } });
  if (!row) return { ok: false, error: 'This account signs in another way and has no PIN to change.' };
  const { confirmMyPin } = await import('@/lib/money-trust');
  const pinError = await confirmMyPin(input.current);
  if (pinError) return { ok: false, error: pinError };
  const { hashPin } = await import('@/lib/pin');
  const { setAuthPin } = await import('@stawi/db');
  await setAuthPin(ctx.prisma, ctx.who.userId, await hashPin(input.next.trim()), row.phone);
  return { ok: true, message: 'PIN changed. Use the new PIN next time you sign in.' };
}
