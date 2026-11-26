/**
 * Messages inside the app (owner 20/11/26) — server side. Membership and
 * visibility are decided here; a browser only ever receives messages the
 * viewer may read. No phone number leaves the server.
 */
import {
  MESSAGES_PAGE, canSeeMessage, checkMessage, sendingTooFast, summariseThreads, threadForNewMessage,
  type MessageChannel, type ThreadSummary,
} from '@stawi/core';
import { getUserId, getUserPhone } from './auth';
import { dbEnabled } from './data';
import { RECORD_EDITOR_ROLES, type GroupRole } from './group-access';
import { getGroupModules } from './modules';

export interface MessageView {
  id: string;
  body: string;
  at: string;
  mine: boolean;
  /** Sender's membership id in this group (lets a member block them on their own phone). */
  from: string;
  name: string;
  official: boolean;
}

export interface MessagesView {
  me: { id: string; official: boolean };
  channel: MessageChannel;
  thread: string | null;
  messages: MessageView[];
  /** Officials only, on "Ask the officials": who has written, unanswered first. */
  threads: (ThreadSummary & { name: string })[];
}

/** Sender id of notices Stawi itself posts (daily alerts): shown as "Stawi". */
export const STAWI_SENDER = 'stawi';

interface Row { id: string; channel: string; threadMemberId: string | null; senderMembershipId: string; body: string; createdAt: Date }

/** Demo mode (no database): messages live for the life of the server process. */
const demo = new Map<string, Row[]>();
const DEMO_ME = { id: 'demo-me', fullName: 'You', role: 'CHAIRMAN' as GroupRole };

const last9 = (raw: string) => raw.replace(/\D/g, '').replace(/^0+/, '').slice(-9);

async function context(groupId: string) {
  const modules = await getGroupModules(groupId);
  if (!modules.messages) return { off: true as const };
  if (!dbEnabled()) {
    return { off: false as const, me: DEMO_ME, official: true, showPosts: true, people: new Map([[DEMO_ME.id, DEMO_ME]]) };
  }
  const userId = await getUserId();
  if (!userId) return null;
  const phone = await getUserPhone().catch(() => null);
  const key = phone ? last9(phone) : '';
  const { prisma } = await import('@stawi/db');
  const rows = await prisma.membership.findMany({ where: { groupId }, select: { id: true, fullName: true, role: true, clerkUserId: true, phone: true } });
  const mine = rows.filter((r) => r.clerkUserId === userId || (key.length === 9 && !!r.phone && last9(r.phone) === key));
  if (mine.length === 0) return null;
  // Matched more than once: act as the most senior row.
  const me = mine.find((r) => RECORD_EDITOR_ROLES.has(r.role as GroupRole)) ?? mine[0]!;
  const official = RECORD_EDITOR_ROLES.has(me.role as GroupRole);
  return {
    off: false as const,
    me: { id: me.id, fullName: me.fullName, role: me.role as GroupRole },
    official,
    // Posts switched off: only officials see who holds a post.
    showPosts: modules.officials || official,
    people: new Map(rows.map((r) => [r.id, { id: r.id, fullName: r.fullName, role: r.role as GroupRole }])),
  };
}

export type MessagesResult = { status: 200; view: MessagesView } | { status: 403 | 404; error: string };

