/**
 * Who may open a contribution receipt (owner, 07/11/26).
 *
 * A receipt is only ever built from a STORED, CONFIRMED contribution loaded by
 * its id — never from values in the URL. It can be opened by the member who
 * paid, or by that group's officials (chair, secretary, treasurer), within the
 * caller's tenant. Everything else — unknown id, pending/failed payment,
 * another tenant's or another member's receipt, or no sign-in — is "not
 * found" (404), so the page never confirms that a receipt exists.
 */
import { phoneKey } from './identity';

export interface StoredReceiptRow {
  status: string; // PaymentStatus: PENDING | CONFIRMED | FAILED
  groupTenantId: string | null;
  memberUserId: string;
  memberPhone: string | null;
}

export interface ReceiptViewer {
  userId: string | null;
  phone: string | null;
  /** The caller's tenant, when they have a tenant context. */
  tenantId: string | null;
  /** The caller's per-group role in the contribution's group (DB enum), or null. */
  groupRole: string | null;
}

export const RECEIPT_OFFICIAL_ROLES: readonly string[] = ['CHAIRMAN', 'SECRETARY', 'TREASURER'];

export function canViewReceipt(row: StoredReceiptRow | null | undefined, viewer: ReceiptViewer): boolean {
  if (!row || row.status !== 'CONFIRMED') return false;
  if (!viewer.userId) return false;
  if (viewer.tenantId && row.groupTenantId && viewer.tenantId !== row.groupTenantId) return false;
  if (!viewer.groupRole) return false; // not in this group at all
  if (RECEIPT_OFFICIAL_ROLES.includes(viewer.groupRole.toUpperCase())) return true;
  if (row.memberUserId === viewer.userId) return true;
  const key = viewer.phone ? phoneKey(viewer.phone) : '';
  return key.length === 9 && !!row.memberPhone && phoneKey(row.memberPhone) === key;
}

/** Receipt links carry only the contribution id — never names or amounts. */
export function receiptPath(contributionId: string): string {
  return `/receipt/${encodeURIComponent(contributionId)}`;
}
