import { describe, it, expect } from 'vitest';
import { parseImportedNotes, validateUpload, classifyUpload } from '../src/intake';
import { phoneRule, isValidPhoneLength, PHONE_RULES } from '../src/identity';

describe('upload validation', () => {
  it('classifies photos and documents', () => {
    expect(classifyUpload('image/jpeg')).toBe('photo');
    expect(classifyUpload('application/pdf')).toBe('file');
    expect(classifyUpload('application/zip')).toBeNull();
  });
  it('rejects unsupported and oversized files', () => {
    expect(validateUpload({ mime: 'application/zip', size: 10 }).ok).toBe(false);
    expect(validateUpload({ mime: 'image/png', size: 20 * 1024 * 1024 }).ok).toBe(false);
    expect(validateUpload({ mime: 'image/png', size: 1000 }).ok).toBe(true);
  });
});

describe('parseImportedNotes', () => {
  const raw = [
    'Umoja Women Group',
    'Date: 2026-06-19',
    'Present: Amina, Grace, Faith',
    'Absent: Brian',
    'Apologies: David',
    'Agenda 1: Purchase of chairs',
    'Resolved that we buy 20 plastic chairs',
    'Contributions KES 2,500 collected',
  ].join('\n');
  const p = parseImportedNotes(raw);
  it('extracts attendance', () => {
    expect(p.present).toEqual(['Amina', 'Grace', 'Faith']);
    expect(p.absent).toEqual(['Brian']);
    expect(p.apology).toEqual(['David']);
  });
  it('extracts agenda + resolution + date + amount', () => {
    expect(p.agendas[0]!.title).toBe('Purchase of chairs');
    expect(p.agendas[0]!.resolution).toMatch(/buy 20 plastic chairs/);
    expect(p.date).toBe('2026-06-19');
    expect(p.amountsCents).toContain(250000);
    expect(p.confidence).toBe('high');
  });
  it('preserves raw text and copes with unstructured input', () => {
    const q = parseImportedNotes('just some scribbles about the meeting');
    expect(q.confidence).toBe('none');
    expect(q.rawText).toContain('scribbles');
  });
});

describe('per-country phone rules', () => {
  it('Kenya defaults to 9 national digits', () => {
    expect(phoneRule('KE').nationalDigits).toBe(9);
    expect(phoneRule('KE').localMaxDigits).toBe(10);
  });
  it('unknown country falls back to KE', () => {
    expect(phoneRule('ZZ').dial).toBe('254');
  });
  it('validates national length', () => {
    expect(isValidPhoneLength('0712345678', 'KE')).toBe(true);
    expect(isValidPhoneLength('071234', 'KE')).toBe(false);
    expect(isValidPhoneLength('08012345678', 'NG')).toBe(true);
  });
  it('registry is extensible', () => {
    expect(Object.keys(PHONE_RULES).length).toBeGreaterThanOrEqual(5);
  });
});
