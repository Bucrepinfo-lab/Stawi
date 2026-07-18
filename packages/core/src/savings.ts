/**
 * Savings engine — Pillar 4 (Stawi SACCO+, Savings & Credit Services).
 *
 * Digital-first savings: account opening for any entity type (registered
 * groups first), deposits/withdrawals, interest on deposits, dividends on
 * share capital, low-fee remittances, and the liquidity guard-rail that
 * failed SACCOs ignored (SASRA's 15% liquid-assets floor).
 *
 * All money is integer minor units (cents). Pure functions only.
 */

/** Who can open a Stawi SACCO+ account — toggleable at onboarding. */
export type SaccoEntityType =
  | 'REGISTERED_GROUP'
  | 'BUSINESS'
  | 'INDIVIDUAL'
  | 'INSTITUTION';

export interface EntityOnboarding {
  type: SaccoEntityType;
  label: string;
  /** Registered Stawi groups are fast-tracked: their KYC already lives in Pillar 1. */
  fastTrack: boolean;
  requiredDocs: string[];
  /** Minimum opening deposit in cents (base currency minor units). */
  minOpeningDepositCents: number;
  /** Minimum share capital to hold voting/dividend rights. */
  minShareCapitalCents: number;
}

export const ENTITY_ONBOARDING: Record<SaccoEntityType, EntityOnboarding> = {
  REGISTERED_GROUP: {
    type: 'REGISTERED_GROUP',
    label: 'Registered group / chama',
    fastTrack: true,
    requiredDocs: [
      'Group registration certificate (auto-filled from Formalization wizard)',
      'Officials list — chairman, secretary, treasurer (auto-filled)',
      'Group resolution/minute to open the account',
    ],
    minOpeningDepositCents: 100_000, // 1,000 units
    minShareCapitalCents: 500_000,
  },
  BUSINESS: {
    type: 'BUSINESS',
    label: 'Business',
    fastTrack: false,
    requiredDocs: [
      'Business registration / incorporation certificate',
      'Tax PIN of the business',
      'ID of at least one director/owner',
    ],
    minOpeningDepositCents: 100_000,
    minShareCapitalCents: 500_000,
  },
  INDIVIDUAL: {
    type: 'INDIVIDUAL',
    label: 'Individual',
    fastTrack: false,
    requiredDocs: ['National ID or passport', 'Phone number (mobile-money verified)'],
    minOpeningDepositCents: 20_000, // 200 units — low barrier to enrol
    minShareCapitalCents: 100_000,
  },
  INSTITUTION: {
    type: 'INSTITUTION',
    label: 'Institution / union / organization',
    fastTrack: false,
    requiredDocs: [
      'Certificate of registration (society, union, NGO, church…)',
      'Constitution or governing document',
      'Board/committee resolution to open the account',
      'Signatories list with IDs',
    ],
    minOpeningDepositCents: 500_000,
    minShareCapitalCents: 1_000_000,
  },
};

export interface SaccoAccountState {
  /** Withdrawable savings balance. */
  balanceCents: number;
  /** Non-withdrawable share capital (earns dividends, absorbs losses). */
  shareCapitalCents: number;
  /** Portion of balance pledged against running loans (locked). */
  pledgedCents: number;
}

export type SaccoTxnType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'SHARE_PURCHASE'
  | 'INTEREST'
  | 'DIVIDEND'
  | 'REMITTANCE_OUT'
  | 'REMITTANCE_IN';

export interface SaccoTxnResult {
  ok: boolean;
  reason?: string;
  next: SaccoAccountState;
}

/** Available (unlocked) balance a member can actually withdraw or remit. */
export function availableCents(s: SaccoAccountState): number {
  return Math.max(0, s.balanceCents - s.pledgedCents);
}

/**
 * Apply a transaction to an account. Deposits/interest/remittance-in credit
 * the balance; withdrawals/remittance-out debit only the unpledged portion;
 * share purchases move balance → share capital; dividends credit balance.
 */
