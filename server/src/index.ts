import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';
import { cache } from './lib/cache';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`🚀 API listening on http://localhost:${env.PORT}  (${env.NODE_ENV})`);
});

// Graceful shutdown so in-flight requests finish and connections close cleanly.
async function shutdown(signal: string) {
  console.log(`\n${signal} received — shutting down…`);
  server.close(async () => {
    await prisma.$disconnect();
    await cache.quit();
    process.exit(0);
  });
  // Hard-exit safety net.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
