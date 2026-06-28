import { describe, expect, it } from 'vitest';
import {
  computeStatus,
  countCompleted,
  defaultSteps,
  normalizeSteps,
  STEP_IDS,
} from '../src/domain/steps';

describe('defaultSteps', () => {
  it('contains every canonical step, all switched off', () => {
    const s = defaultSteps();
    expect(Object.keys(s).sort()).toEqual([...STEP_IDS].sort());
    expect(Object.values(s).every((v) => v === false)).toBe(true);
  });
});

describe('computeStatus — the core spec rule', () => {
  it('is "planned" when no step is completed', () => {
    expect(computeStatus(defaultSteps())).toBe('planned');
  });

  it('is "ongoing" when at least one (but not all) steps are completed', () => {
    const s = defaultSteps();
    s[STEP_IDS[0]] = true;
    expect(computeStatus(s)).toBe('ongoing');
  });

  it('is "done" only when every step is completed', () => {
    const s = defaultSteps();
    STEP_IDS.forEach((id) => (s[id] = true));
    expect(computeStatus(s)).toBe('done');

    // flipping a single one back off downgrades it to ongoing
    s[STEP_IDS[0]] = false;
    expect(computeStatus(s)).toBe('ongoing');
  });
});

describe('normalizeSteps — resilience to bad/stale data', () => {
  it('fills missing keys with false and drops unknown keys', () => {
    const s = normalizeSteps({ [STEP_IDS[0]]: true, bogus_step: true });
    expect(s[STEP_IDS[0]]).toBe(true);
    expect((s as Record<string, unknown>).bogus_step).toBeUndefined();
    expect(countCompleted(s)).toBe(1);
  });

  it('treats null / garbage / non-objects as all-off', () => {
    expect(computeStatus(normalizeSteps(null))).toBe('planned');
    expect(computeStatus(normalizeSteps('nope'))).toBe('planned');
    expect(computeStatus(normalizeSteps(42))).toBe('planned');
  });

  it('coerces truthy-but-not-true values to false (only strict true counts)', () => {
    const s = normalizeSteps({ [STEP_IDS[0]]: 'yes', [STEP_IDS[1]]: 1 });
    expect(countCompleted(s)).toBe(0);
  });
});
