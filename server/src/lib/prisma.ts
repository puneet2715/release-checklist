import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

// A single shared client. Prisma pools connections internally, which is what
// lets a single API instance serve many concurrent requests efficiently.
export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});
