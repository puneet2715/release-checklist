import type { CreateReleaseInput, Release, StepDefinition } from '../types';

// Empty base = same origin (dev proxy / docker nginx). On Render, set
// VITE_API_URL to the API service URL at build time.
const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error?.message ?? `Request failed (${res.status})`);
  }
  return body.data as T;
}

export const api = {
  getSteps: () => http<StepDefinition[]>('/api/steps'),

  listReleases: () => http<Release[]>('/api/releases'),

  createRelease: (input: CreateReleaseInput) =>
    http<Release>('/api/releases', { method: 'POST', body: JSON.stringify(input) }),

  updateRelease: (
    id: string,
    input: Partial<Pick<Release, 'name' | 'releaseDate' | 'additionalInfo'>>,
  ) => http<Release>(`/api/releases/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),

  toggleStep: (id: string, stepId: string, completed: boolean) =>
    http<Release>(`/api/releases/${id}/steps`, {
      method: 'PATCH',
      body: JSON.stringify({ stepId, completed }),
    }),

  deleteRelease: (id: string) => http<void>(`/api/releases/${id}`, { method: 'DELETE' }),
};
