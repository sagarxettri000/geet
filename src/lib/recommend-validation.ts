import { z } from "zod";

export const recommendationEventSchema = z.object({
  eventType: z.string().min(1).max(40),
  trackId: z.string().min(1).max(64).optional(),
  itemId: z.string().min(1).max(64).optional(),
  sessionId: z.string().min(1).max(100).optional(),
  position: z.number().int().min(0).max(24 * 3600).optional(),
  duration: z.number().int().min(0).max(24 * 3600).optional(),
  source: z.string().max(40).optional(),
  device: z.string().max(20).optional(),
  properties: z.string().max(2000).optional(),
});

export const recommendationEventsBatchSchema = z.array(recommendationEventSchema).min(1).max(200);