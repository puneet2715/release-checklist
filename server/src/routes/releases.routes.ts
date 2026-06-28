import { Router } from 'express';
import * as ctrl from '../controllers/releases.controller';
import { validateBody } from '../middleware/validate';
import {
  createReleaseSchema,
  toggleStepSchema,
  updateReleaseSchema,
} from '../schemas/release.schema';

export const releasesRouter = Router();

releasesRouter.get('/', ctrl.list);
releasesRouter.post('/', validateBody(createReleaseSchema), ctrl.create);
releasesRouter.get('/:id', ctrl.getOne);
releasesRouter.patch('/:id', validateBody(updateReleaseSchema), ctrl.update);
releasesRouter.patch('/:id/steps', validateBody(toggleStepSchema), ctrl.toggleStep);
releasesRouter.delete('/:id', ctrl.remove);
