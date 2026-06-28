import Redis from 'ioredis';
import { env } from '../config/env';

// Redis is an OPTIONAL accelerator. If REDIS_URL is unset or the server is
// unreachable, every method below becomes a safe no-op and the app falls back
// to the database. This means a Redis outage degrades performance, never
// correctness — important for a service meant to scale.

let client: Redis | null = null;
let healthy = false;
let loggedError = false;

if (env.REDIS_URL) {
  try {
    client = new Redis(env.REDIS_URL, {
      // Fail fast instead of hanging when Redis is down.
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 3000,
      retryStrategy: (times) => Math.min(times * 200, 2000),
    });

    client.on('ready', () => {
      healthy = true;
      loggedError = false;
      console.log('✅ Redis connected — release list caching enabled');
    });
    client.on('end', () => {
      healthy = false;
    });
    client.on('error', (err) => {
      healthy = false;
      if (!loggedError) {
        console.warn(`⚠️  Redis unavailable, serving without cache: ${err.message}`);
        loggedError = true;
      }
    });
  } catch (err) {
    // A malformed REDIS_URL must NEVER take down the API. ioredis throws
    // synchronously on an invalid URL, so we swallow it and disable caching —
    // the app keeps serving from the database.
    client = null;
    healthy = false;
    console.warn(
      `⚠️  Invalid REDIS_URL — caching disabled, serving from the database: ${(err as Error).message}`,
    );
  }
}

export const cache = {
  status() {
    return { enabled: Boolean(client), healthy };
  },

  async get<T>(key: string): Promise<T | null> {
    if (!client || !healthy) return null;
    try {
      const raw = await client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!client || !healthy || ttlSeconds <= 0) return;
    try {
      await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      /* ignore — cache writes are best-effort */
    }
  },

  async del(...keys: string[]): Promise<void> {
    if (!client || !healthy || keys.length === 0) return;
    try {
      await client.del(...keys);
    } catch {
      /* ignore */
    }
  },

  async quit(): Promise<void> {
    if (!client) return;
    try {
      await client.quit();
    } catch {
      /* ignore */
    }
  },
};
