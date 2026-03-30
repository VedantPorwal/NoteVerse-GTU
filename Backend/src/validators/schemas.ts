import { z } from 'zod';
import { MAX_SEMESTER, MIN_SEMESTER, DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } from '../constants.js';

const idParam = z.coerce.number().int().positive();

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const subjectCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  code: z.string().trim().max(32).optional().nullable(),
});

export const subjectUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  code: z.string().trim().max(32).optional().nullable(),
});

export const branchCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  code: z.string().trim().max(32).optional().nullable(),
});

export const branchUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  code: z.string().trim().max(32).optional().nullable(),
});

const semesterSchema = z.coerce.number().int().min(MIN_SEMESTER).max(MAX_SEMESTER);

export const noteListQuerySchema = z.object({
  subjectId: z.coerce.number().int().positive().optional(),
  branchId: z.coerce.number().int().positive().optional(),
  semester: z.coerce.number().int().min(MIN_SEMESTER).max(MAX_SEMESTER).optional(),
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_LIMIT)
    .default(DEFAULT_LIMIT),
  q: z.string().trim().max(200).optional(),
  sort: z.enum(['newest', 'oldest', 'title']).default('newest'),
});

export const noteIdParamSchema = z.object({
  id: idParam,
});

/** Multipart text fields for create */
export const noteCreateFieldsSchema = z.object({
  title: z.string().trim().min(1).max(500),
  description: z.string().trim().max(5000).optional().nullable(),
  subjectId: z.coerce.number().int().positive(),
  branchId: z.coerce.number().int().positive(),
  semester: semesterSchema,
});

export const noteUpdateFieldsSchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  description: z.string().trim().max(5000).optional().nullable(),
  subjectId: z.coerce.number().int().positive().optional(),
  branchId: z.coerce.number().int().positive().optional(),
  semester: semesterSchema.optional(),
});

export const idOnlyParamSchema = z.object({
  id: idParam,
});
