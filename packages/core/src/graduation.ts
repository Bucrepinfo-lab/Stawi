/**
 * Graduation engine — Pillar 4's unique MVP.
 *
 * Research-backed: most microfinance groups never graduate into regulated
 * SACCOs, then banks, then listed institutions. The documented failure
 * reasons (governance fraud, liquidity breaches, thin capital, poor records,
 * opaque credit decisions, ballooning branch/wage costs, uneducated
 * membership, regulatory gaps) are each mapped to a Stawi feature that
 * closes the gap — and this module measures an institution against the
 * ladder so members always see the next rung and what's missing.
 */

export type GraduationStage =
  | 'CHAMA'
  | 'SELF_HELP_GROUP'
  | 'SACCO'
  | 'DEPOSIT_TAKING_SACCO'
  | 'MICROFINANCE_BANK'
  | 'COMMERCIAL_BANK'
  | 'LISTED';

export const STAGE_ORDER: GraduationStage[] = [
  'CHAMA',
  'SELF_HELP_GROUP',
  'SACCO',
  'DEPOSIT_TAKING_SACCO',
  'MICROFINANCE_BANK',
  'COMMERCIAL_BANK',
  'LISTED',
];

export const STAGE_LABELS: Record<GraduationStage, string> = {
  CHAMA: 'Informal chama',
  SELF_HELP_GROUP: 'Registered self-help group',
  SACCO: 'Registered SACCO (BOSA)',
  DEPOSIT_TAKING_SACCO: 'Deposit-taking SACCO (FOSA)',
  MICROFINANCE_BANK: 'Microfinance bank',
  COMMERCIAL_BANK: 'Commercial bank',
  LISTED: 'Listed on a securities exchange',
};

/** Why institutions stall on the ladder — and the Stawi feature that fixes it. */
export interface FailureGap {
  id: string;
  gap: string;
  why: string;
  stawiSolution: string;
}

export const FAILURE_GAPS: FailureGap[] = [
  {
    id: 'governance',
    gap: 'Governance failure & insider fraud',
    why: 'Forensic audits (e.g. KUSCCO, Sh13.8B lost) show unchecked officials and weak boards precede almost every collapse.',
    stawiSolution:
      'Dual-approval on every disbursement, immutable audit trail, role-based permissions, and treasurer actions visible to all members in real time.',
  },
  {
    id: 'liquidity',
    gap: 'Liquidity breaches and runs',
    why: 'DT-SACCOs must keep ≥15% of deposits liquid; failures cluster where nobody watched the ratio until withdrawals stalled.',
    stawiSolution:
      'Live liquidity meter with automatic alerts and a lending brake when the ratio approaches the 15% floor.',
  },
  {
    id: 'capital',
    gap: 'Thin core capital',
    why: 'Institutions cannot absorb losses or meet licensing thresholds, so regulators refuse the next licence tier.',
    stawiSolution:
      'Share-capital tracking per member, retained-earnings view, and a capital-adequacy gauge against the next stage’s threshold.',
  },
  {
    id: 'records',
    gap: 'Poor books & unauditable records',
    why: 'Paper ledgers and missing reconciliations make audited accounts (a graduation prerequisite) impossible.',
    stawiSolution:
      'Every shilling is double-entered digitally from day one (Pillar 1 + 3), so audited-ready statements export at any time.',
  },
  {
    id: 'credit-risk',
    gap: 'Opaque lending & high NPLs',
    why: 'Committee-based, relationship-driven loans breed defaults; NPLs above ~5% sink the balance sheet.',
    stawiSolution:
      'Deterministic eligibility scoring with published determinants, savings-multiplier limits, and guarantor coverage enforced by the system.',
  },
  {
    id: 'cost-base',
    gap: 'Ballooning physical costs',
    why: 'Branches, paper and sales wages force rate hikes and hidden charges; a digital account costs 80–95% less to serve.',
    stawiSolution:
      'Branchless by design: onboarding, deposits, loans, notifications and CRM are all digital; humans only where a country regulator demands them.',
  },
  {
    id: 'education',
    gap: 'Uninformed membership & low trust',
    why: 'Members who cannot see or understand the numbers leave, and dormant members stall growth.',
    stawiSolution:
      'Member-visible capital ratios, plain-language statements, and in-app nudges that teach the ladder and each member’s next step.',
  },
  {
    id: 'compliance',
    gap: 'Regulatory non-compliance',
    why: 'Dual/unclear regulation leaves thousands of small societies unsupervised until a licence application fails.',
    stawiSolution:
      'Country-aware compliance packs (Pillar 3) with T&Cs aligned to each regulator, filing reminders, and stage-gated checklists.',
  },
];

/** Machine-checkable inputs for the graduation assessment. */
export interface GraduationInput {
  memberCount: number;
  coreCapitalCents: number;
  totalAssetsCents: number;
  liquidAssetsCents: number;
  totalDepositsCents: number;
  nonPerformingLoanCents: number;
  grossLoanCents: number;
  auditedFinancialYears: number;
  consecutiveProfitYears: number;
  governance: {
    electedBoard: boolean;
    dualApprovalEnabled: boolean;
    auditTrailEnabled: boolean;
    annualAuditDone: boolean;
  };
  registeredWithRegulator: boolean;
}

export interface RequirementCheck {
  label: string;
  met: boolean;
  detail: string;
}

export interface GraduationAssessment {
  currentStage: GraduationStage;
  nextStage: GraduationStage | null;
  /** Checks for the NEXT stage — the member-visible gap report. */
  checks: RequirementCheck[];
  readinessPct: number;
  /** Key prudential ratios, % (rounded 2dp). */
  ratios: {
    capitalAdequacyPct: number;
    liquidityPct: number;
    nplPct: number;
  };
}

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 10_000) / 100;
}

