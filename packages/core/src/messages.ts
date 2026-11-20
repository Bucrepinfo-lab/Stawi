/**
 * Messages inside the app (owner 20/11/26): members and officials talk, ask
 * and answer without phone calls.
 *
 * Two places to write, per group:
 *   - ALL        — everyone in the group reads and writes.
 *   - OFFICIALS  — "Ask the officials": a member's question is seen by that
 *                  member and the officials only; an official's reply goes into
 *                  that member's thread. Other members never see it.
 *
 * Plain text only. Every message passes the same safety screen as the rest of
 * Stawi. No phone number is ever shown beside a message. Pure: no I/O.
 */

import { moderateText } from './moderation';

export type MessageChannel = 'ALL' | 'OFFICIALS';
export const MESSAGE_CHANNELS: readonly MessageChannel[] = ['ALL', 'OFFICIALS'];

export const MESSAGE_MAX_CHARS = 500;
/** A person may send this many messages a minute in one group. */
export const MESSAGES_PER_MINUTE = 8;
/** Messages shown at a time, newest last. */
export const MESSAGES_PAGE = 60;

type Words = { en: string; sw: string };

export function messageChannel(input: unknown): MessageChannel {
  return input === 'OFFICIALS' ? 'OFFICIALS' : 'ALL';
}

export type MessageCheck = { ok: true; body: string } | { ok: false; error: Words };

/** Tidy and screen a message before it is stored. */
export function checkMessage(raw: unknown): MessageCheck {
  const body = typeof raw === 'string' ? raw.replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim() : '';
  if (!body) return { ok: false, error: { en: 'Write a message first.', sw: 'Andika ujumbe kwanza.' } };
  if (body.length > MESSAGE_MAX_CHARS) {
    return { ok: false, error: { en: `Keep it under ${MESSAGE_MAX_CHARS} letters.`, sw: `Usizidi herufi ${MESSAGE_MAX_CHARS}.` } };
  }
  if (!moderateText(body).allowed) {
    return { ok: false, error: { en: 'This message cannot be sent. Please use respectful words.', sw: 'Ujumbe huu hauwezi kutumwa. Tafadhali tumia maneno ya heshima.' } };
  }
  return { ok: true, body };
}

export interface MessageViewer {
  membershipId: string;
  official: boolean;
}

/** Who may read a message. Decided on the server for every message sent to a browser. */
export function canSeeMessage(m: { channel: MessageChannel; threadMemberId?: string | null }, viewer: MessageViewer): boolean {
  if (m.channel === 'ALL') return true;
  return viewer.official || m.threadMemberId === viewer.membershipId;
}

export type ThreadCheck = { ok: true; threadMemberId: string | null } | { ok: false; error: Words };

/**
 * Which thread a new message belongs to. A member always writes in their own
 * thread; an official must say whose question they are answering.
 */
export function threadForNewMessage(channel: MessageChannel, sender: MessageViewer, replyToMemberId?: string | null): ThreadCheck {
  if (channel === 'ALL') return { ok: true, threadMemberId: null };
  if (!sender.official) return { ok: true, threadMemberId: sender.membershipId };
  const target = (replyToMemberId ?? '').trim();
  if (!target) return { ok: false, error: { en: 'Choose whose question you are answering.', sw: 'Chagua unajibu swali la nani.' } };
  return { ok: true, threadMemberId: target };
}

export function sendingTooFast(sentInLastMinute: number): boolean {
  return sentInLastMinute >= MESSAGES_PER_MINUTE;
}

export interface ThreadSummary {
  memberId: string;
  count: number;
  lastAt: string;
  lastBody: string;
  /** True when the last word is the member's — the officials have not answered yet. */
  waiting: boolean;
}

/** For officials: one line per member who has written to them, unanswered first, then newest. */
export function summariseThreads(
  messages: readonly { threadMemberId?: string | null; senderMembershipId: string; body: string; createdAt: string }[],
): ThreadSummary[] {
  const by = new Map<string, ThreadSummary>();
  for (const m of [...messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    if (!m.threadMemberId) continue;
    const t = by.get(m.threadMemberId) ?? { memberId: m.threadMemberId, count: 0, lastAt: '', lastBody: '', waiting: false };
    t.count += 1;
    t.lastAt = m.createdAt;
    t.lastBody = m.body.length > 80 ? `${m.body.slice(0, 79)}…` : m.body;
    t.waiting = m.senderMembershipId === m.threadMemberId;
    by.set(m.threadMemberId, t);
  }
  return [...by.values()].sort((a, b) => Number(b.waiting) - Number(a.waiting) || b.lastAt.localeCompare(a.lastAt));
}
