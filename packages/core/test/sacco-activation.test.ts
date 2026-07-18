import { describe, it, expect } from 'vitest';
import { emptyCharter, type GroupCharter } from '../src/charter';
import type { MonthEndStatement, MemberMonthStat } from '../src/statement';
import {
  buildSaccoActivation,
  memberSavingsProfiles,
  activationEvidence,
  activationCreditPreview,
  isActivationReady,
} from '../src/sacco-activation';

// ── fixtures ──────────────────────────────────────────────────────────────

function charterFixture(opts: { registered?: boolean; withIds?: boolean } = {}): GroupCharter {
  const c = emptyCharter('g1', 'Umoja Women Group', 'KE');
  c.registeredNumber = opts.registered ? 'CBO/NRB/2024/001' : undefined;
  c.constitution = 'The group shall meet weekly and save together.';
  c.members = [
    { id: 'm1', serial: 1, fullName: 'Grace Wanjiru', designation: 'Chairperson', phone: '254700000001', idNumber: opts.withIds ? '11111111' : undefined },
    { id: 'm2', serial: 2, fullName: 'Peter Otieno', designation: 'Secretary', phone: '254700000002', idNumber: opts.withIds ? '22222222' : undefined },
    { id: 'm3', serial: 3, fullName: 'Mary Akinyi', designation: 'Treasurer', phone: '254700000003', idNumber: opts.withIds ? '33333333' : undefined },
    { id: 'm4', serial: 4, fullName: 'John Kamau', designation: 'Member', phone: '254700000004', idNumber: opts.withIds ? '44444444' : undefined },
  ];
  return c;
}

function memberStat(memberId: string, name: string, contributedCents: number, attendancePct = 100): MemberMonthStat {
  return { memberId, name, meetingsPresent: 4, meetingsApology: 0, meetingsAbsent: 0, attendancePct, contributedCents, finesCents: 0 };
}

function statement(year: number, month: number, contribByMember: Record<string, number>, opts: { resolution?: boolean; closingCents?: number } = {}): MonthEndStatement {
  const members = Object.entries(contribByMember).map(([id, cents]) => memberStat(id, id, cents));
  const contributionsCents = Object.values(contribByMember).reduce((a, b) => a + b, 0);
  return {
    groupName: 'Umoja Women Group',
    period: { year, month, label: `${year}-${month}` },
    meetingsHeld: 4,
    membersOnRegister: 4,
    avgAttendancePct: 100,
    members,
    finance: {
      openingCents: 0,
      contributionsCents,
      finesCents: 0,
      otherInCents: 0,
      payoutsCents: 0,
      otherOutCents: 0,
      totalInCents: contributionsCents,
      totalOutCents: 0,
      closingCents: opts.closingCents ?? contributionsCents,
    },
    resolutions: opts.resolution ? ['RESOLVED THAT the group shall open a Stawi SACCO+ account.'] : [],
    narrative: [],
  };
}

// Three consecutive months of steady saving.
function threeMonths() {
  return [
    statement(2026, 4, { m1: 200000, m2: 200000, m3: 200000, m4: 100000 }),
    statement(2026, 5, { m1: 200000, m2: 200000, m3: 200000, m4: 100000 }, { resolution: true }),
    statement(2026, 6, { m1: 200000, m2: 200000, m3: 200000, m4: 100000 }, { closingCents: 2100000 }),
  ];
}

// ── tests ────────────────────────────────────────────────────────────────

