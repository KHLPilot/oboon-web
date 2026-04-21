import assert from "node:assert/strict";
import test from "node:test";

import {
  consultationCreateRequestSchema,
  consultationListQuerySchema,
  consultationPatchRequestSchema,
  consultationSettlementActionSchema,
} from "../app/api/consultations/_schemas.ts";

const validUserId = "550e8400-e29b-41d4-a716-446655440000";

test("consultation create schema accepts reservation payload", () => {
  const result = consultationCreateRequestSchema.safeParse({
    agent_id: validUserId,
    property_id: 123,
    scheduled_at: "2026-04-20T10:00:00+09:00",
    agreed_to_terms: true,
  });

  assert.equal(result.success, true);
});

test("consultation create schema rejects false agreed_to_terms", () => {
  const result = consultationCreateRequestSchema.safeParse({
    agent_id: validUserId,
    property_id: 123,
    scheduled_at: "2026-04-20T10:00:00+09:00",
    agreed_to_terms: false,
  });

  assert.equal(result.success, false);
});

test("consultation list schema rejects unknown status", () => {
  const result = consultationListQuerySchema.safeParse({
    status: "done",
  });

  assert.equal(result.success, false);
});

test("consultation list schema accepts role and status filters", () => {
  const result = consultationListQuerySchema.safeParse({
    role: "admin",
    status: "confirmed",
  });

  assert.equal(result.success, true);
});

test("consultation patch schema rejects invalid status", () => {
  const result = consultationPatchRequestSchema.safeParse({
    status: "done",
  });

  assert.equal(result.success, false);
});

test("consultation patch schema accepts admin rejection payload", () => {
  const result = consultationPatchRequestSchema.safeParse({
    status: "cancelled",
    rejection_reason: "사유",
  });

  assert.equal(result.success, true);
});

test("consultation settlement schema rejects invalid id", () => {
  const result = consultationSettlementActionSchema.safeParse({
    id: "invalid",
  });

  assert.equal(result.success, false);
});

test("consultation settlement schema accepts uuid id", () => {
  const result = consultationSettlementActionSchema.safeParse({
    id: validUserId,
  });

  assert.equal(result.success, true);
});