export async function readMessages(groupId: string, channel: MessageChannel, thread: string | null): Promise<MessagesResult> {
  const ctx = await context(groupId);
  if (!ctx) return { status: 404, error: 'Not found' };
  if (ctx.off) return { status: 403, error: 'Messages are switched off for this group.' };
  const viewer = { membershipId: ctx.me.id, official: ctx.official };

  let rows: Row[];
  if (!dbEnabled()) {
    rows = (demo.get(groupId) ?? []).filter((r) => r.channel === channel);
  } else {
    const { prisma } = await import('@stawi/db');
    rows = await prisma.groupMessage.findMany({
      where: { groupId, channel, ...(channel === 'OFFICIALS' && !ctx.official ? { threadMemberId: ctx.me.id } : {}) },
      orderBy: { createdAt: 'desc' },
      take: channel === 'OFFICIALS' && ctx.official ? 400 : MESSAGES_PAGE,
    });
    rows.reverse();
  }
  // The rule that matters, applied to every row whatever the query returned.
  rows = rows.filter((r) => canSeeMessage({ channel, threadMemberId: r.threadMemberId }, viewer));

  const name = (id: string) => (id === STAWI_SENDER ? 'Stawi' : ctx.people.get(id)?.fullName?.trim() || 'Member');
  const isOfficial = (id: string) => ctx.showPosts && RECORD_EDITOR_ROLES.has((ctx.people.get(id)?.role ?? 'MEMBER') as GroupRole);

  let threads: MessagesView['threads'] = [];
  let shown = rows;
  let openThread: string | null = null;
  if (channel === 'OFFICIALS') {
    if (ctx.official) {
      threads = summariseThreads(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))).map((t) => ({ ...t, name: name(t.memberId) }));
      openThread = thread && threads.some((t) => t.memberId === thread) ? thread : null;
      shown = openThread ? rows.filter((r) => r.threadMemberId === openThread) : [];
    } else {
      openThread = ctx.me.id;
    }
  }

  return {
    status: 200,
    view: {
      me: { id: ctx.me.id, official: ctx.official },
      channel,
      thread: openThread,
      threads,
      messages: shown.slice(-MESSAGES_PAGE).map((r) => ({
        id: r.id,
        body: r.body,
        at: r.createdAt.toISOString(),
        mine: r.senderMembershipId === ctx.me.id,
        from: r.senderMembershipId,
        name: name(r.senderMembershipId),
        official: isOfficial(r.senderMembershipId),
      })),
    },
  };
}

export type SendResult = { ok: true } | { ok: false; status: number; error: string; errorSw?: string };

export async function sendMessage(groupId: string, input: { channel: MessageChannel; body: unknown; replyTo?: string | null }): Promise<SendResult> {
  const ctx = await context(groupId);
  if (!ctx) return { ok: false, status: 404, error: 'Not found' };
  if (ctx.off) return { ok: false, status: 403, error: 'Messages are switched off for this group.' };
  const checked = checkMessage(input.body);
  if (!checked.ok) return { ok: false, status: 400, error: checked.error.en, errorSw: checked.error.sw };
  const thread = threadForNewMessage(input.channel, { membershipId: ctx.me.id, official: ctx.official }, input.replyTo);
  if (!thread.ok) return { ok: false, status: 400, error: thread.error.en, errorSw: thread.error.sw };
  if (thread.threadMemberId && !ctx.people.has(thread.threadMemberId)) return { ok: false, status: 400, error: 'That member is not in this group.' };

  if (!dbEnabled()) {
    const list = demo.get(groupId) ?? [];
    list.push({ id: `d${list.length + 1}`, channel: input.channel, threadMemberId: thread.threadMemberId, senderMembershipId: ctx.me.id, body: checked.body, createdAt: new Date() });
    demo.set(groupId, list.slice(-200));
    return { ok: true };
  }
  const { prisma } = await import('@stawi/db');
  const recent = await prisma.groupMessage.count({ where: { groupId, senderMembershipId: ctx.me.id, createdAt: { gt: new Date(Date.now() - 60_000) } } });
  if (sendingTooFast(recent)) return { ok: false, status: 429, error: 'You are sending very fast. Please wait a minute.', errorSw: 'Unatuma haraka sana. Tafadhali subiri dakika moja.' };
  await prisma.groupMessage.create({
    data: { groupId, channel: input.channel, threadMemberId: thread.threadMemberId, senderMembershipId: ctx.me.id, body: checked.body },
  });
  // Every member with the app hears about it (owner 26/11/26); never blocks the send.
  const { alertNewMessage } = await import('./group-alerts');
  void alertNewMessage({ groupId, senderMembershipId: ctx.me.id, body: checked.body, channel: input.channel, threadMemberId: thread.threadMemberId });
  return { ok: true };
}
