/**
 * Serializable DTOs returned by the repository — safe to pass from server
 * components to client components (no Date objects; cents as numbers).
 */

export type GroupKind = 'Chama' | 'SACCO' | 'Business';

export interface MemberDTO {
  memberId: string;
  name: string;
  totalCents: number;
  role: string;
  paid: boolean;
}

export interface GroupAccountDTO {
  id: string;
  name: string;
  myRole: string;
  /** The caller's own roster row(s) in this group. */
  myMemberIds?: string[];
  flag: string;
  type: GroupKind;
  members: MemberDTO[];
}

export interface EntryDTO {
  type: 'SALE' | 'PURCHASE' | 'EXPENSE';
  description: string;
  amountCents: number;
  occurredAt: string; // ISO
}

export interface StockDTO {
  id: string;
  name: string;
  quantity: number;
  reorderLevel: number;
  soldInWindow: number;
  supplierName?: string;
  supplierPhone?: string;
}

export interface BusinessBooksDTO {
  businessId: string;
  name: string;
  vatRegistered: boolean;
  tourismSector: boolean;
  entries: EntryDTO[];
  stock: StockDTO[];
}
