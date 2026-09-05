import { z } from "zod";

export const emailSchema = z.string().email().max(190);
export const passwordSchema = z.string().min(8).max(128);
export const displayNameSchema = z.string().trim().min(1).max(40);

export const signUpSchema = z.object({
  name: displayNameSchema.optional(),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const playlistCreateSchema = z.object({
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(280).optional().nullable(),
  isPublic: z.boolean().optional().default(true),
  coverUrl: z.string().url().optional().nullable(),
});

export const playlistUpdateSchema = playlistCreateSchema.partial();

export const trackIntakeSchema = z.object({
  url: z.string().trim().min(5).max(500),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
});

export const historySchema = z.object({
  trackId: z.string().min(1).max(64),
  progressSec: z.number().min(0).max(24 * 3600).optional().nullable(),
  completion: z.number().min(0).max(100).optional().nullable(),
  source: z.string().max(40).optional().nullable(),
});

export const youtubePasteSchema = z.object({
  input: z.string().trim().min(5).max(500),
});