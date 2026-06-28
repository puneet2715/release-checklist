import { useMemo, useState } from 'react';
import { useReleases } from './hooks/useReleases';
import { StatusBadge } from './components/StatusBadge';
import { ReleaseDetail } from './components/ReleaseDetail';
import { CreateReleaseModal } from './components/CreateReleaseModal';
import { formatDate } from './utils/format';

export default function App() {
  const { releases, steps, loading, error, setError, create, toggleStep, updateInfo, remove } =
    useReleases();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const selected = useMemo(
    () => releases.find((r) => r.id === selectedId) ?? releases[0] ?? null,
    [releases, selectedId],
  );

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__brand">
          <span className="topbar__logo" aria-hidden>
            🚀
          </span>
          <div>
            <h1>Release Checklist</h1>
            <p className="topbar__subtitle">Track every step from code freeze to smoke test.</p>
          </div>
        </div>
        <button className="btn btn--primary" onClick={() => setCreating(true)}>
          + New release
        </button>
      </header>

      {error && (
        <div className="banner banner--error">
          <span>{error}</span>
          <button className="banner__close" onClick={() => setError(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      {loading ? (
        <p className="state">Loading releases…</p>
      ) : releases.length === 0 ? (
        <div className="state state--empty">
          <p>No releases yet.</p>
          <button className="btn btn--primary" onClick={() => setCreating(true)}>
            Create your first release
          </button>
        </div>
      ) : (
        <main className="layout">
          <aside className="list">
            {releases.map((r) => (
              <button
                key={r.id}
                className={`release-card${selected?.id === r.id ? ' is-active' : ''}`}
                onClick={() => setSelectedId(r.id)}
              >
                <div className="release-card__top">
                  <span className="release-card__name">{r.name}</span>
                  <StatusBadge status={r.status} />
                </div>
                <div className="release-card__meta">
                  <span>📅 {formatDate(r.releaseDate)}</span>
                  <span className="release-card__count">
                    {r.completedCount}/{r.totalSteps}
                  </span>
                </div>
              </button>
            ))}
          </aside>

          {selected ? (
            <ReleaseDetail
              release={selected}
              steps={steps}
              onToggle={(stepId, completed) => void toggleStep(selected.id, stepId, completed)}
              onSaveInfo={(info) => updateInfo(selected.id, info)}
              onDelete={() => remove(selected.id)}
            />
          ) : (
            <section className="detail detail--empty">Select a release to see its checklist.</section>
          )}
        </main>
      )}

      {creating && <CreateReleaseModal onClose={() => setCreating(false)} onCreate={create} />}
    </div>
  );
}
