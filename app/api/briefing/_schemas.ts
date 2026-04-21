import { z } from "zod";

export const briefingCommentCreateSchema = z.object({
  content: z.string().trim().min(1).max(5000),
  nickname: z.string().trim().max(20).optional(),
  isAnonymous: z.boolean().optional(),
});

export const editorProfilePatchSchema = z.object({
  nickname: z.string().trim().max(50).optional(),
  bio: z.string().trim().max(500).optional(),
  avatar_url: z.string().trim().url().optional().or(z.literal("")),
});

export const editorCoverPatchSchema = z.object({
  type: z.enum(["board", "category"]),
  id: z.string().trim().min(1),
  cover_image_url: z.string().trim().min(1),
});
