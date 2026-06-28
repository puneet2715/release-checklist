// ─── The canonical release checklist ────────────────────────────────────────
// Steps are the same for every release and defined here in code (not the DB),
// exactly as the spec allows. Each release only stores WHICH steps are done.
// To change the checklist, edit this list — existing releases adapt safely via
// normalizeSteps() below.

export const STEP_DEFINITIONS = [
  { id: 'code_freeze', label: 'Code freeze' },
  { id: 'unit_tests', label: 'Unit & integration tests passing' },
  { id: 'qa_signoff', label: 'QA sign-off' },
  { id: 'staging_deploy', label: 'Deployed to staging' },
  { id: 'release_notes', label: 'Release notes written' },
  { id: 'stakeholder_approval', label: 'Stakeholder approval' },
  { id: 'prod_deploy', label: 'Deployed to production' },
  { id: 'smoke_test', label: 'Post-deploy smoke test' },
] as const;

export type StepId = (typeof STEP_DEFINITIONS)[number]['id'];
export const STEP_IDS: StepId[] = STEP_DEFINITIONS.map((s) => s.id);

export type StepState = Record<StepId, boolean>;
export type ReleaseStatus = 'planned' | 'ongoing' | 'done';

/** A fresh release: every step off. */
export function defaultSteps(): StepState {
  return Object.fromEntries(STEP_IDS.map((id) => [id, false])) as StepState;
}

/**
 * Coerce whatever is stored in the DB into a complete, well-typed StepState.
 * Unknown/missing keys default to false and keys no longer in the checklist are
 * dropped — so adding or removing a step never breaks existing rows.
 */
export function normalizeSteps(stored: unknown): StepState {
  const map = stored && typeof stored === 'object' ? (stored as Record<string, unknown>) : {};
  return Object.fromEntries(STEP_IDS.map((id) => [id, map[id] === true])) as StepState;
}

export function countCompleted(steps: StepState): number {
  return STEP_IDS.reduce((n, id) => n + (steps[id] ? 1 : 0), 0);
}

/**
 * Status is DERIVED, never user-chosen:
 *   0 steps done            -> planned
 *   all steps done          -> done
 *   anything in between      -> ongoing
 */
export function computeStatus(steps: StepState): ReleaseStatus {
  const completed = countCompleted(steps);
  if (completed === 0) return 'planned';
  if (completed === STEP_IDS.length) return 'done';
  return 'ongoing';
}
