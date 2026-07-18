import { describe, it, expect } from 'vitest';
import {
  stepsForTrack,
  formalizationProgress,
  SHG_STEPS,
  SACCO_STEPS,
} from '../src/formalization';

describe('formalization', () => {
  it('SHG has 5 steps, SACCO has 6', () => {
    expect(stepsForTrack('SHG').length).toBe(5);
    expect(stepsForTrack('SACCO').length).toBe(6);
    expect(SHG_STEPS[0]!.key).toBe('name_search');
    expect(SACCO_STEPS[1]!.key).toBe('members_20');
  });

  it('computes progress and the next step', () => {
    const p = formalizationProgress('SHG', ['name_search', 'constitution']);
    expect(p.completed).toBe(2);
    expect(p.total).toBe(5);
    expect(p.pct).toBe(40);
    expect(p.nextStep?.key).toBe('formation_minutes');
    expect(p.done).toBe(false);
  });

  it('marks done when all steps complete', () => {
    const all = SHG_STEPS.map((s) => s.key);
    const p = formalizationProgress('SHG', all);
    expect(p.done).toBe(true);
    expect(p.pct).toBe(100);
    expect(p.nextStep).toBeNull();
  });

  it('ignores unknown keys', () => {
    const p = formalizationProgress('SHG', ['nope', 'name_search']);
    expect(p.completed).toBe(1);
  });
});
