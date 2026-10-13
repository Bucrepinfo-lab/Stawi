import { describe, it, expect } from 'vitest';
import {
  memberStatementTemplate,
  memberStatementPrompt,
  parseMemberStatementExplanation,
  explainMemberStatement,
  MEMBER_STATEMENT_MAX_CHARS,
  type MemberStatementExplanationInput,
} from '../src/member-statement-explainer';

const input: MemberStatementExplanationInput = {
  groupName: 'Umoja Women Group',
  periodLabel: 'October 2026',
  currency: 'KES',
  meetingsHeld: 4,
  member: {
    memberId: 'm1',
    name: 'Amina',
    meetingsPresent: 3,
    meetingsApology: 1,
    meetingsAbsent: 0,
    attendancePct: 75,
    contributedCents: 500000,
    finesCents: 10000,
  },
  finance: {
    openingCents: 1000000,
    contributionsCents: 2000000,
    finesCents: 50000,
    otherInCents: 0,
    payoutsCents: 0,
    otherOutCents: 0,
    totalInCents: 2050000,
    totalOutCents: 0,
    closingCents: 3050000,
  },
};

describe('memberStatementTemplate', () => {
  it('states only the member own figures, advice-free', () => {
    const t = memberStatementTemplate(input);
    expect(t).toContain('Amina');
    expect(t).toContain('KES 5,000'); // contributed
    expect(t).toContain('KES 100'); // fines
    expect(t).toContain('3 of 4 meeting(s)');
    expect(t).toContain('75% attendance');
    expect(t).toContain('KES 30,500'); // group closing
    // never advice
    expect(t.toLowerCase()).not.toMatch(/you should|recommend|invest|borrow more/);
  });

  it('omits the fines line when there are no fines', () => {
    const t = memberStatementTemplate({ ...input, member: { ...input.member, finesCents: 0 } });
    expect(t).not.toContain('Fines recorded');
  });

  it('respects the character cap', () => {
    const t = memberStatementTemplate({ ...input, groupName: 'G'.repeat(2000) });
    expect(t.length).toBeLessThanOrEqual(MEMBER_STATEMENT_MAX_CHARS);
  });
});

describe('memberStatementPrompt', () => {
  it('forbids advice and invention, carries figures, seeds the template', () => {
    const p = memberStatementPrompt(input);
    expect(p).toContain('NOT financial advice');
    expect(p).toContain('Never invent or project');
    expect(p).toContain('Umoja Women Group');
    expect(p).toContain(memberStatementTemplate(input));
  });
});

describe('parseMemberStatementExplanation', () => {
  it('cleans a wrapped line', () => {
    expect(parseMemberStatementExplanation('  "Your October summary looks good."  ')).toBe(
      'Your October summary looks good.',
    );
  });
  it('returns null on empty', () => {
    expect(parseMemberStatementExplanation('')).toBeNull();
    expect(parseMemberStatementExplanation('   ')).toBeNull();
  });
});

describe('explainMemberStatement', () => {
  it('returns the deterministic template when no generator is given', async () => {
    const out = await explainMemberStatement(input);
    expect(out.usedModel).toBe(false);
    expect(out.text).toBe(memberStatementTemplate(input));
  });

  it('uses the model text when the generator returns a clean rephrase', async () => {
    const out = await explainMemberStatement(input, async () => 'Hello Amina, your October contributions are recorded.');
    expect(out.usedModel).toBe(true);
    expect(out.text).toBe('Hello Amina, your October contributions are recorded.');
  });

  it('falls back to the template when the generator returns null', async () => {
    const out = await explainMemberStatement(input, async () => null);
    expect(out.usedModel).toBe(false);
    expect(out.text).toBe(memberStatementTemplate(input));
  });

  it('falls back to the template when the generator throws', async () => {
    const out = await explainMemberStatement(input, async () => {
      throw new Error('network down');
    });
    expect(out.usedModel).toBe(false);
    expect(out.text).toBe(memberStatementTemplate(input));
  });
});
