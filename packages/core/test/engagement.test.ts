import { describe, expect, it } from 'vitest';
import {
  countdownTone, daysLeft, engagementDay, sanitizeEngagement, shareLink, shareMessage,
  smsShareUrl, summariseEngagement, trialDaysLeft, whatsappShareUrl,
} from '../src/engagement';

describe('engagement counts carry no personal data', () => {
  it('accepts only known events with a safe key', () => {
    expect(sanitizeEngagement({ event: 'view', key: 'p1-minutes' })).toEqual({ event: 'view', key: 'p1-minutes' });
    expect(sanitizeEngagement({ event: 'view', key: 'p1-minutes', userId: 'u1', phone: '+2547' })).toEqual({ event: 'view', key: 'p1-minutes' });
    expect(sanitizeEngagement({ event: 'hack', key: 'p1-minutes' })).toBeNull();
    expect(sanitizeEngagement({ event: 'view', key: '+254700000001' })).toBeNull();
    expect(sanitizeEngagement({ event: 'view', key: 'a'.repeat(49) })).toBeNull();
    expect(sanitizeEngagement({ event: 'view', key: 'Has Space' })).toBeNull();
    expect(sanitizeEngagement(null)).toBeNull();
    expect(sanitizeEngagement('view')).toBeNull();
  });

  it('buckets by UTC day and rolls up per key', () => {
    expect(engagementDay(new Date('2026-11-20T23:59:59Z'))).toBe('2026-11-20');
    const lines = summariseEngagement([
      { day: '2026-11-19', event: 'view', key: 'p1-minutes', count: 5 },
      { day: '2026-11-20', event: 'view', key: 'p1-minutes', count: 7 },
      { day: '2026-11-20', event: 'open', key: 'p1-minutes', count: 3 },
      { day: '2026-11-20', event: 'cta', key: 'p1-minutes', count: 2 },
      { day: '2026-11-20', event: 'share', key: 'share-whatsapp', count: 4 },
      { day: '2026-11-20', event: 'tab', key: 'tab-books', count: 9 },
    ]);
    expect(lines[0]).toEqual({ key: 'p1-minutes', views: 12, opens: 3, taps: 2, shares: 0 });
    expect(lines.find((l) => l.key === 'share-whatsapp')?.shares).toBe(4);
    expect(lines.find((l) => l.key === 'tab-books')?.taps).toBe(9);
  });
});

describe('sharing', () => {
  it('builds a clean link that says only where the visit came from', () => {
    expect(shareLink('https://stawi.fly.dev/dashboard?group=g1#x', 'whatsapp')).toBe('https://stawi.fly.dev/dashboard/?via=whatsapp');
    expect(shareLink('https://stawi.fly.dev/', 'sms')).toBe('https://stawi.fly.dev/?via=sms');
  });

  it('writes the message in English or Kiswahili and encodes it for WhatsApp and SMS', () => {
    const msg = shareMessage('sw', 'https://stawi.fly.dev/?via=whatsapp');
    expect(msg).toContain('Kikundi chetu');
    expect(msg.endsWith('https://stawi.fly.dev/?via=whatsapp')).toBe(true);
    expect(whatsappShareUrl('a b&c')).toBe('https://wa.me/?text=a%20b%26c');
    expect(smsShareUrl('a b')).toBe('sms:?&body=a%20b');
  });
});

describe('countdowns', () => {
  const now = new Date('2026-11-20T12:00:00Z');
  it('counts whole days left, never below zero', () => {
    expect(daysLeft(new Date('2026-11-21T12:00:00Z'), now)).toBe(1);
    expect(daysLeft(new Date('2026-11-20T13:00:00Z'), now)).toBe(1);
    expect(daysLeft(new Date('2026-11-19T12:00:00Z'), now)).toBe(0);
    expect(daysLeft(null, now)).toBeNull();
  });

  it('works out free-month days left', () => {
    expect(trialDaysLeft(new Date('2026-11-10T12:00:00Z'), 30, now)).toBe(20);
    expect(trialDaysLeft(new Date('2026-10-01T12:00:00Z'), 30, now)).toBe(0);
    expect(trialDaysLeft(null, 30, now)).toBeNull();
  });

  it('grows more urgent as the days run out', () => {
    expect(countdownTone(null)).toBe('calm');
    expect(countdownTone(20)).toBe('calm');
    expect(countdownTone(7)).toBe('soon');
    expect(countdownTone(3)).toBe('last');
    expect(countdownTone(0)).toBe('ended');
  });
});
