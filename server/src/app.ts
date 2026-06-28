import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createYoga } from 'graphql-yoga';
import { corsOrigins, env } from './config/env';
import { releasesRouter } from './routes/releases.routes';
import { getSteps } from './controllers/releases.controller';
import { cache } from './lib/cache';
import { errorHandler, notFound } from './middleware/error';
import { schema } from './graphql/schema';

/** Build the Express app. Exported (not auto-started) so tests can mount it. */
export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  // CSP disabled so the GraphiQL explorer can load its assets. This is an API
  // server; the SPA is served separately (Render static site) with its own headers.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: corsOrigins }));

  // Parse JSON for REST, but NOT for /graphql — GraphQL Yoga reads the raw body.
  app.use((req, res, next) => {
    if (req.path.startsWith('/graphql')) return next();
    return express.json({ limit: '64kb' })(req, res, next);
  });
  if (env.NODE_ENV !== 'test') app.use(morgan('tiny'));

  // ── GraphQL API (same service layer as REST; GraphiQL UI at /graphql) ──
  const yoga = createYoga({ schema, graphqlEndpoint: '/graphql', cors: false });
  app.use(yoga.graphqlEndpoint, yoga);

  // ── REST API ──
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', cache: cache.status() });
  });
  app.get('/api/steps', getSteps);
  app.use('/api/releases', releasesRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
