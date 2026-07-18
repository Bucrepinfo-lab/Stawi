import { describe, it, expect } from 'vitest';
import { moderateText, assertClean, normalizeForModeration } from '../src/moderation';

describe('moderation', () => {
  it('allows normal group chatter', () => {
    const r = moderateText('Great work team, let us meet on Saturday to plan the harvest.');
    expect(r.allowed).toBe(true);
    expect(r.severity).toBe('none');
  });

  it('blocks incitement to violence', () => {
    const r = moderateText('Let us kill all of them and burn their houses');
    expect(r.allowed).toBe(false);
    expect(r.categories).toContain('incitement');
  });

  it('blocks direct threats', () => {
    const r = moderateText('I will kill you if you come here');
    expect(r.allowed).toBe(false);
    expect(r.categories).toContain('threat');
  });

  it('blocks abusive harassment', () => {
    const r = moderateText('you are worthless and pathetic');
    expect(r.allowed).toBe(false);
    expect(r.categories).toContain('harassment');
  });

  it('defeats leetspeak evasion', () => {
    expect(normalizeForModeration('k1ll y0u')).toBe('kill you');
    const r = moderateText('i will k1ll y0u');
    expect(r.allowed).toBe(false);
  });

  it('flags but allows mild profanity', () => {
    const r = moderateText('this is crap');
    expect(r.allowed).toBe(true);
    expect(r.severity).toBe('low');
    expect(r.categories).toContain('profanity');
  });

  it('assertClean throws on blocked content', () => {
    expect(() => assertClean('I will hurt you')).toThrow();
    expect(() => assertClean('see you at the meeting')).not.toThrow();
  });
});
