import { z } from "zod";

const trimmedNonEmptyString = z.string().trim().min(1);
const emailSchema = z.string().trim().email();
const uuidV4Regex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const uuidV4Schema = z.string().regex(uuidV4Regex, "유효한 UUID 형식이 아닙니다");

export const createVerificationTokenRequestSchema = z.object({
  userId: uuidV4Schema,
  email: emailSchema,
});

export const checkEmailRequestSchema = z.object({
  email: emailSchema,
});

export const cleanupTempUserRequestSchema = z.object({
  email: emailSchema,
});

export const checkDeletedAccountRequestSchema = z.object({
  email: emailSchema,
  needBanCheck: z.boolean().optional(),
});

export const restoreAccountRequestSchema = z.object({
  restoreToken: trimmedNonEmptyString,
  email: emailSchema,
});

export const checkVerificationRequestSchema = z.object({
  token: trimmedNonEmptyString,
});

export const markVerifiedRequestSchema = z.object({
  userId: uuidV4Schema,
});

export const deleteAndRecreateRequestSchema = z.object({
  restoreToken: trimmedNonEmptyString,
});

export const restoreSessionRequestSchema = z.object({
  sessionKey: uuidV4Schema.optional(),
});

export const oauthCallbackQuerySchema = z.object({
  code: trimmedNonEmptyString,
  state: z.array(trimmedNonEmptyString).min(1),
});
