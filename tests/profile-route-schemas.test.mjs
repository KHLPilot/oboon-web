import assert from "node:assert/strict";
import test from "node:test";

import {
  bankAccountRequestSchema,
  checkNicknameRequestSchema,
  deleteAccountRequestSchema,
  galleryDeleteRequestSchema,
  galleryGetRequestSchema,
  galleryUploadRequestSchema,
} from "../app/api/profile/_schemas.ts";

const validUserId = "550e8400-e29b-41d4-a716-446655440000";

test("bank-account schema accepts trimmed bank details", () => {
  const result = bankAccountRequestSchema.safeParse({
    bank_name: "  국민은행 ",
    bank_account_number: " 123-456-789 ",
    bank_account_holder: " 홍길동 ",
  });

  assert.equal(result.success, true);
});

test("bank-account schema rejects empty bank_name", () => {
  const result = bankAccountRequestSchema.safeParse({
    bank_name: " ",
    bank_account_number: "123",
    bank_account_holder: "홍길동",
  });

  assert.equal(result.success, false);
});

test("gallery upload schema rejects empty file list", () => {
  const result = galleryUploadRequestSchema.safeParse({
    files: [],
  });

  assert.equal(result.success, false);
});

test("gallery upload schema rejects too many files", () => {
  const result = galleryUploadRequestSchema.safeParse({
    files: new Array(6).fill(null).map((_, index) => ({
      name: `image-${index}.png`,
      type: "image/png",
      size: 1024,
    })),
  });

  assert.equal(result.success, false);
});

test("gallery delete schema rejects invalid uuid rows", () => {
  const result = galleryDeleteRequestSchema.safeParse({
    deleteIds: ["not-a-uuid"],
  });

  assert.equal(result.success, false);
});

test("gallery get schema accepts optional uuid userId", () => {
  const result = galleryGetRequestSchema.safeParse({
    userId: validUserId,
  });

  assert.equal(result.success, true);
});

test("check-nickname schema trims and limits nickname", () => {
  const result = checkNicknameRequestSchema.safeParse({
    nickname: "  user_name  ",
  });

  assert.equal(result.success, true);
});

test("check-nickname schema rejects whitespace-only nickname", () => {
  const result = checkNicknameRequestSchema.safeParse({
    nickname: "   ",
  });

  assert.equal(result.success, false);
});

test("delete-account schema rejects missing userId", () => {
  const result = deleteAccountRequestSchema.safeParse({});

  assert.equal(result.success, false);
});

test("delete-account schema accepts uuid userId", () => {
  const result = deleteAccountRequestSchema.safeParse({
    userId: validUserId,
  });

  assert.equal(result.success, true);
});
