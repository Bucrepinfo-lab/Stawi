import { describe, expect, it } from 'vitest';
import { parsePolished, proposalNumbers, proposalProblem, proposalSections, type ProposalInput } from '../src/funding-proposal';

/** Owner 26/11/26: "write for me the proposal" from the group's own records. */
const input: ProposalInput = {
  group: { name: 'Umoja Chama', registeredNumber: 'SHG/123', country: 'KE', venue: 'Chief’s camp', meetingDays: ['Saturday'], mission: 'Grow together', vision: null, motto: null },
  members: { count: 10, officials: [{ post: 'Chairperson', name: 'Ann Njeri' }, { post: 'Secretary', name: 'Grace W' }, { post: 'Treasurer', name: 'Peter O' }] },
  savings: { totalCents: 7_000_000, contributors: 10, firstDate: '05/09/26', lastDate: '26/11/26', months: 3 },
  business: { title: 'Liquid soap & detergent', industry: 'manufacturing', description: 'Low input cost.', startupCents: 30_000_000, marginPct: 35, risk: 'Low' },
  ask: { ownContributionCents: 5_000_000, lender: 'Uwezo Fund', purpose: 'Start a soap business that gives every member an income.', months: 12, annualRatePct: 14, expectedMonthlySalesCents: null, security: '' },
  preparedBy: { name: 'Ann Njeri', post: 'Chairperson' },
  date: '26/11/26',
};

describe('funding proposal', () => {
  it('numbers: own share, loan, budget adds up, repayment', () => {
    const n = proposalNumbers(input);
    expect(n.loanCents).toBe(25_000_000);
    expect(n.ownPct).toBe(17);
    expect(n.budget.reduce((s, b) => s + b.cents, 0)).toBe(30_000_000);
    expect(n.salesEstimated).toBe(true);
    expect(n.instalmentCents).toBeGreaterThan(2_000_000);
    expect(n.totalRepayCents).toBeGreaterThan(25_000_000);
    expect(n.risks.length).toBeGreaterThanOrEqual(5);
  });
  it('refuses impossible asks', () => {
    expect(proposalProblem(input)).toBeNull();
    expect(proposalProblem({ ...input, ask: { ...input.ask, ownContributionCents: 8_000_000 } })).toMatch(/cannot put in more/);
    expect(proposalProblem({ ...input, business: { ...input.business, startupCents: 4_000_000 }, ask: { ...input.ask, ownContributionCents: 5_000_000 } })).toMatch(/already cover/);
    expect(proposalProblem({ ...input, ask: { ...input.ask, purpose: 'x' } })).toMatch(/achieve/);
  });
  it('sections carry the group facts', () => {
    const s = proposalSections(input);
    expect(s.map((x) => x.heading)).toEqual(['1. Summary', '2. About the group', '3. Savings record', '4. The business', '5. Budget and funding', '6. Repayment plan', '7. Risks and how we will manage them', '8. Request']);
    const all = s.flatMap((x) => x.body).join(' ');
    expect(all).toContain('KES 70,000');
    expect(all).toContain('KES 250,000 from Uwezo Fund');
    expect(all).toContain('registration number SHG/123');
    expect(all).toContain('Ann Njeri (Chairperson)');
  });
  it('AI polish is kept only if every heading and figure survives', () => {
    const s = proposalSections(input);
    const same = s.map((x) => [x.heading, ...x.body].join('\n')).join('\n\n');
    expect(parsePolished(same, s)).not.toBeNull();
    expect(parsePolished(same.replace('KES 70,000', 'KES 75,000'), s)).toBeNull();
    expect(parsePolished(same.replace('6. Repayment plan', 'Repayment'), s)).toBeNull();
  });
});
