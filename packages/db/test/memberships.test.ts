import { describe, it, expect } from 'vitest';
import { provisionRosterMemberships } from '../src/repo';
import { findDuplicateMemberships } from '../src/duplicates';

/** In-memory membership table with the real unique rule (groupId, clerkUserId). */
function fakePrisma(seed: { id: string; groupId: string; clerkUserId: string; phone: string | null }[] = []) {
  const rows = seed.map((r) => ({ ...r }));
  let n = rows.length;
  const writes: string[] = [];
  const membership = {
    findMany: async ({ where }: any) => rows.filter((r) => r.groupId === where.groupId),
    upsert: async ({ where, create }: any) => {
      const k = where.groupId_clerkUserId;
      const hit = rows.find((r) => r.groupId === k.groupId && r.clerkUserId === k.clerkUserId);
      if (hit) { writes.push('upsert:noop'); return hit; }
      const row = { id: `m${++n}`, groupId: create.groupId, clerkUserId: create.clerkUserId, phone: create.phone };
      rows.push(row);
      writes.push('upsert:create');
      return row;
    },
    create: async () => { throw new Error('provisioning must upsert, never blind-create'); },
    delete: async () => { throw new Error('must never delete'); },
    deleteMany: async () => { throw new Error('must never delete'); },
    update: async () => { throw new Error('must never merge/update'); },
  };
  return { prisma: { membership } as never, rows, writes };
}

const roster = (...phones: string[]) => phones.map((phone, i) => ({ fullName: `Member ${i}`, phone }));

describe('provisionRosterMemberships — one row per group + phone (owner, 07/11/26)', () => {
  it('a phone repeated in the roster, in any format, creates one row', async () => {
    const f = fakePrisma();
    await provisionRosterMemberships(f.prisma, { groupId: 'g1', roster: roster('0712345678', '+254712345678', '254 712 345 678', '0722000111') });
    expect(f.rows.filter((r) => r.groupId === 'g1').length).toBe(2);
    expect(findDuplicateMemberships(f.rows)).toEqual([]);
  });

  it('saving the same roster again changes nothing', async () => {
    const f = fakePrisma();
    const input = { groupId: 'g1', roster: roster('0712345678', '0722000111') };
    await provisionRosterMemberships(f.prisma, input);
    await provisionRosterMemberships(f.prisma, input);
    expect(f.rows.length).toBe(2);
  });

  it('skips a phone already on a linked (signed-in) row', async () => {
    const f = fakePrisma([{ id: 'm-founder', groupId: 'g1', clerkUserId: 'user-1', phone: '+254712345678' }]);
    await provisionRosterMemberships(f.prisma, { groupId: 'g1', roster: roster('0712345678') });
    expect(f.rows.length).toBe(1);
  });

  it('two saves racing with a stale view still leave exactly one row (unique upsert key)', async () => {
    const f = fakePrisma();
    const input = { groupId: 'g1', roster: roster('0712345678') };
    await Promise.all([provisionRosterMemberships(f.prisma, input), provisionRosterMemberships(f.prisma, input)]);
    expect(f.rows.length).toBe(1);
  });

  it('the same phone in another group is a separate member', async () => {
    const f = fakePrisma();
    await provisionRosterMemberships(f.prisma, { groupId: 'g1', roster: roster('0712345678') });
    await provisionRosterMemberships(f.prisma, { groupId: 'g2', roster: roster('0712345678') });
    expect(f.rows.map((r) => r.groupId).sort()).toEqual(['g1', 'g2']);
  });
});

describe('findDuplicateMemberships — read-only report', () => {
  it('lists same group + same phone and same group + same login, masked', () => {
    const out = findDuplicateMemberships([
      { id: 'a1', groupId: 'g1', clerkUserId: 'pending:712345678', phone: '0712345678' },
      { id: 'a2', groupId: 'g1', clerkUserId: 'user-abcdef-1', phone: '+254712345678' },
      { id: 'b1', groupId: 'g1', clerkUserId: 'user-zzz', phone: '0722000111' },
      { id: 'b2', groupId: 'g1', clerkUserId: 'user-zzz', phone: null },
      { id: 'c1', groupId: 'g2', clerkUserId: 'pending:712345678', phone: '0712345678' },
    ]);
    expect(out).toEqual([
      { groupId: 'g1', kind: 'phone', keyHint: '…678', membershipIds: ['a1', 'a2'] },
      { groupId: 'g1', kind: 'user', keyHint: 'user-z…', membershipIds: ['b1', 'b2'] },
    ]);
  });

  it('never prints a full phone number', () => {
    const out = findDuplicateMemberships([
      { id: 'x', groupId: 'g', clerkUserId: 'pending:1', phone: '0712345678' },
      { id: 'y', groupId: 'g', clerkUserId: 'pending:2', phone: '0712345678' },
    ]);
    expect(JSON.stringify(out)).not.toContain('712345678');
  });

  it('distinct pending placeholders are not "same user"', () => {
    expect(findDuplicateMemberships([
      { id: 'x', groupId: 'g', clerkUserId: 'pending:111111111', phone: null },
      { id: 'y', groupId: 'g', clerkUserId: 'pending:111111111', phone: null },
    ])).toEqual([]);
  });
});
