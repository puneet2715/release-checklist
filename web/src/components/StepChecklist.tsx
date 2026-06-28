import type { Release, StepDefinition } from '../types';

interface Props {
  steps: StepDefinition[];
  release: Release;
  onToggle: (stepId: string, completed: boolean) => void;
}

export function StepChecklist({ steps, release, onToggle }: Props) {
  return (
    <ul className="checklist">
      {steps.map((step) => {
        const checked = release.steps[step.id] === true;
        return (
          <li key={step.id} className={`checklist__item${checked ? ' is-checked' : ''}`}>
            <label>
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onToggle(step.id, e.target.checked)}
              />
              <span className="checklist__label">{step.label}</span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
