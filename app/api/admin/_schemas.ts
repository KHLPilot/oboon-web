import { z } from "zod";
import { uuidV4Schema } from "@/lib/api/route-security";

export const adminApproveAgentRequestSchema = z.object({
  userId: uuidV4Schema,
});

export const adminNoticeCategorySchema = z.enum([
  "update",
  "service",
  "event",
  "maintenance",
]);

export const adminNoticeCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().max(500).default(""),
  content: z.string().trim().min(1).max(50000),
  category: adminNoticeCategorySchema,
  isPinned: z.boolean().optional(),
  isMaintenance: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  publishedAt: z.string().trim().max(32).optional(),
});

export const adminNoticeUpdateSchema = adminNoticeCreateSchema.extend({
  id: z.number().int().positive(),
});

export const adminNoticeDeleteQuerySchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const adminAppraisalsNearbyQuerySchema = z.object({
  lat: z.coerce.number().finite().min(-90).max(90),
  lng: z.coerce.number().finite().min(-180).max(180),
  radius: z.coerce.number().int().min(50).max(20_000).optional(),
  limit: z.coerce.number().int().min(1).max(60).optional(),
  types: z.string().trim().max(50).optional(),
});

export const adminRecoPoisRunQuerySchema = z.object({
  chunk: z.coerce.number().int().min(1).max(1_000).optional(),
  topN: z.coerce.number().int().min(1).max(20).optional(),
  radius: z.coerce.number().int().min(50).max(20_000).optional(),
  concurrency: z.coerce.number().int().min(1).max(20).optional(),
});
