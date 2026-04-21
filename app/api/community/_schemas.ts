import { z } from "zod";

export const postPatchSchema = z.object({
  title: z.string().trim().min(1).max(300),
  body: z.string().trim().min(1).max(50000),
});

export const repostSchema = z.object({
  body: z.string().trim().max(50000).optional(),
});

export const commentCreateSchema = z.object({
  body: z.string().trim().min(1).max(5000),
  isAnonymous: z.boolean().optional(),
  anonymousNickname: z.string().trim().max(20).optional(),
  parentCommentId: z.string().trim().optional(),
});

export const commentPatchSchema = z.object({
  body: z.string().trim().min(1).max(5000),
});
