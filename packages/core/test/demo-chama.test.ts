import { describe, expect, it } from 'vitest';
import { demoMemberName, isDemoGroupId } from '../src/demo-chama';

/** Owner 26/11/26: one demo chama for all testers; nobody's number is shown. */
describe('demo chama', () => {
  it('names a tester by the last three digits only', () => {
    expect(demoMemberName('+254712345678')).toBe('Tester 678');
    expect(demoMemberName(null)).toBe('Tester');
    expect(demoMemberName('+254712345678')).not.toContain('712');
  });

  it('accepts only a real group id', () => {
    expect(isDemoGroupId('clx9k2m7p0000abcd1234')).toBe(true);
    expect(isDemoGroupId('')).toBe(false);
    expect(isDemoGroupId(undefined)).toBe(false);
    expect(isDemoGroupId("x' OR 1=1")).toBe(false);
  });
});
