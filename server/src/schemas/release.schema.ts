import { z } from 'zod';
import { STEP_IDS, type StepId } from '../domain/steps';

export const createReleaseSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  // Accepts ISO strings and datetime-local values ("2026-06-28T11:00").
  releaseDate: z.coerce.date({
    errorMap: () => ({ message: 'A valid release date is required' }),
  }),
  additionalInfo: z
    .string()
    .max(5000)
    .nullish()
    .transform((v) => v ?? null),
});

export const updateReleaseSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    releaseDate: z.coerce.date().optional(),
    additionalInfo: z.string().max(5000).nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'Provide at least one field to update',
  });

export const toggleStepSchema = z.object({
  stepId: z.enum(STEP_IDS as [StepId, ...StepId[]]),
  completed: z.boolean(),
});

export type CreateReleaseInput = z.infer<typeof createReleaseSchema>;
export type UpdateReleaseInput = z.infer<typeof updateReleaseSchema>;
export type ToggleStepInput = z.infer<typeof toggleStepSchema>;
