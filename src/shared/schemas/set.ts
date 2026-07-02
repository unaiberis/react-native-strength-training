import { z } from 'zod';

export const setEntrySchema = z.object({
  setNumber: z.number().int().min(1),
  weightKg: z.number().min(0).max(9999.99).default(0),
  reps: z.number().int().min(0).max(999).default(1),
  rpe: z.number().min(1).max(10).multipleOf(0.5).optional().nullable(),
  rir: z.number().int().min(0).max(10).optional().nullable(),
  isWarmup: z.boolean().default(false),
  tempo: z
    .string()
    .regex(/^\d{3,4}$/)
    .optional()
    .nullable(),
});

export const logSetSchema = z.object({
  workoutSessionId: z.string().uuid(),
  exerciseId: z.string().uuid(),
  setNumber: z.number().int().min(1),
  weightKg: z.number().min(0).max(9999.99),
  reps: z.number().int().min(0).max(999),
  rpe: z.number().min(1).max(10).multipleOf(0.5).optional().nullable(),
  rir: z.number().int().min(0).max(10).optional().nullable(),
  isWarmup: z.boolean().default(false),
  tempo: z
    .string()
    .regex(/^\d{3,4}$/)
    .optional()
    .nullable(),
});

export const completeSessionSchema = z.object({
  sessionId: z.string().uuid(),
  notes: z.string().max(2000).optional().nullable(),
});

export type SetEntry = z.infer<typeof setEntrySchema>;
export type LogSetInput = z.infer<typeof logSetSchema>;
export type CompleteSessionInput = z.infer<typeof completeSessionSchema>;

export const setEntryDefaults: SetEntry = {
  setNumber: 1,
  weightKg: 0,
  reps: 1,
  rpe: null,
  rir: null,
  isWarmup: false,
  tempo: null,
};
