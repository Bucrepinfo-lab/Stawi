import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { toSmsRecipient } from '../src/phone';

/**
 * 17/11/26: the first live sign-in failed because Supabase passes the phone as
 * bare digits ("2547…") and Africa's Talking only accepts "+2547…".
 */
describe('toSmsRecipient (Africa\'s Talking recipient form)', () => {
  it('adds the + to the bare international digits Supabase sends', () => {
    expect(toSmsRecipient('254712345678')).toBe('+254712345678');
  });
  it('keeps a number that already has +', () => {
    expect(toSmsRecipient('+254712345678')).toBe('+254712345678');
    expect(toSmsRecipient('+256772123456')).toBe('+256772123456');
  });
  it('turns a local Kenyan number into +254', () => {
    expect(toSmsRecipient('0712 345 678')).toBe('+254712345678');
  });
  it('keeps another country as that country (never re-prefixed with 254)', () => {
    expect(toSmsRecipient('256772123456')).toBe('+256772123456');
    expect(toSmsRecipient('00255712345678')).toBe('+255712345678');
  });
  it('rejects things that are not phone numbers', () => {
    expect(toSmsRecipient('')).toBeNull();
    expect(toSmsRecipient('abc')).toBeNull();
    expect(toSmsRecipient('+12')).toBeNull();
  });
});

describe('every Africa\'s Talking sender normalises the recipient', () => {
  const web = join(__dirname, '../../../apps/web/lib');
  for (const f of ['sms.ts', 'notify.ts']) {
    it(`${f} passes numbers through toSmsRecipient`, () => {
      const src = readFileSync(join(web, f), 'utf8');
      expect(src).toContain('toSmsRecipient(');
    });
  }
});
