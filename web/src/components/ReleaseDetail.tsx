import { useEffect, useState } from 'react';
import type { Release, StepDefinition } from '../types';
import { StatusBadge } from './StatusBadge';
import { StepChecklist } from './StepChecklist';
import { formatDate } from '../utils/format';

interface Props {
  release: Release;
  steps: StepDefinition[];
  savingSteps: Set<string>;
  onToggle: (stepId: string, completed: boolean) => void;
  onSaveInfo: (info: string) => Promise<void>;
  onDelete: () => Promise<void> | void;
}

export function ReleaseDetail({
  release,
  steps,
  savingSteps,
  onToggle,
  onSaveInfo,
  onDelete,
}: Props) {
  const [info, setInfo] = useState(release.additionalInfo ?? '');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Re-sync local edits when a different release is selected.
  useEffect(() => {
    setInfo(release.additionalInfo ?? '');
    setConfirmDelete(false);
  }, [release.id, release.additionalInfo]);

  const dirty = info !== (release.additionalInfo ?? '');
  const pct = Math.round((release.completedCount / release.totalSteps) * 100);

  async function save() {
    setSaving(true);
    try {
      await onSaveInfo(info);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="detail">
      <header className="detail__header">
        <div>
          <h2 className="detail__title">{release.name}</h2>
          <p className="detail__date">📅 {formatDate(release.releaseDate)}</p>
        </div>
        <StatusBadge status={release.status} />
      </header>

      <div className="detail__progress">
        <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="progress__bar" style={{ width: `${pct}%` }} />
        </div>
        <span className="detail__progress-label">
          {release.completedCount} / {release.totalSteps} steps
        </span>
      </div>

      <h3 className="detail__subtitle">Checklist</h3>
      <StepChecklist steps={steps} release={release} savingSteps={savingSteps} onToggle={onToggle} />

      <h3 className="detail__subtitle">Additional information</h3>
      <textarea
        className="detail__info"
        rows={4}
        value={info}
        onChange={(e) => setInfo(e.target.value)}
        placeholder="Notes, links, rollback plan…"
        maxLength={5000}
      />

      <div className="detail__actions">
        {confirmDelete ? (
          <div className="confirm">
            <span>Delete this release?</span>
            <button className="btn btn--danger" onClick={() => void onDelete()}>
              Yes, delete
            </button>
            <button className="btn btn--ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="btn btn--danger-outline" onClick={() => setConfirmDelete(true)}>
            Delete release
          </button>
        )}
        <button className="btn btn--primary" disabled={!dirty || saving} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save info'}
        </button>
      </div>
    </section>
  );
}
