import { describe, expect, it } from 'vitest';
import { myRecordsCsv, phoneChange, photoProblem, pinChangeProblem } from '../src/profile';

/** Owner 26/11/26: one personal place to fix name, photo, phone, PIN and keep records. */
describe('my profile rules', () => {
  it('phone change', () => {
    expect(phoneChange('+254712345678', '0712 345 678')).toEqual({ ok: false, error: 'That is already your number.' });
    expect(phoneChange('+254712345678', '0722 000 111')).toEqual({ ok: true, phone: '+254722000111' });
    expect(phoneChange(null, 'abc').ok).toBe(false);
  });
  it('PIN change', () => {
    expect(pinChangeProblem('12', '4829', '4829')).toMatch(/current/);
    expect(pinChangeProblem('4829', '1234', '1234')).toMatch(/sequence/);
    expect(pinChangeProblem('4829', '5937', '5938')).toMatch(/do not match/);
    expect(pinChangeProblem('4829', '4829', '4829')).toMatch(/different/);
    expect(pinChangeProblem('4829', '5937', '5937')).toBeNull();
  });
  it('photo must be a small image', () => {
    expect(photoProblem('data:image/jpeg;base64,AAAA')).toBeNull();
    expect(photoProblem('data:text/html;base64,AAAA')).toMatch(/Choose a photo/);
    expect(photoProblem('data:image/jpeg;base64,' + 'A'.repeat(300_000))).toMatch(/too large/);
  });
  it('records CSV', () => {
    const csv = myRecordsCsv({ name: 'Mary', phone: '+254712345678', groups: [{ name: 'Umoja', role: 'Member' }], rows: [{ group: 'Umoja', date: '05/09/26', amountCents: 250_000, way: 'Cash', ref: null }], printed: '26/11/26' });
    expect(csv).toContain('Name,Mary');
    expect(csv).toContain("Phone,'+254712345678");
    expect(csv).toContain('Umoja,05/09/26,"2,500",Cash,');
    expect(csv).toContain('Total,,"2,500"');
  });
});
