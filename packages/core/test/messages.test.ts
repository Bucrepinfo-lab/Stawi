import { describe, expect, it } from 'vitest';
import {
  MESSAGES_PER_MINUTE, MESSAGE_MAX_CHARS, canSeeMessage, checkMessage, messageChannel, sendingTooFast,
  summariseThreads, threadForNewMessage,
} from '../src/messages';

const member = { membershipId: 'm-david', official: false };
const other = { membershipId: 'm-brian', official: false };
const chair = { membershipId: 'm-amina', official: true };

describe('a message is tidied and screened', () => {
  it('trims, keeps line breaks sensible and refuses empty or too long', () => {
    expect(checkMessage('  Habari   zenu \r\n\r\n\r\n\r\n Tukutane kesho  ')).toEqual({ ok: true, body: 'Habari zenu \n\n Tukutane kesho' });
    expect(checkMessage('   ').ok).toBe(false);
    expect(checkMessage(null).ok).toBe(false);
    expect(checkMessage('a'.repeat(MESSAGE_MAX_CHARS)).ok).toBe(true);
    expect(checkMessage('a'.repeat(MESSAGE_MAX_CHARS + 1)).ok).toBe(false);
  });

  it('only knows two places to write', () => {
    expect(messageChannel('OFFICIALS')).toBe('OFFICIALS');
    expect(messageChannel('ALL')).toBe('ALL');
    expect(messageChannel('anything')).toBe('ALL');
    expect(messageChannel(undefined)).toBe('ALL');
  });
});

describe('who sees what', () => {
  it('the group chat is for every member', () => {
    for (const v of [member, other, chair]) expect(canSeeMessage({ channel: 'ALL' }, v)).toBe(true);
  });

  it('a question to the officials is seen by the asker and the officials only', () => {
    const q = { channel: 'OFFICIALS' as const, threadMemberId: 'm-david' };
    expect(canSeeMessage(q, member)).toBe(true);
    expect(canSeeMessage(q, chair)).toBe(true);
    expect(canSeeMessage(q, other)).toBe(false);
    expect(canSeeMessage({ channel: 'OFFICIALS', threadMemberId: null }, other)).toBe(false);
  });

  it('a member writes in their own thread; an official must choose whose', () => {
    expect(threadForNewMessage('ALL', member)).toEqual({ ok: true, threadMemberId: null });
    expect(threadForNewMessage('OFFICIALS', member, 'm-brian')).toEqual({ ok: true, threadMemberId: 'm-david' });
    expect(threadForNewMessage('OFFICIALS', chair, 'm-david')).toEqual({ ok: true, threadMemberId: 'm-david' });
    expect(threadForNewMessage('OFFICIALS', chair).ok).toBe(false);
  });
});

describe('guards and lists', () => {
  it('slows a flood', () => {
    expect(sendingTooFast(MESSAGES_PER_MINUTE - 1)).toBe(false);
    expect(sendingTooFast(MESSAGES_PER_MINUTE)).toBe(true);
  });

  it('officials see unanswered questions first', () => {
    const t = summariseThreads([
      { threadMemberId: 'm-david', senderMembershipId: 'm-david', body: 'When is the next meeting?', createdAt: '2026-11-20T08:00:00Z' },
      { threadMemberId: 'm-david', senderMembershipId: 'm-amina', body: 'Friday at four.', createdAt: '2026-11-20T08:05:00Z' },
      { threadMemberId: 'm-brian', senderMembershipId: 'm-brian', body: 'x'.repeat(120), createdAt: '2026-11-20T07:00:00Z' },
      { threadMemberId: null, senderMembershipId: 'm-brian', body: 'group chat', createdAt: '2026-11-20T09:00:00Z' },
    ]);
    expect(t.map((x) => [x.memberId, x.count, x.waiting])).toEqual([['m-brian', 1, true], ['m-david', 2, false]]);
    expect(t[0]!.lastBody.length).toBe(80);
    expect(t[1]!.lastBody).toBe('Friday at four.');
  });
});
