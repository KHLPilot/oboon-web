import { z } from "zod";

const uuidV4Regex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const uuidV4Schema = z.string().regex(uuidV4Regex, "유효한 UUID 형식이 아닙니다");
const trimmedString = z.string().trim();

export const bankAccountRequestSchema = z.object({
  bank_name: trimmedString.min(1).max(100),
  bank_account_number: trimmedString.min(1).max(64),
  bank_account_holder: trimmedString.min(1).max(100),
});

export const checkNicknameRequestSchema = z.object({
  nickname: trimmedString.min(1).max(20).regex(
    /^[가-힣a-zA-Z0-9._-]+$/,
    "닉네임에는 한글, 영문, 숫자, . _ - 만 사용할 수 있습니다",
  ),
});

export const deleteAccountRequestSchema = z.object({
  userId: uuidV4Schema,
});

export const galleryGetRequestSchema = z.object({
  userId: uuidV4Schema.optional(),
});

export const galleryUploadFileSchema = z.object({
  name: trimmedString.min(1).max(255),
  type: z.enum(["image/jpeg", "image/png", "image/webp"]),
  size: z.number().int().positive().max(5 * 1024 * 1024),
});

export const galleryUploadRequestSchema = z.object({
  files: z.array(galleryUploadFileSchema).min(1).max(5),
});

export const galleryUpdateItemSchema = z.object({
  id: uuidV4Schema,
  sort_order: z.number().int().min(0).max(999),
  caption: trimmedString.max(200).nullable().optional(),
});

export const galleryUpdateRequestSchema = z.object({
  updates: z.array(galleryUpdateItemSchema).min(1).max(5),
});

export const galleryDeleteRequestSchema = z.object({
  ids: z.array(uuidV4Schema).min(1).max(5),
});
