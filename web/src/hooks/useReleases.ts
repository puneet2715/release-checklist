import { useCallback, useEffect, useRef, useState } from 'react';
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
const isAbort = (e: unknown) => (e as Error)?.name === 'AbortError';
const stepKey = (releaseId: string, stepId: string) => `${releaseId}:${stepId}`;

export function useReleases() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [steps, setSteps] = useState<StepDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Keys (`releaseId:stepId`) whose toggle is currently being saved → show a spinner.
  const [savingSteps, setSavingSteps] = useState<Set<string>>(new Set());

  // In-flight toggle requests keyed by `releaseId:stepId`, so a newer toggle can
  // abort/supersede an older one (prevents an out-of-order response from
  // reverting the checkbox) and so we can cancel everything on unmount.
  const toggleControllers = useRef<Map<string, AbortController>>(new Map());

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const [r, s] = await Promise.all([api.listReleases(signal), api.getSteps(signal)]);
      setReleases([...r].sort(byDate));
      setSteps(s);
      setError(null);
    } catch (e) {
      if (isAbort(e)) return;
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    void refresh(ctrl.signal);
    const controllers = toggleControllers.current;
    return () => {
      ctrl.abort();
      controllers.forEach((c) => c.abort());
      controllers.clear();
    };
  }, [refresh]);

  const setSaving = (key: string, on: boolean) =>
    setSavingSteps((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });

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
    const key = stepKey(id, stepId);

    // Supersede any in-flight toggle for the same step.
    toggleControllers.current.get(key)?.abort();
    const controller = new AbortController();
    toggleControllers.current.set(key, controller);

    // Optimistic — flip the checkbox instantly, before the network round trip.
    setReleases((prev) =>
      prev.map((r) =>
        r.id === id ? recompute({ ...r, steps: { ...r.steps, [stepId]: completed } }) : r,
      ),
    );
    setSaving(key, true);

    try {
      const server = await api.toggleStep(id, stepId, completed, controller.signal);
      // Apply ONLY this step from the server response, so we never clobber a
      // concurrent optimistic toggle of a different step on the same release.
      setReleases((prev) =>
        prev.map((r) =>
          r.id === id
            ? recompute({
                ...r,
                steps: { ...r.steps, [stepId]: server.steps[stepId] === true },
                updatedAt: server.updatedAt,
              })
            : r,
        ),
      );
    } catch (e) {
      if (isAbort(e)) return; // superseded by a newer toggle, or unmounted
      setError((e as Error).message);
      void refresh(); // reconcile with server truth on a real failure
    } finally {
      // Only clear if we're still the controller that owns this key (a newer
      // toggle may have taken over).
      if (toggleControllers.current.get(key) === controller) {
        toggleControllers.current.delete(key);
        setSaving(key, false);
      }
    }
  };

  const updateInfo = async (id: string, additionalInfo: string) => {
    upsert(await api.updateRelease(id, { additionalInfo }));
  };

  const remove = async (id: string) => {
    await api.deleteRelease(id);
    setReleases((prev) => prev.filter((p) => p.id !== id));
  };

  return {
    releases,
    steps,
    loading,
    error,
    setError,
    savingSteps,
    refresh,
    create,
    toggleStep,
    updateInfo,
    remove,
  };
}
