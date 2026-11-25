/**
 * Pillar 1 → Pillar 4 activation bridge.
 *
 * A group already enrolled with Stawi through Pillar 1 (charter, minutes,
 * month-end statements) can opt in to Stawi SACCO+ (Savings & Credit) with one
 * tap. This module turns that captured Pillar-1 record into a ready-to-submit
 * **activation packet**:
 *   1. the group profile + signatories (auto-filled from the charter),
 *   2. each member's saved-up deposits and saving streak (from the reconciled
 *      month-end statements),
 *   3. the **evidence checklist a bank / DT-SACCO asks for** before extending
 *      credit — with each item marked satisfied straight from Pillar 1, and
 *   4. a per-member, pre-qualified loan preview so the group sees the value of
 *      activating before they commit.
 *
 * Nothing here writes or opens an account — it only assembles what Pillar 1
 * already proved. Pure functions; all money in integer minor units (cents).
 */

import type { GroupCharter } from './charter';
import { officials, isOfficial } from './charter';
import type { MonthEndStatement } from './statement';
import { ENTITY_ONBOARDING } from './savings';
import type { SaccoAccountState } from './savings';
import { LOAN_PRODUCTS, scoreEligibility } from './credit';
import type { LoanProductId, EligibilityResult } from './credit';
import { HOUSE_PURPOSES, buildHouseFromFacts, checkPurpose, houseFactsFromStatements, houseRoomName } from './document-house';
import type { HouseDocId } from './document-house';

/** A member's savings history distilled from Pillar-1 capture. */
export interface MemberSavingsProfile {
  memberId: string;
  name: string;
  phone: string;
  idNumber?: string;
  isOfficial: boolean;
  designation: string;
  /** Cumulative captured contributions across all reconciled months. */
  depositsCents: number;
  /** Number of months in which the member contributed at least once. */
  monthsActive: number;
  /** Consecutive most-recent months carrying a contribution. */
  savingStreakMonths: number;
  /** Average attendance across months the member appears in. */
  avgAttendancePct: number;
}

/** One line of the "what a lender wants to see" checklist. */
export interface EvidenceItem {
  id: string;
  /** What a bank / SACCO registrar asks for. */
  label: string;
  satisfied: boolean;
  /** Where in Pillar 1 the proof comes from. */
  source: string;
  detail?: string;
}

/** Pre-qualified loan headroom for a member, per product. */
export interface MemberCreditPreview {
  memberId: string;
  name: string;
  depositsCents: number;
  best: { productId: LoanProductId; result: EligibilityResult } | null;
  byProduct: { productId: LoanProductId; result: EligibilityResult }[];
}

/** The complete, ready-to-submit activation packet. */
export interface SaccoActivationPacket {
  groupId: string;
  displayName: string;
  countryCode: string;
  entityType: 'REGISTERED_GROUP';
  /** Registered Stawi groups are always fast-tracked — KYC lives in Pillar 1. */
  fastTrack: boolean;
  registeredNumber?: string;
  signatories: { memberId: string; name: string; designation: string; phone: string }[];
  members: MemberSavingsProfile[];
  monthsOfHistory: number;
  totalContributionsCents: number;
  /** Group pooled balance from the most recent month-end statement. */
  latestClosingCents: number;
  evidence: EvidenceItem[];
  /** 0–100: share of lender-required evidence already satisfied by Pillar 1. */
  readinessPct: number;
  /** Human-readable list of what is still missing (empty when 100%). */
  missing: string[];
  /** Seed state for the group account when activation is confirmed. */
  openingState: SaccoAccountState;
}

/** Oldest → newest by period (year, then month). */
function chron(statements: MonthEndStatement[]): MonthEndStatement[] {
  return [...statements].sort(
    (a, b) => a.period.year - b.period.year || a.period.month - b.period.month,
  );
}

/**
 * Distil each charter member's savings history from the reconciled statements.
 */
export function memberSavingsProfiles(
  charter: GroupCharter,
  statements: MonthEndStatement[],
): MemberSavingsProfile[] {
  const sorted = chron(statements);
  return charter.members.map((m) => {
    const perMonth = sorted.map((s) => {
      const row = s.members.find((r) => r.memberId === m.id);
      return {
        contributed: Math.max(0, row?.contributedCents ?? 0),
        attendancePct: row?.attendancePct ?? 0,
        present: row ? row.meetingsPresent > 0 || row.attendancePct > 0 : false,
      };
    });
    const depositsCents = perMonth.reduce((a, x) => a + x.contributed, 0);
    const monthsActive = perMonth.filter((x) => x.contributed > 0).length;

    let savingStreakMonths = 0;
    for (let i = perMonth.length - 1; i >= 0; i--) {
      if ((perMonth[i]?.contributed ?? 0) > 0) savingStreakMonths++;
      else break;
    }

    const seen = perMonth.filter((x) => x.attendancePct > 0 || x.present);
    const avgAttendancePct = seen.length
      ? Math.round(seen.reduce((a, x) => a + x.attendancePct, 0) / seen.length)
      : 0;

    return {
      memberId: m.id,
      name: m.fullName,
      phone: m.phone,
      idNumber: m.idNumber,
      isOfficial: isOfficial(m.designation),
      designation: m.designation,
      depositsCents,
      monthsActive,
      savingStreakMonths,
      avgAttendancePct,
    };
  });
}

