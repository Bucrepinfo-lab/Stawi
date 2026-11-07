import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { canViewReceipt, receiptPath, type StoredReceiptRow, type ReceiptViewer } from '../src/receipt-access';

const row: StoredReceiptRow = { status: 'CONFIRMED', groupTenantId: 't1', memberUserId: 'u-amina', memberPhone: '0712345678' };
const viewer = (v: Partial<ReceiptViewer>): ReceiptViewer => ({ userId: 'u-amina', phone: null, tenantId: 't1', groupRole: 'MEMBER', ...v });

describe('receipt access — stored, confirmed, own or official only (owner, 07/11/26)', () => {
  it('the paying member can open their own receipt (by login or verified phone)', () => {
    expect(canViewReceipt(row, viewer({}))).toBe(true);
    expect(canViewReceipt(row, viewer({ userId: 'u-other-login', phone: '+254712345678' }))).toBe(true);
  });

  it("the group's chair, secretary and treasurer can open any member's receipt", () => {
    for (const r of ['CHAIRMAN', 'SECRETARY', 'TREASURER']) expect(canViewReceipt(row, viewer({ userId: 'u-official', groupRole: r }))).toBe(true);
  });

  it("another ordinary member of the same group cannot open someone else's receipt", () => {
    expect(canViewReceipt(row, viewer({ userId: 'u-david', phone: '0701222333', groupRole: 'MEMBER' }))).toBe(false);
    expect(canViewReceipt(row, viewer({ userId: 'u-sig', groupRole: 'SIGNATORY' }))).toBe(false);
  });

  it('unknown ref, pending or failed payment → not found', () => {
    expect(canViewReceipt(null, viewer({ groupRole: 'TREASURER' }))).toBe(false);
    expect(canViewReceipt({ ...row, status: 'PENDING' }, viewer({ groupRole: 'TREASURER' }))).toBe(false);
    expect(canViewReceipt({ ...row, status: 'FAILED' }, viewer({}))).toBe(false);
  });

  it('a foreign tenant, a non-member or no sign-in → not found', () => {
    expect(canViewReceipt(row, viewer({ tenantId: 't2', groupRole: 'TREASURER' }))).toBe(false);
    expect(canViewReceipt(row, viewer({ groupRole: null }))).toBe(false);
    expect(canViewReceipt(row, viewer({ userId: null }))).toBe(false);
  });

  it('receipt links carry only the id — no names or amounts', () => {
    expect(receiptPath('ck123')).toBe('/receipt/ck123');
    expect(receiptPath('a b?amount=1')).not.toContain('?');
  });
});

describe('forged receipt URLs cannot produce a receipt (source guard)', () => {
  const web = (p: string) => readFileSync(new URL(`../../../apps/web/${p}`, import.meta.url), 'utf8');

  it('the receipt page never reads query values — it loads the stored contribution', () => {
    const page = web('app/receipt/[ref]/page.tsx');
    expect(page).not.toMatch(/searchParams/);
    expect(page).toMatch(/contribution\.findUnique/);
    expect(page).toMatch(/canViewReceipt/);
    expect(page).toMatch(/notFound\(\)/);
  });

  it('the dashboard links to receipts by id only', () => {
    const tb = web('app/dashboard/TableBanking.tsx');
    expect(tb).not.toMatch(/\/receipt\/[^'"`]*\?/);
    expect(tb).not.toMatch(/amount=\$\{/);
    expect(tb).toMatch(/receiptPath\(/);
  });
});
