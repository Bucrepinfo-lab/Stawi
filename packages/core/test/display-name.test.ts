import { describe, expect, it } from 'vitest';
import { cleanDisplayName, founderName, isPlaceholderName } from '../src/display-name';

describe('display name (owner 26/11/26)', () => {
  it('tidies and accepts a real name', () => {
    expect(cleanDisplayName('  Fredrick   Gathii ')).toEqual({ ok: true, name: 'Fredrick Gathii' });
    expect(cleanDisplayName('Wanjiru wa Kamau').ok).toBe(true);
    expect(cleanDisplayName("Ng'ang'a").ok).toBe(true);
  });
  it('refuses empty, too long, numbers-only and links', () => {
    expect(cleanDisplayName('A').ok).toBe(false);
    expect(cleanDisplayName('x'.repeat(61)).ok).toBe(false);
    expect(cleanDisplayName('0712345678').ok).toBe(false);
    expect(cleanDisplayName('Visit www.example.com').ok).toBe(false);
    expect(cleanDisplayName('<b>Me</b>').ok).toBe(false);
  });
  it('starts a new group with the name used elsewhere', () => {
    expect(isPlaceholderName('Group founder')).toBe(true);
    expect(founderName(['Group founder', 'Fredrick Gathii'])).toBe('Fredrick Gathii');
    expect(founderName([null, 'Group founder'])).toBe('Group founder');
  });
});
