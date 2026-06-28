import type { Release } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { cache } from '../lib/cache';
import { env } from '../config/env';
import {
  computeStatus,
  countCompleted,
  defaultSteps,
  normalizeSteps,
  STEP_DEFINITIONS,
  type StepId,
} from '../domain/steps';
import type { ReleaseDTO } from '../types';
import type { CreateReleaseInput, UpdateReleaseInput } from '../schemas/release.schema';
import { AppError } from '../middleware/error';

const LIST_CACHE_KEY = 'releases:list:v1';

function toDTO(r: Release): ReleaseDTO {
  const steps = normalizeSteps(r.steps);
  return {
    id: r.id,
    name: r.name,
    releaseDate: r.releaseDate.toISOString(),
    additionalInfo: r.additionalInfo,
    steps,
    status: computeStatus(steps),
    completedCount: countCompleted(steps),
    totalSteps: STEP_DEFINITIONS.length,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

function invalidateListCache(): Promise<void> {
  return cache.del(LIST_CACHE_KEY);
}

export async function listReleases(): Promise<{ data: ReleaseDTO[]; cacheHit: boolean }> {
  const cached = await cache.get<ReleaseDTO[]>(LIST_CACHE_KEY);
  if (cached) return { data: cached, cacheHit: true };

  const rows = await prisma.release.findMany({ orderBy: { releaseDate: 'asc' } });
  const data = rows.map(toDTO);
  await cache.set(LIST_CACHE_KEY, data, env.CACHE_TTL_SECONDS);
  return { data, cacheHit: false };
}

export async function getRelease(id: string): Promise<ReleaseDTO> {
  const row = await prisma.release.findUnique({ where: { id } });
  if (!row) throw new AppError(404, 'Release not found');
  return toDTO(row);
}

export async function createRelease(input: CreateReleaseInput): Promise<ReleaseDTO> {
  const row = await prisma.release.create({
    data: {
      name: input.name,
      releaseDate: input.releaseDate,
      additionalInfo: input.additionalInfo ?? null,
      steps: defaultSteps(),
    },
  });
  await invalidateListCache();
  return toDTO(row);
}

export async function updateRelease(id: string, input: UpdateReleaseInput): Promise<ReleaseDTO> {
  const row = await prisma.release.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.releaseDate !== undefined && { releaseDate: input.releaseDate }),
      ...(input.additionalInfo !== undefined && { additionalInfo: input.additionalInfo }),
    },
  });
  await invalidateListCache();
  return toDTO(row);
}

export async function toggleStep(
  id: string,
  stepId: StepId,
  completed: boolean,
): Promise<ReleaseDTO> {
  // Read-modify-write in a transaction so concurrent toggles can't clobber
  // each other (last-writer-wins on the whole JSON blob would lose updates).
  const updated = await prisma.$transaction(async (tx) => {
    const current = await tx.release.findUnique({ where: { id } });
    if (!current) throw new AppError(404, 'Release not found');
    const steps = normalizeSteps(current.steps);
    steps[stepId] = completed;
    return tx.release.update({ where: { id }, data: { steps } });
  });
  await invalidateListCache();
  return toDTO(updated);
}

export async function deleteRelease(id: string): Promise<void> {
  await prisma.release.delete({ where: { id } });
  await invalidateListCache();
}