/**
 * Build the lender-evidence checklist from what Pillar 1 already holds.
 * These are the documents a Kenyan bank / DT-SACCO routinely asks a group for
 * before opening a credit facility.
 */
/**
 * The papers savings and credit asks for. ONE list (owner 20/11/26): this is
 * the shared document house's "start savings and credit" purpose, so a group
 * is never asked here for something another section already holds, and the
 * two can never disagree. See `document-house.ts`.
 */
const EVIDENCE_ID: Partial<Record<HouseDocId, string>> = {
  registration: 'registration',
  officials: 'officials',
  rules: 'constitution',
  resolution: 'resolution',
  minutes: 'minutes',
  statements: 'financials',
  member_ids: 'kyc',
};

export function activationEvidence(
  charter: GroupCharter,
  statements: MonthEndStatement[],
): EvidenceItem[] {
  const house = buildHouseFromFacts(charter, houseFactsFromStatements(statements));
  const purpose = HOUSE_PURPOSES.find((p) => p.id === 'savings_credit')!;
  return checkPurpose(house, purpose).lines
    .filter((line) => line.kind === 'must')
    .map((line) => ({
      id: EVIDENCE_ID[line.doc.id] ?? line.doc.id,
      label: line.doc.name.en,
      satisfied: line.ok,
      source: houseRoomName(line.doc.room),
      detail: line.ok
        ? line.doc.have.en
        : `${line.doc.have.en}${line.shortBy > 0 ? ` — ${line.shortBy} more needed` : ''}. ${line.doc.fix.en}`,
    }));
}

/** Requested amount used for the pre-qualification preview: a member's own cap. */
function previewMemberCredit(
  profile: MemberSavingsProfile,
): MemberCreditPreview {
  const byProduct = (Object.keys(LOAN_PRODUCTS) as LoanProductId[]).map((productId) => {
    const product = LOAN_PRODUCTS[productId];
    // Ask for the full deposit-multiplier headroom; the engine trims to what
    // the member actually qualifies for and explains why.
    const requestedCents = Math.floor(profile.depositsCents * product.depositMultiplier);
    const result = scoreEligibility(product, Math.max(1, requestedCents), {
      monthsActive: profile.monthsActive,
      depositsCents: profile.depositsCents,
      savingStreakMonths: profile.savingStreakMonths,
      onTimeRepaymentRate: 1, // no prior loan history yet
      existingLoanBalanceCents: 0,
      guarantorCoverageCents: 0,
      hasDefaultHistory: false,
    });
    return { productId, result };
  });

  const qualified = byProduct.filter((b) => b.result.qualified);
  const best =
    qualified.length > 0
      ? qualified.reduce((a, b) => (b.result.maxLoanCents > a.result.maxLoanCents ? b : a))
      : null;

  return {
    memberId: profile.memberId,
    name: profile.name,
    depositsCents: profile.depositsCents,
    best,
    byProduct,
  };
}

/**
 * Assemble the full activation packet from a group's Pillar-1 record.
 */
export function buildSaccoActivation(
  charter: GroupCharter,
  statements: MonthEndStatement[],
): SaccoActivationPacket {
  const onboarding = ENTITY_ONBOARDING.REGISTERED_GROUP;
  const sorted = chron(statements);
  const members = memberSavingsProfiles(charter, statements);
  const signatories = officials(charter.members).map((o) => ({
    memberId: o.id,
    name: o.fullName,
    designation: o.designation,
    phone: o.phone,
  }));

  const totalContributionsCents = members.reduce((a, m) => a + m.depositsCents, 0);
  const latestClosingCents = sorted.length ? sorted[sorted.length - 1]!.finance.closingCents : 0;

  const evidence = activationEvidence(charter, statements);
  const satisfied = evidence.filter((e) => e.satisfied).length;
  const readinessPct = evidence.length ? Math.round((100 * satisfied) / evidence.length) : 0;
  const missing = evidence.filter((e) => !e.satisfied).map((e) => e.label);

  return {
    groupId: charter.groupId,
    displayName: charter.name,
    countryCode: charter.countryCode,
    entityType: 'REGISTERED_GROUP',
    fastTrack: onboarding.fastTrack,
    registeredNumber: charter.registeredNumber,
    signatories,
    members,
    monthsOfHistory: sorted.length,
    totalContributionsCents,
    latestClosingCents,
    evidence,
    readinessPct,
    missing,
    // The group's proven pooled savings seed the account balance on opening;
    // share capital starts at zero until members buy shares.
    openingState: {
      balanceCents: Math.max(0, latestClosingCents || totalContributionsCents),
      shareCapitalCents: 0,
      pledgedCents: 0,
    },
  };
}

/** Per-member pre-qualified loan preview for the whole group. */
export function activationCreditPreview(
  packet: SaccoActivationPacket,
): MemberCreditPreview[] {
  return packet.members.map(previewMemberCredit);
}

/** True when Pillar 1 already carries every lender-required document. */
export function isActivationReady(packet: SaccoActivationPacket): boolean {
  return packet.readinessPct === 100;
}
