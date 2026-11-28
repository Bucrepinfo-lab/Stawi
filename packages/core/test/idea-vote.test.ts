import { describe, expect, it } from 'vitest';
import { canConfirmIdea, canPresentIdeas, castVoteProblem, confirmIdeaProblem, confirmNote, ideaTally } from '../src';

const T = ['Egg supply route', 'Car wash bay', 'Cargo pickup hire'];

describe('idea vote', () => {
  it('counts one vote per member, latest wins, ignores ideas not on the list', () => {
    const t = ideaTally(T, [
      { membershipId: 'a', title: 'Car wash bay' },
      { membershipId: 'a', title: 'Egg supply route' },
      { membershipId: 'b', title: 'Egg supply route' },
      { membershipId: 'c', title: 'Cargo pickup hire' },
      { membershipId: 'd', title: 'Something else' },
    ], 5);
    expect(t.voted).toBe(3);
    expect(t.rows.map((r) => r.votes)).toEqual([2, 0, 1]);
    expect(t.leader).toBe('Egg supply route');
    expect(t.majority).toBe(true);
    expect(t.quorum).toBe(true);
    expect(t.turnoutPct).toBe(60);
  });

  it('a tie has no leader', () => {
    const t = ideaTally(T, [{ membershipId: 'a', title: T[0]! }, { membershipId: 'b', title: T[1]! }], 10);
    expect(t.tie).toBe(true);
    expect(t.leader).toBeNull();
    expect(t.quorum).toBe(false);
  });

  it('nobody voted', () => {
    const t = ideaTally(T, [], 4);
    expect(t.leader).toBeNull();
    expect(t.tie).toBe(false);
    expect(confirmNote(t, T[0]!)).toMatch(/Nobody has voted/);
  });

  it('roles: officials present; only chairperson or secretary confirm', () => {
    expect(canPresentIdeas('TREASURER')).toBe(true);
    expect(canPresentIdeas('MEMBER')).toBe(false);
    expect(canConfirmIdea('TREASURER')).toBe(false);
    expect(canConfirmIdea('SECRETARY')).toBe(true);
    expect(confirmIdeaProblem({ role: 'TREASURER', open: true, title: T[0]!, titles: T })).toMatch(/chairperson or the secretary/);
    expect(confirmIdeaProblem({ role: 'CHAIRMAN', open: false, title: T[0]!, titles: T })).toMatch(/already confirmed/);
    expect(confirmIdeaProblem({ role: 'CHAIRMAN', open: true, title: 'x', titles: T })).toMatch(/not on this list/);
    expect(confirmIdeaProblem({ role: 'CHAIRMAN', open: true, title: T[0]!, titles: T })).toBeNull();
  });

  it('voting needs membership, an open vote and an idea on the list', () => {
    expect(castVoteProblem({ open: true, title: T[0]!, titles: T, isMember: false })).toMatch(/Only members/);
    expect(castVoteProblem({ open: false, title: T[0]!, titles: T, isMember: true })).toMatch(/closed/);
    expect(castVoteProblem({ open: true, title: T[0]!, titles: T, isMember: true })).toBeNull();
  });

  it('warns when confirming an idea that is not the leader', () => {
    const t = ideaTally(T, [{ membershipId: 'a', title: T[0]! }, { membershipId: 'b', title: T[0]! }], 3);
    expect(confirmNote(t, T[1]!)).toMatch(/not the idea with the most votes/);
    expect(confirmNote(t, T[0]!)).toMatch(/2 of 2 votes/);
  });
});
