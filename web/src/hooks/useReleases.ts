import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { CreateReleaseInput, Release, ReleaseStatus, StepDefinition } from '../types';

/** Mirror of the server's status rule, for instant optimistic UI feedback. */
function recompute(r: Release): Release {
  const completedCount = Object.values(r.steps).filter(Boolean).length;
  const status: ReleaseStatus =
    completedCount === 0 ? 'planned' : completedCount === r.totalSteps ? 'done' : 'ongoing';
  return { ...r, completedCount, status };
}

const byDate = (a: Release, b: Release) => a.releaseDate.localeCompare(b.releaseDate);

export function useReleases() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [steps, setSteps] = useState<StepDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [r, s] = await Promise.all([api.listReleases(), api.getSteps()]);
      setReleases([...r].sort(byDate));
      setSteps(s);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const upsert = (rel: Release) =>
    setReleases((prev) =>
      (prev.some((p) => p.id === rel.id)
        ? prev.map((p) => (p.id === rel.id ? rel : p))
        : [...prev, rel]
      ).sort(byDate),
    );

  const create = async (input: CreateReleaseInput) => {
    const rel = await api.createRelease(input);
    upsert(rel);
    return rel;
  };

  const toggleStep = async (id: string, stepId: string, completed: boolean) => {
    // Optimistic: update locally first so the checkbox feels instant.
    setReleases((prev) =>
      prev.map((r) => (r.id === id ? recompute({ ...r, steps: { ...r.steps, [stepId]: completed } }) : r)),
    );
    try {
      upsert(await api.toggleStep(id, stepId, completed));
    } catch (e) {
      setError((e as Error).message);
      void refresh(); // reconcile with server truth on failure
    }
  };

  const updateInfo = async (id: string, additionalInfo: string) => {
    upsert(await api.updateRelease(id, { additionalInfo }));
  };

  const remove = async (id: string) => {
    await api.deleteRelease(id);
    setReleases((prev) => prev.filter((p) => p.id !== id));
  };

  return { releases, steps, loading, error, setError, refresh, create, toggleStep, updateInfo, remove };
}