/** Stage-entry requirements, expressed as checks against GraduationInput. */
function checksFor(stage: GraduationStage, i: GraduationInput): RequirementCheck[] {
  const capital = pct(i.coreCapitalCents, i.totalAssetsCents);
  const liquidity = pct(i.liquidAssetsCents, i.totalDepositsCents);
  const npl = pct(i.nonPerformingLoanCents, i.grossLoanCents);
  const gov = i.governance;

  switch (stage) {
    case 'SELF_HELP_GROUP':
      return [
        check('At least 10 members', i.memberCount >= 10, `${i.memberCount} members`),
        check('Elected officials in place', gov.electedBoard, gov.electedBoard ? 'Board elected' : 'Elect chairman, secretary, treasurer'),
        check('Registered with the regulator', i.registeredWithRegulator, i.registeredWithRegulator ? 'Registered' : 'Use the Formalization wizard'),
      ];
    case 'SACCO':
      return [
        check('At least 10 members', i.memberCount >= 10, `${i.memberCount} members`),
        check('Digital books with audit trail', gov.auditTrailEnabled, 'Auditable ledger required for registration'),
        check('Registered with the regulator', i.registeredWithRegulator, 'Cooperative registration'),
        check('1+ year of audited financials', i.auditedFinancialYears >= 1, `${i.auditedFinancialYears} audited years`),
      ];
    case 'DEPOSIT_TAKING_SACCO':
      return [
        check('Liquidity ratio ≥ 15%', liquidity >= 15, `${liquidity}% of deposits held liquid`),
        check('Core capital ≥ 10% of assets', capital >= 10, `${capital}% capital adequacy`),
        check('NPL ratio ≤ 5%', npl <= 5, `${npl}% non-performing`),
        check('Dual approval on disbursements', gov.dualApprovalEnabled, 'Fraud control required by licence'),
        check('2+ years audited financials', i.auditedFinancialYears >= 2, `${i.auditedFinancialYears} audited years`),
        check('At least 500 members', i.memberCount >= 500, `${i.memberCount} members`),
      ];
    case 'MICROFINANCE_BANK':
      return [
        check('Core capital ≥ 12% of assets', capital >= 12, `${capital}% capital adequacy`),
        check('Liquidity ratio ≥ 20%', liquidity >= 20, `${liquidity}% liquid`),
        check('NPL ratio ≤ 5%', npl <= 5, `${npl}% non-performing`),
        check('3+ years audited financials', i.auditedFinancialYears >= 3, `${i.auditedFinancialYears} audited years`),
        check('2+ consecutive profitable years', i.consecutiveProfitYears >= 2, `${i.consecutiveProfitYears} profitable years`),
        check('At least 5,000 members/customers', i.memberCount >= 5_000, `${i.memberCount} members`),
      ];
    case 'COMMERCIAL_BANK':
      return [
        check('Core capital ≥ 14.5% of assets', capital >= 14.5, `${capital}% capital adequacy`),
        check('Liquidity ratio ≥ 20%', liquidity >= 20, `${liquidity}% liquid`),
        check('NPL ratio ≤ 5%', npl <= 5, `${npl}% non-performing`),
        check('5+ years audited financials', i.auditedFinancialYears >= 5, `${i.auditedFinancialYears} audited years`),
        check('3+ consecutive profitable years', i.consecutiveProfitYears >= 3, `${i.consecutiveProfitYears} profitable years`),
        check('Annual external audit done', gov.annualAuditDone, 'Statutory requirement'),
      ];
    case 'LISTED':
      return [
        check('5-year satisfactory track record', i.auditedFinancialYears >= 5, `${i.auditedFinancialYears} audited years`),
        check('Net profit in the last 2 years', i.consecutiveProfitYears >= 2, `${i.consecutiveProfitYears} profitable years`),
        check('Full governance stack live', gov.electedBoard && gov.dualApprovalEnabled && gov.auditTrailEnabled && gov.annualAuditDone, 'Board, dual approval, audit trail, annual audit'),
        check('At least 25,000 members/shareholder base', i.memberCount >= 25_000, `${i.memberCount} members`),
      ];
    case 'CHAMA':
      return [];
  }
}

function check(label: string, met: boolean, detail: string): RequirementCheck {
  return { label, met, detail };
}

/**
 * Assess where an institution sits on the ladder and what the next rung
 * requires. Current stage = highest stage whose checks all pass.
 */
export function assessGraduation(input: GraduationInput): GraduationAssessment {
  let currentStage: GraduationStage = 'CHAMA';
  for (const stage of STAGE_ORDER.slice(1)) {
    const cs = checksFor(stage, input);
    if (cs.every((c) => c.met)) currentStage = stage;
    else break;
  }

  const idx = STAGE_ORDER.indexOf(currentStage);
  const nextStage = idx + 1 < STAGE_ORDER.length ? STAGE_ORDER[idx + 1] : null;
  const checks = nextStage ? checksFor(nextStage, input) : [];
  const met = checks.filter((c) => c.met).length;

  return {
    currentStage,
    nextStage,
    checks,
    readinessPct: checks.length === 0 ? 100 : Math.round((met / checks.length) * 100),
    ratios: {
      capitalAdequacyPct: pct(input.coreCapitalCents, input.totalAssetsCents),
      liquidityPct: pct(input.liquidAssetsCents, input.totalDepositsCents),
      nplPct: pct(input.nonPerformingLoanCents, input.grossLoanCents),
    },
  };
}
