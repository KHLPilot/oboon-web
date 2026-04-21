import { z } from "zod";

const uuidV4Regex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const uuidV4Schema = z.string().regex(uuidV4Regex, "유효한 UUID 형식이 아닙니다");
const trimmedString = z.string().trim();

export const consultationIdSchema = uuidV4Schema;

export const consultationRoleSchema = z.enum(["admin", "agent", "customer"]);

export const consultationStatusSchema = z.enum([
  "requested",
  "pending",
  "confirmed",
  "visited",
  "contracted",
  "cancelled",
  "no_show",
]);

export const consultationCreateRequestSchema = z.object({
  agent_id: uuidV4Schema,
  property_id: z.number().int().positive(),
  scheduled_at: z.string().datetime({ offset: true }),
  agreed_to_terms: z.literal(true),
});

export const consultationListQuerySchema = z.object({
  status: consultationStatusSchema.optional(),
  role: consultationRoleSchema.optional(),
});

export const consultationPatchRequestSchema = z.object({
  status: consultationStatusSchema,
  agreed_to_terms: z.boolean().optional(),
  no_show_by: z.enum(["customer", "agent"]).optional(),
  rejection_reason: trimmedString.min(1).max(500).optional(),
});

export const consultationSettlementActionSchema = z.object({
  id: uuidV4Schema,
});
