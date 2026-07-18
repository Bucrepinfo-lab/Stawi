import { describe, it, expect } from 'vitest';
import {
  FAILURE_GAPS,
  STAGE_ORDER,
  assessGraduation,
  type GraduationInput,
} from '../src/graduation';

const base: GraduationInput = {
  memberCount: 25,
  coreCapitalCents: 2_000_000,
  totalAssetsCents: 20_000_000,
  liquidAssetsCents: 3_000_000,
  totalDepositsCents: 15_000_000,
  nonPerformingLoanCents: 200_000,
  grossLoanCents: 10_000_000,
  auditedFinancialYears: 1,
  consecutiveProfitYears: 1,
  governance: {
    electedBoard: true,
    dualApprovalEnabled: true,
    auditTrailEnabled: true,
    annualAuditDone: false,
  },
  registeredWithRegulator: true,
};

const bankGrade: GraduationInput = {
  memberCount: 20_000,
  coreCapitalCents: 150_000_000,
  totalAssetsCents: 1_000_000_000,
  liquidAssetsCents: 200_000_000,
  totalDepositsCents: 800_000_000,
  nonPerformingLoanCents: 20_000_000,
  grossLoanCents: 600_000_000,
  auditedFinancialYears: 6,
  consecutiveProfitYears: 4,
  governance: {
    electedBoard: true,
    dualApprovalEnabled: true,
    auditTrailEnabled: true,
    annualAuditDone: true,
  },
  registeredWithRegulator: true,
};

describe('failure gaps (the MVP thesis)', () => {
  it('consolidates all eight research-backed failure reasons', () => {
    expect(FAILURE_GAPS.map((g) => g.id)).toEqual([
      'governance',
      'liquidity',
      'capital',
      'records',
      'credit-risk',
      'cost-base',
      'education',
      'compliance',
    ]);
  });

  it('pairs every gap with a Stawi solution', () => {
    for (const g of FAILURE_GAPS) {
      expect(g.why.length).toBeGreaterThan(10);
      expect(g.stawiSolution.length).toBeGreaterThan(10);
    }
  });
});

describe('assessGraduation', () => {
  it('orders the ladder chama → listed', () => {
    expect(STAGE_ORDER[0]).toBe('CHAMA');
    expect(STAGE_ORDER.at(-1)).toBe('LISTED');
    expect(STAGE_ORDER).toHaveLength(7);
  });

  it('places a healthy small registered society at SACCO, aiming for DT-SACCO', () => {
    const a = assessGraduation(base);
    expect(a.currentStage).toBe('SACCO');
    expect(a.nextStage).toBe('DEPOSIT_TAKING_SACCO');
    expect(a.checks.length).toBeGreaterThan(0);
  });

  it('keeps an unregistered group at CHAMA', () => {
    const a = assessGraduation({
      ...base,
      registeredWithRegulator: false,
      governance: { ...base.governance, electedBoard: false },
    });
    expect(a.currentStage).toBe('CHAMA');
    expect(a.nextStage).toBe('SELF_HELP_GROUP');
  });

  it('computes prudential ratios', () => {
    const a = assessGraduation(base);
    expect(a.ratios.capitalAdequacyPct).toBe(10);
    expect(a.ratios.liquidityPct).toBe(20);
    expect(a.ratios.nplPct).toBe(2);
  });

  it('readiness rises as gaps close', () => {
    const before = assessGraduation({ ...base, memberCount: 25 });
    const after = assessGraduation({
      ...base,
      memberCount: 600,
      auditedFinancialYears: 2,
    });
    expect(after.readinessPct).toBeGreaterThan(before.readinessPct);
  });

  it('a bank-grade institution reaches COMMERCIAL_BANK and eyes listing', () => {
    const a = assessGraduation(bankGrade);
    expect(a.currentStage).toBe('COMMERCIAL_BANK');
    expect(a.nextStage).toBe('LISTED');
    // 3 of 4 listing checks met — only the 25,000-member base is missing.
    expect(a.readinessPct).toBe(75);
  });

  it('a fully listed-grade institution tops out the ladder', () => {
    const a = assessGraduation({ ...bankGrade, memberCount: 30_000 });
    expect(a.currentStage).toBe('LISTED');
    expect(a.nextStage).toBeNull();
    expect(a.readinessPct).toBe(100);
  });
});
