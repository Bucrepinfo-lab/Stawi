import { describe, expect, it } from 'vitest';
import {
  correctionOutcome,
  correctionProblem,
  correctionSeats,
  needsWitnesses,
  neutralIsStale,
  pickRandom,
  seatFor,
  witnessProblem,
  witnessStatus,
  type TrustMember,
} from '../src/money-trust';

/** Owner 26/11/26: a recorded figure is very hard to change, and never by one person. */
const DAY = 86_400_000;
const t0 = new Date('2026-11-01T08:00:00Z');
const at = (days: number) => new Date(t0.getTime() + days * DAY);

const group: TrustMember[] = [
  { id: 'chair', role: 'CHAIRMAN', canSignIn: true },
  { id: 'sec', role: 'SECRETARY', canSignIn: true },
  { id: 'tre', role: 'TREASURER', canSignIn: true },
  { id: 'a', role: 'MEMBER', canSignIn: true },
  { id: 'b', role: 'MEMBER', canSignIn: true },
  { id: 'c', role: 'MEMBER', canSignIn: true },
  { id: 'paper', role: 'MEMBER', canSignIn: false },
];

describe('witnesses', () => {
  it('cash and M-Pesa to a phone need witnesses; till and bank do not', () => {
    expect(needsWitnesses('CASH')).toBe(true);
    expect(needsWitnesses('mpesa_phone')).toBe(true);
    expect(needsWitnesses('MPESA_TILL')).toBe(false);
    expect(needsWitnesses('BANK')).toBe(false);
  });

  const base = { way: 'CASH', recorderIds: ['tre'], contributorId: 'a', memberIds: group.map((m) => m.id) };
  it('needs two different members, not the recorder or the payer', () => {
    expect(witnessProblem({ ...base, witnessIds: ['b'] })).toMatch(/two/);
    expect(witnessProblem({ ...base, witnessIds: ['b', 'b'] })).toMatch(/different/);
    expect(witnessProblem({ ...base, witnessIds: ['b', 'tre'] })).toMatch(/recording/);
    expect(witnessProblem({ ...base, witnessIds: ['b', 'a'] })).toMatch(/own witness/);
    expect(witnessProblem({ ...base, witnessIds: ['b', 'zz'] })).toMatch(/member/);
    expect(witnessProblem({ ...base, witnessIds: ['b', 'chair'] })).toBeNull();
    expect(witnessProblem({ ...base, way: 'BANK', witnessIds: [] })).toBeNull();
  });

  it('counts confirmations and flags 7 days unconfirmed', () => {
    const w = [{ membershipId: 'b', confirmedAt: at(1) }, { membershipId: 'c' }];
    expect(witnessStatus(w, t0, at(2))).toMatchObject({ confirmed: 1, complete: false, overdue: false });
    expect(witnessStatus(w, t0, at(8)).overdue).toBe(true);
    const both = [...w.slice(0, 1), { membershipId: 'c', confirmedAt: at(2) }];
    expect(witnessStatus(both, t0, at(30))).toMatchObject({ complete: true, overdue: false });
    expect(witnessStatus([{ membershipId: 'b', disputedAt: at(1) }], t0, at(1)).disputed).toBe(1);
  });
});