export function applySaccoTxn(
  s: SaccoAccountState,
  type: SaccoTxnType,
  amountCents: number,
): SaccoTxnResult {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return { ok: false, reason: 'Amount must be a positive whole number of cents.', next: s };
  }
  switch (type) {
    case 'DEPOSIT':
    case 'INTEREST':
    case 'DIVIDEND':
    case 'REMITTANCE_IN':
      return { ok: true, next: { ...s, balanceCents: s.balanceCents + amountCents } };
    case 'WITHDRAWAL':
    case 'REMITTANCE_OUT': {
      if (amountCents > availableCents(s)) {
        return {
          ok: false,
          reason: `Only ${availableCents(s)} cents are unpledged and available.`,
          next: s,
        };
      }
      return { ok: true, next: { ...s, balanceCents: s.balanceCents - amountCents } };
    }
    case 'SHARE_PURCHASE': {
      if (amountCents > availableCents(s)) {
        return { ok: false, reason: 'Insufficient available balance to buy shares.', next: s };
      }
      return {
        ok: true,
        next: {
          ...s,
          balanceCents: s.balanceCents - amountCents,
          shareCapitalCents: s.shareCapitalCents + amountCents,
        },
      };
    }
  }
}

/** Default member-facing return rates (annual %). Digital-first cost base funds them. */
export const DEPOSIT_INTEREST_ANNUAL_PCT = 10; // interest on deposits
export const SHARE_DIVIDEND_ANNUAL_PCT = 13; // dividend on share capital

/** One month of interest on a deposit balance, rounded to the nearest cent. */
export function monthlyDepositInterestCents(
  balanceCents: number,
  annualRatePct: number = DEPOSIT_INTEREST_ANNUAL_PCT,
): number {
  if (balanceCents <= 0 || annualRatePct <= 0) return 0;
  return Math.round((balanceCents * annualRatePct) / 100 / 12);
}

/** Annual dividend on share capital, rounded to the nearest cent. */
export function annualDividendCents(
  shareCapitalCents: number,
  ratePct: number = SHARE_DIVIDEND_ANNUAL_PCT,
): number {
  if (shareCapitalCents <= 0 || ratePct <= 0) return 0;
  return Math.round((shareCapitalCents * ratePct) / 100);
}

/**
 * Remittance fee — flat digital tiers, deliberately under mobile-money and
 * bank rates (no branches, no paper: the savings are passed to members).
 */
export function remittanceFeeCents(amountCents: number): number {
  if (amountCents <= 0) return 0;
  if (amountCents <= 100_000) return 1_000; // ≤1,000 units → 10
  if (amountCents <= 1_000_000) return 5_000; // ≤10,000 units → 50
  return Math.min(20_000, Math.round(amountCents * 0.004)); // 0.4%, capped at 200
}

/** SASRA-style liquidity floor: liquid assets must cover ≥15% of deposits. */
export const MIN_LIQUIDITY_RATIO_PCT = 15;

export interface LiquidityStatus {
  ratioPct: number;
  healthy: boolean;
  /** Cents of liquid assets needed to get back above the floor (0 if healthy). */
  shortfallCents: number;
}

export function liquidityStatus(
  liquidAssetsCents: number,
  totalDepositsCents: number,
): LiquidityStatus {
  if (totalDepositsCents <= 0) {
    return { ratioPct: 100, healthy: true, shortfallCents: 0 };
  }
  const ratioPct =
    Math.round((liquidAssetsCents / totalDepositsCents) * 10_000) / 100;
  const floorCents = Math.ceil((totalDepositsCents * MIN_LIQUIDITY_RATIO_PCT) / 100);
  return {
    ratioPct,
    healthy: ratioPct >= MIN_LIQUIDITY_RATIO_PCT,
    shortfallCents: Math.max(0, floorCents - liquidAssetsCents),
  };
}
