import assert from "node:assert/strict";
import test from "node:test";

import {
  checkDeletedAccountRequestSchema,
  checkEmailRequestSchema,
  checkVerificationRequestSchema,
  cleanupTempUserRequestSchema,
  createVerificationTokenRequestSchema,
  deleteAndRecreateRequestSchema,
  markVerifiedRequestSchema,
  oauthCallbackQuerySchema,
  restoreAccountRequestSchema,
  restoreSessionRequestSchema,
} from "../lib/auth/auth-request-schemas.ts";

const validUserId = "550e8400-e29b-41d4-a716-446655440000";

test("create-verification-token request schema accepts matching userId and email", () => {
  const result = createVerificationTokenRequestSchema.safeParse({
    userId: validUserId,
    email: "user@example.com",
  });

  assert.equal(result.success, true);
});

test("create-verification-token request schema rejects invalid userId", () => {
  const result = createVerificationTokenRequestSchema.safeParse({
    userId: "not-a-uuid",
    email: "user@example.com",
  });

  assert.equal(result.success, false);
});

test("check-email request schema rejects missing email", () => {
  const result = checkEmailRequestSchema.safeParse({});

  assert.equal(result.success, false);
});

test("check-deleted-account request schema accepts email and optional ban flag", () => {
  const result = checkDeletedAccountRequestSchema.safeParse({
    email: "deleted@example.com",
    needBanCheck: true,
  });

  assert.equal(result.success, true);
});

test("restore-account request schema rejects blank restore token", () => {
  const result = restoreAccountRequestSchema.safeParse({
    restoreToken: "   ",
    email: "restore@example.com",
  });

  assert.equal(result.success, false);
});

test("check-verification request schema rejects missing token", () => {
  const result = checkVerificationRequestSchema.safeParse({});

  assert.equal(result.success, false);
});

test("cleanup-temp-user request schema rejects invalid email", () => {
  const result = cleanupTempUserRequestSchema.safeParse({
    email: "invalid-email",
  });

  assert.equal(result.success, false);
});

test("mark-verified request schema accepts uuid userId", () => {
  const result = markVerifiedRequestSchema.safeParse({
    userId: validUserId,
  });

  assert.equal(result.success, true);
});

test("delete-and-recreate request schema rejects missing restoreToken", () => {
  const result = deleteAndRecreateRequestSchema.safeParse({});

  assert.equal(result.success, false);
});

test("restore-session request schema accepts optional sessionKey uuid", () => {
  const result = restoreSessionRequestSchema.safeParse({
    sessionKey: validUserId,
  });

  assert.equal(result.success, true);
});

test("oauth callback query schema requires code and state", () => {
  const result = oauthCallbackQuerySchema.safeParse({
    code: "abc123",
    state: ["state-1"],
  });

  assert.equal(result.success, true);
});

test("oauth callback query schema rejects empty state list", () => {
  const result = oauthCallbackQuerySchema.safeParse({
    code: "abc123",
    state: [],
  });

  assert.equal(result.success, false);
});
