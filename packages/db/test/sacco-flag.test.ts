import { describe, it, expect } from 'vitest';
import { FeatureDisabledError } from '@stawi/core';
import {
  applyForLoan,
  accrueMonthlyInterest,
  openSaccoAccount,
  postSaccoTxn,
  getSaccoAccounts,
} from '../src/repo';

/**
 * A PrismaClient stand-in that records every model touched. When SACCO+ is
 * off, the repo must refuse BEFORE reaching the database — so nothing is read
 * or written and existing rows stay exactly as they are.
 */
function trapPrisma() {
  const touched: string[] = [];
  const model = (name: string) =>
    new Proxy(
      {},
      {
        get: (_t, op) => async () => {
          touched.push(`${name}.${String(op)}`);
          if (op === 'findMany') return [];
          if (op === 'aggregate') return { _sum: { principalCents: 0 } };
          return { id: 'x', balanceCents: 0, shareCapitalCents: 0, pledgedCents: 0, tenantId: 't1' };
        },
      },
    );
  const prisma = new Proxy(
    {},
    {
      get: (_t, prop) => {
        if (prop === '$transaction') return async (ops: unknown) => (Array.isArray(ops) ? Promise.all(ops) : ops);
        return model(String(prop));
      },
    },
  );
  return { prisma: prisma as never, touched };
}

function withFlag<T>(value: string | undefined, fn: () => Promise<T>): Promise<T> {
  const prev = process.env.SACCO_PLUS_ENABLED;
  if (value === undefined) delete process.env.SACCO_PLUS_ENABLED;
  else process.env.SACCO_PLUS_ENABLED = value;
  return fn().finally(() => {
    if (prev === undefined) delete process.env.SACCO_PLUS_ENABLED;
    else process.env.SACCO_PLUS_ENABLED = prev;
  });
}

const loanInput = {
  tenantId: 't1',
  accountId: 'a1',
  product: 'EMERGENCY' as const,
  principalCents: 500_000,
  termMonths: 3,
  monthsActive: 12,
  savingStreakMonths: 12,
  onTimeRepaymentRate: 1,
};

describe('SACCO+ server paths with SACCO_PLUS_ENABLED unset (default)', () => {
  it('applyForLoan refuses without scoring or writing a Loan row', async () => {
    const { prisma, touched } = trapPrisma();
    await withFlag(undefined, async () => {
      await expect(applyForLoan(prisma, loanInput)).rejects.toBeInstanceOf(FeatureDisabledError);
    });
    expect(touched).toEqual([]);
  });

  it('accrueMonthlyInterest refuses without posting INTEREST', async () => {
    const { prisma, touched } = trapPrisma();
    await withFlag(undefined, async () => {
      await expect(accrueMonthlyInterest(prisma)).rejects.toBeInstanceOf(FeatureDisabledError);
    });
    expect(touched).toEqual([]);
  });

  it('openSaccoAccount and postSaccoTxn (withdrawals/remittances) refuse', async () => {
    const { prisma, touched } = trapPrisma();
    await withFlag('false', async () => {
      await expect(
        openSaccoAccount(prisma, { tenantId: 't1', entityType: 'INDIVIDUAL', displayName: 'X' }),
      ).rejects.toBeInstanceOf(FeatureDisabledError);
      await expect(
        postSaccoTxn(prisma, { tenantId: 't1', accountId: 'a1', type: 'WITHDRAWAL', amountCents: 100, approvedByClerkId: 'u' }),
      ).rejects.toBeInstanceOf(FeatureDisabledError);
    });
    expect(touched).toEqual([]);
  });

  it('getSaccoAccounts returns nothing and does not query', async () => {
    const { prisma, touched } = trapPrisma();
    const rows = await withFlag(undefined, () => getSaccoAccounts(prisma, 't1', 'u1'));
    expect(rows).toEqual([]);
    expect(touched).toEqual([]);
  });
});

describe('SACCO+ server paths with SACCO_PLUS_ENABLED=true', () => {
  it('reach the database again (flag is the only gate added)', async () => {
    const { prisma, touched } = trapPrisma();
    await withFlag('true', async () => {
      await accrueMonthlyInterest(prisma);
      await getSaccoAccounts(prisma, 't1', 'u1');
    });
    expect(touched).toContain('saccoAccount.findMany');
  });
});
