import type { RequestHandler } from 'express';
import * as service from '../services/releases.service';
import { STEP_DEFINITIONS, type StepId } from '../domain/steps';

/** GET /api/steps — the canonical checklist (labels for the UI). */
export const getSteps: RequestHandler = (_req, res) => {
  res.json({ data: STEP_DEFINITIONS });
};

/** GET /api/releases */
export const list: RequestHandler = async (_req, res, next) => {
  try {
    const { data, cacheHit } = await service.listReleases();
    res.set('X-Cache', cacheHit ? 'HIT' : 'MISS');
    res.json({ data });
  } catch (e) {
    next(e);
  }
};

/** GET /api/releases/:id */
export const getOne: RequestHandler = async (req, res, next) => {
  try {
    res.json({ data: await service.getRelease(req.params.id) });
  } catch (e) {
    next(e);
  }
};

/** POST /api/releases */
export const create: RequestHandler = async (req, res, next) => {
  try {
    res.status(201).json({ data: await service.createRelease(req.body) });
  } catch (e) {
    next(e);
  }
};

/** PATCH /api/releases/:id */
export const update: RequestHandler = async (req, res, next) => {
  try {
    res.json({ data: await service.updateRelease(req.params.id, req.body) });
  } catch (e) {
    next(e);
  }
};

/** PATCH /api/releases/:id/steps */
export const toggleStep: RequestHandler = async (req, res, next) => {
  try {
    const { stepId, completed } = req.body as { stepId: StepId; completed: boolean };
    res.json({ data: await service.toggleStep(req.params.id, stepId, completed) });
  } catch (e) {
    next(e);
  }
};

/** DELETE /api/releases/:id */
export const remove: RequestHandler = async (req, res, next) => {
  try {
    await service.deleteRelease(req.params.id);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
};