describe('who approves a correction', () => {
  const fixed = () => 0;
  it('full group: chair, secretary, treasurer, one neutral, the member — five different people', () => {
    const r = correctionSeats({ members: group, contributorId: 'a', random: fixed });
    if ('error' in r) throw new Error(r.error);
    expect(r.seats.map((s) => s.slot).sort()).toEqual(['CHAIR', 'CONTRIBUTOR', 'NEUTRAL', 'SECRETARY', 'TREASURER']);
    expect(new Set(r.seats.map((s) => s.membershipId)).size).toBe(5);
    const neutral = r.seats.find((s) => s.slot === 'NEUTRAL')!;
    expect(['b', 'c']).toContain(neutral.membershipId);
  });

  it('when the treasurer is the member, another neutral takes the treasurer seat', () => {
    const r = correctionSeats({ members: group, contributorId: 'tre', random: fixed });
    if ('error' in r) throw new Error(r.error);
    expect(r.seats.filter((s) => s.slot === 'NEUTRAL')).toHaveLength(2);
    expect(r.seats.filter((s) => s.slot === 'TREASURER')).toHaveLength(0);
    expect(new Set(r.seats.map((s) => s.membershipId)).size).toBe(5);
  });

  it('never picks someone who cannot sign in', () => {
    for (let i = 0; i < 20; i++) {
      const r = correctionSeats({ members: group, contributorId: 'a' });
      if ('error' in r) throw new Error(r.error);
      expect(r.seats.map((s) => s.membershipId)).not.toContain('paper');
    }
  });

  it('refuses when fewer than three people could approve', () => {
    const tiny: TrustMember[] = [{ id: 'chair', role: 'CHAIRMAN', canSignIn: true }, { id: 'x', role: 'MEMBER', canSignIn: false }];
    expect(correctionSeats({ members: tiny, contributorId: 'chair' })).toHaveProperty('error');
  });

  it('pickRandom returns distinct items', () => {
    expect(new Set(pickRandom([1, 2, 3, 4], 3)).size).toBe(3);
    expect(pickRandom([1], 3)).toEqual([1]);
  });
});

describe('the outcome of a correction', () => {
  const seats = [
    { slot: 'CHAIR' as const, membershipId: 'chair' },
    { slot: 'CONTRIBUTOR' as const, membershipId: 'a' },
    { slot: 'NEUTRAL' as const, membershipId: 'b' },
  ];
  it('one "no" stops it', () => {
    expect(correctionOutcome({ seats, decisions: [{ membershipId: 'chair', approve: true }, { membershipId: 'b', approve: false }], createdAt: t0, now: at(1) })).toBe('REJECTED');
  });
  it('counts only when every seat approves', () => {
    const two = [{ membershipId: 'chair', approve: true }, { membershipId: 'a', approve: true }];
    expect(correctionOutcome({ seats, decisions: two, createdAt: t0, now: at(1) })).toBe('PENDING');
    expect(correctionOutcome({ seats, decisions: [...two, { membershipId: 'b', approve: true }], createdAt: t0, now: at(1) })).toBe('APPROVED');
  });
  it('a vote from someone without a seat does not count', () => {
    expect(correctionOutcome({ seats, decisions: [{ membershipId: 'zz', approve: false }], createdAt: t0, now: at(1) })).toBe('PENDING');
  });
  it('expires after 14 days', () => {
    expect(correctionOutcome({ seats, decisions: [], createdAt: t0, now: at(15) })).toBe('EXPIRED');
  });
  it('seatFor and stale neutrals', () => {
    expect(seatFor(['b'], seats)?.slot).toBe('NEUTRAL');
    expect(seatFor(['zz'], seats)).toBeNull();
    expect(neutralIsStale(t0, false, at(4))).toBe(true);
    expect(neutralIsStale(t0, true, at(4))).toBe(false);
    expect(neutralIsStale(t0, false, at(2))).toBe(false);
  });
});

describe('raising a correction', () => {
  const ok = { originalCents: 1_000_000, correctedCents: 0, reason: 'Recorded twice by mistake on 07/11/26.', hasOpenCorrection: false };
  it('needs a real change and a reason', () => {
    expect(correctionProblem(ok)).toBeNull();
    expect(correctionProblem({ ...ok, hasOpenCorrection: true })).toMatch(/already/);
    expect(correctionProblem({ ...ok, correctedCents: 1_000_000 })).toMatch(/same/);
    expect(correctionProblem({ ...ok, correctedCents: -5 })).toMatch(/correct amount/);
    expect(correctionProblem({ ...ok, reason: 'oops' })).toMatch(/reason/);
  });
});
