import { useState, type FormEvent } from 'react';
import type { CreateReleaseInput } from '../types';
import { toDateTimeLocal } from '../utils/format';

interface Props {
  onClose: () => void;
  onCreate: (input: CreateReleaseInput) => Promise<unknown>;
}

export function CreateReleaseModal({ onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [releaseDate, setReleaseDate] = useState(toDateTimeLocal());
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onCreate({
        name: name.trim(),
        releaseDate: new Date(releaseDate).toISOString(),
        additionalInfo: additionalInfo.trim() || null,
      });
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h2 className="modal__title">New release</h2>
        <form onSubmit={submit} className="form">
          <label className="field">
            <span>Name *</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. v2.4.0 — Billing revamp"
              maxLength={200}
              autoFocus
            />
          </label>
          <label className="field">
            <span>Release date *</span>
            <input
              type="datetime-local"
              value={releaseDate}
              onChange={(e) => setReleaseDate(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Additional info</span>
            <textarea
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              rows={3}
              placeholder="Optional notes, links, rollback plan…"
              maxLength={5000}
            />
          </label>
          {error && <p className="form__error">{error}</p>}
          <div className="form__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create release'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
