import type { Release, StepDefinition } from '../types';

interface Props {
  steps: StepDefinition[];
  release: Release;
  /** Keys (`releaseId:stepId`) whose toggle is currently saving. */
  savingSteps: Set<string>;
  onToggle: (stepId: string, completed: boolean) => void;
}

export function StepChecklist({ steps, release, savingSteps, onToggle }: Props) {
  return (
    <ul className="checklist">
      {steps.map((step) => {
        const checked = release.steps[step.id] === true;
        const saving = savingSteps.has(`${release.id}:${step.id}`);
        return (
          <li key={step.id} className={`checklist__item${checked ? ' is-checked' : ''}`}>
            <label>
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onToggle(step.id, e.target.checked)}
              />
              <span className="checklist__label">{step.label}</span>
              {saving && <span className="checklist__spinner" role="status" aria-label="Saving" />}
            </label>
          </li>
        );
      })}
    </ul>
  );
}
