import type { RequestHandler } from 'express';
import type { ZodSchema } from 'zod';

/** Validate & coerce req.body against a Zod schema, or forward a ZodError. */
export const validateBody =
  (schema: ZodSchema): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(result.error);
      return;
    }
    req.body = result.data;
    next();
  };
