import { describe, it, expect } from 'vitest';
import {
  ENTITY_ONBOARDING,
  applySaccoTxn,
  availableCents,
  monthlyDepositInterestCents,
  annualDividendCents,
  remittanceFeeCents,
  liquidityStatus,
  MIN_LIQUIDITY_RATIO_PCT,
  type SaccoAccountState,
} from '../src/savings';

const acct: SaccoAccountState = {
  balanceCents: 1_000_000,
  shareCapitalCents: 500_000,
  pledgedCents: 300_000,
};

describe('entity onboarding', () => {
  it('covers all four entity types', () => {
    expect(Object.keys(ENTITY_ONBOARDING)).toEqual([
      'REGISTERED_GROUP',
      'BUSINESS',
      'INDIVIDUAL',
      'INSTITUTION',
    ]);
  });

  it('fast-tracks registered groups only', () => {
    expect(ENTITY_ONBOARDING.REGISTERED_GROUP.fastTrack).toBe(true);
    expect(ENTITY_ONBOARDING.INDIVIDUAL.fastTrack).toBe(false);
  });

  it('individuals have the lowest opening barrier', () => {
    const min = Math.min(
      ...Object.values(ENTITY_ONBOARDING).map((e) => e.minOpeningDepositCents),
    );
    expect(ENTITY_ONBOARDING.INDIVIDUAL.minOpeningDepositCents).toBe(min);
  });
});

describe('applySaccoTxn', () => {
  it('credits deposits', () => {
    const r = applySaccoTxn(acct, 'DEPOSIT', 250_000);
    expect(r.ok).toBe(true);
    expect(r.next.balanceCents).toBe(1_250_000);
  });

  it('blocks withdrawal beyond unpledged balance', () => {
    expect(availableCents(acct)).toBe(700_000);
    const r = applySaccoTxn(acct, 'WITHDRAWAL', 800_000);
    expect(r.ok).toBe(false);
    expect(r.next).toEqual(acct);
  });

  it('allows withdrawal within available balance', () => {
    const r = applySaccoTxn(acct, 'WITHDRAWAL', 700_000);
    expect(r.ok).toBe(true);
    expect(r.next.balanceCents).toBe(300_000);
  });

  it('moves balance into share capital on share purchase', () => {
    const r = applySaccoTxn(acct, 'SHARE_PURCHASE', 200_000);
    expect(r.ok).toBe(true);
    expect(r.next.balanceCents).toBe(800_000);
    expect(r.next.shareCapitalCents).toBe(700_000);
  });

  it('rejects non-positive and fractional amounts', () => {
    expect(applySaccoTxn(acct, 'DEPOSIT', 0).ok).toBe(false);
    expect(applySaccoTxn(acct, 'DEPOSIT', -5).ok).toBe(false);
    expect(applySaccoTxn(acct, 'DEPOSIT', 10.5).ok).toBe(false);
  });
});

describe('returns to members', () => {
  it('accrues 10% p.a. monthly interest on deposits', () => {
    // 1,000,000 cents at 10%/yr = 100,000/yr ≈ 8,333/month
    expect(monthlyDepositInterestCents(1_000_000)).toBe(8_333);
  });

  it('pays 13% annual dividend on share capital', () => {
    expect(annualDividendCents(500_000)).toBe(65_000);
  });

  it('returns 0 for empty balances', () => {
    expect(monthlyDepositInterestCents(0)).toBe(0);
    expect(annualDividendCents(0)).toBe(0);
  });
});

describe('remittanceFeeCents', () => {
  it('is tiered and capped', () => {
    expect(remittanceFeeCents(50_000)).toBe(1_000);
    expect(remittanceFeeCents(500_000)).toBe(5_000);
    expect(remittanceFeeCents(2_000_000)).toBe(8_000); // 0.4%
    expect(remittanceFeeCents(100_000_000)).toBe(20_000); // cap
  });
});

describe('liquidityStatus', () => {
  it('flags a breach below the 15% floor with the shortfall', () => {
    const s = liquidityStatus(1_000_000, 10_000_000);
    expect(s.ratioPct).toBe(10);
    expect(s.healthy).toBe(false);
    expect(s.shortfallCents).toBe(500_000);
  });

  it('passes at or above the floor', () => {
    const s = liquidityStatus(1_500_000, 10_000_000);
    expect(s.ratioPct).toBe(MIN_LIQUIDITY_RATIO_PCT);
    expect(s.healthy).toBe(true);
    expect(s.shortfallCents).toBe(0);
  });
});
