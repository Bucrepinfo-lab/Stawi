import { describe, it, expect } from 'vitest';
import {
  notifyPaymentConfirmed,
  notifySubscriptionDue,
  notificationsForStock,
} from '../src/notifications';
import { classifyStock } from '../src/accounting';

describe('notifications', () => {
  it('builds a payment-confirmed notification', () => {
    const n = notifyPaymentConfirmed('Amina', 500_000, 'SGR7XYZ');
    expect(n.kind).toBe('PAYMENT_CONFIRMED');
    expect(n.body).toContain('KES 5,000');
    expect(n.body).toContain('SGR7XYZ');
    expect(n.severity).toBe('info');
  });

  it('subscription-due is a warning', () => {
    expect(notifySubscriptionDue('Umoja', 1000).severity).toBe('warn');
  });

  it('derives stock notifications, critical first', () => {
    const insights = classifyStock([
      { id: '1', name: 'Sugar', quantity: 2, reorderLevel: 12, soldInWindow: 42, supplierName: 'Mumias' },
      { id: '2', name: 'Flour', quantity: 14, reorderLevel: 15, soldInWindow: 60 },
      { id: '3', name: 'Oil', quantity: 40, reorderLevel: 12, soldInWindow: 200 },
    ]);
    const notes = notificationsForStock(insights);
    expect(notes.length).toBe(2); // sugar + flour need reorder
    expect(notes[0]!.kind).toBe('STOCK_CRITICAL'); // sugar first
    expect(notes[0]!.body).toContain('Mumias');
  });
});