describe('memberSavingsProfiles', () => {
  it('sums deposits and computes months active + saving streak', () => {
    const profiles = memberSavingsProfiles(charterFixture(), threeMonths());
    const m1 = profiles.find((p) => p.memberId === 'm1')!;
    expect(m1.depositsCents).toBe(600000); // 3 × 200000
    expect(m1.monthsActive).toBe(3);
    expect(m1.savingStreakMonths).toBe(3);
    expect(m1.isOfficial).toBe(true);
  });

  it('breaks the streak when a recent month has no contribution', () => {
    const stmts = [
      statement(2026, 4, { m1: 200000 }),
      statement(2026, 5, { m1: 0 }),
      statement(2026, 6, { m1: 200000 }),
    ];
    const m1 = memberSavingsProfiles(charterFixture(), stmts).find((p) => p.memberId === 'm1')!;
    expect(m1.depositsCents).toBe(400000);
    expect(m1.monthsActive).toBe(2);
    expect(m1.savingStreakMonths).toBe(1); // only the latest month is unbroken
  });

  it('handles a member with no statement history (zeroes, no crash)', () => {
    const profiles = memberSavingsProfiles(charterFixture(), []);
    expect(profiles).toHaveLength(4);
    expect(profiles.every((p) => p.depositsCents === 0 && p.savingStreakMonths === 0)).toBe(true);
  });
});

describe('activationEvidence', () => {
  it('marks everything satisfied for a fully-documented registered group', () => {
    const ev = activationEvidence(charterFixture({ registered: true, withIds: true }), threeMonths());
    const byId = Object.fromEntries(ev.map((e) => [e.id, e.satisfied]));
    expect(byId.registration).toBe(true);
    expect(byId.officials).toBe(true); // chair + secretary + treasurer present
    expect(byId.constitution).toBe(true);
    expect(byId.resolution).toBe(true);
    expect(byId.minutes).toBe(true);
    expect(byId.financials).toBe(true); // 3 months
    expect(byId.kyc).toBe(true);
  });

  it('flags missing registration and KYC when absent', () => {
    const ev = activationEvidence(charterFixture({ registered: false, withIds: false }), threeMonths());
    const byId = Object.fromEntries(ev.map((e) => [e.id, e.satisfied]));
    expect(byId.registration).toBe(false);
    expect(byId.kyc).toBe(false);
  });
});

describe('buildSaccoActivation', () => {
  it('is 100% ready and fast-tracked when Pillar 1 is complete', () => {
    const packet = buildSaccoActivation(charterFixture({ registered: true, withIds: true }), threeMonths());
    expect(packet.entityType).toBe('REGISTERED_GROUP');
    expect(packet.fastTrack).toBe(true);
    expect(packet.readinessPct).toBe(100);
    expect(packet.missing).toHaveLength(0);
    expect(isActivationReady(packet)).toBe(true);
    // three officials become signatories
    expect(packet.signatories.map((s) => s.designation).sort()).toEqual(['Chairperson', 'Secretary', 'Treasurer']);
    // pooled savings seed the opening balance from the last statement's closing
    expect(packet.openingState.balanceCents).toBe(2100000);
    expect(packet.totalContributionsCents).toBe(2100000);
  });

  it('reports partial readiness and lists what is missing', () => {
    const packet = buildSaccoActivation(charterFixture({ registered: false, withIds: false }), threeMonths());
    expect(packet.readinessPct).toBeLessThan(100);
    expect(packet.missing.length).toBeGreaterThan(0);
    expect(isActivationReady(packet)).toBe(false);
  });
});

describe('activationCreditPreview', () => {
  it('pre-qualifies steady savers for a loan sized to their deposits', () => {
    const packet = buildSaccoActivation(charterFixture({ registered: true, withIds: true }), threeMonths());
    const preview = activationCreditPreview(packet);
    const m1 = preview.find((p) => p.memberId === 'm1')!;
    expect(m1.depositsCents).toBe(600000);
    expect(m1.best).not.toBeNull();
    // max loan is bounded by the deposit multiplier (≤ 3× deposits for Development)
    expect(m1.best!.result.maxLoanCents).toBeGreaterThan(0);
    expect(m1.best!.result.maxLoanCents).toBeLessThanOrEqual(600000 * 3);
    expect(m1.best!.result.qualified).toBe(true);
  });

  it('does not pre-qualify a member with no savings history', () => {
    const packet = buildSaccoActivation(charterFixture({ registered: true, withIds: true }), []);
    const preview = activationCreditPreview(packet);
    expect(preview.every((p) => p.depositsCents === 0)).toBe(true);
    expect(preview.every((p) => p.best === null)).toBe(true);
  });
});
