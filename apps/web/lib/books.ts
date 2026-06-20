/**
 * Per-group business books seed.
 *
 * Only groups that have started a business have books. Stored as plain
 * serializable data (dayOffset, cents) so a server component can pass it to the
 * client, which builds Date objects. In production this loads from @stawi/db.
 */

import type { EntryType, StockItem } from '@stawi/core';

export interface EntrySeed {
  type: EntryType;
  description: string;
  amountCents: number;
  /** Days before today the entry occurred. */
  dayOffset: number;
}

export interface GroupBusiness {
  name: string;
  vatRegistered: boolean;
  tourismSector: boolean;
  entries: EntrySeed[];
  stock: StockItem[];
}

/** Keyed by GroupAccount.id. `null` = group has no business yet. */
export const GROUP_BUSINESS: Record<string, GroupBusiness | null> = {
  mboga: {
    name: 'Mama Mboga Hub',
    vatRegistered: true,
    tourismSector: true, // food kiosk → catering levy
    entries: [
      { type: 'SALE', description: 'Daily sales', amountCents: 2_845_000, dayOffset: 0 },
      { type: 'PURCHASE', description: 'Restock', amountCents: 1_900_000, dayOffset: 0 },
      { type: 'EXPENSE', description: 'Rent (share)', amountCents: 250_000, dayOffset: 0 },
      { type: 'SALE', description: 'Sales', amountCents: 2_100_000, dayOffset: 2 },
      { type: 'SALE', description: 'Sales', amountCents: 1_750_000, dayOffset: 9 },
    ],
    stock: [
      { id: 's1', name: 'Cooking oil 1L', quantity: 40, reorderLevel: 12, soldInWindow: 214, supplierName: 'Bidco', supplierPhone: '254700111222' },
      { id: 's2', name: 'Maize flour 2kg', quantity: 28, reorderLevel: 15, soldInWindow: 186, supplierName: 'Pembe', supplierPhone: '254700333444' },
      { id: 's3', name: 'Sugar 1kg', quantity: 3, reorderLevel: 12, soldInWindow: 42, supplierName: 'Mumias', supplierPhone: '254700555666' },
      { id: 's4', name: 'Shoe polish', quantity: 30, reorderLevel: 5, soldInWindow: 0 },
    ],
  },
  umoja: {
    name: 'Umoja Liquid Soap',
    vatRegistered: false,
    tourismSector: false,
    entries: [
      { type: 'SALE', description: 'Soap sales', amountCents: 480_000, dayOffset: 0 },
      { type: 'PURCHASE', description: 'Raw materials', amountCents: 210_000, dayOffset: 0 },
      { type: 'SALE', description: 'Bulk order (school)', amountCents: 620_000, dayOffset: 3 },
      { type: 'EXPENSE', description: 'Packaging', amountCents: 45_000, dayOffset: 1 },
    ],
    stock: [
      { id: 'u1', name: '5L liquid soap', quantity: 22, reorderLevel: 8, soldInWindow: 64, supplierName: 'ChemSupplies', supplierPhone: '254700777888' },
      { id: 'u2', name: 'Bottles (empty)', quantity: 6, reorderLevel: 20, soldInWindow: 90, supplierName: 'PlastPack', supplierPhone: '254700999000' },
      { id: 'u3', name: 'Fragrance oil', quantity: 4, reorderLevel: 3, soldInWindow: 12 },
    ],
  },
  // Vijana SACCO has no operating business yet.
  vijana: null,
};
