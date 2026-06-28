import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { corsOrigins, env } from './config/env';
import { releasesRouter } from './routes/releases.routes';
import { getSteps } from './controllers/releases.controller';
import { cache } from './lib/cache';
import { errorHandler, notFound } from './middleware/error';

/** Build the Express app. Exported (not auto-started) so tests can mount it. */
export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: corsOrigins }));
  app.use(express.json({ limit: '64kb' }));
  if (env.NODE_ENV !== 'test') app.use(morgan('tiny'));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', cache: cache.status() });
  });
  app.get('/api/steps', getSteps);
  app.use('/api/releases', releasesRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
