import { describe, expect, it } from 'vitest';
import { contributionNotRecorded, contributionRecorded } from '../src/feedback';
import { formatMoney } from '../src/capital';

/** Owner 26/11/26: a clear banner the moment the treasurer records a contribution. */
describe('contribution feedback', () => {
  it('says who, how much, how it was paid and the new total', () => {
    const f = contributionRecorded({ name: 'Grace Wanjiku', amountCents: 200_000, way: 'Cash at the meeting', totalCents: 6_450_000 });
    expect(f.title).toBe('Contribution recorded');
    expect(f.detail).toContain(`KES ${formatMoney(200_000)} from Grace Wanjiku`);
    expect(f.detail).toContain('cash at the meeting');
    expect(f.detail).toContain(`New group total KES ${formatMoney(6_450_000)}`);
  });

  it('never leaves a failure silent', () => {
    expect(contributionNotRecorded('Only the group treasurer can record contributions.').detail).toContain('treasurer');
    expect(contributionNotRecorded(null).detail).toMatch(/Nothing was saved/);
  });
});
