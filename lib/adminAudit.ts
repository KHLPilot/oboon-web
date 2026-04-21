import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminAuditLogInput = {
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
};

export async function recordAdminAuditLog(
  supabase: SupabaseClient,
  input: AdminAuditLogInput,
): Promise<void> {
  const { error } = await supabase.from("admin_audit_logs").insert({
    admin_id: input.adminId,
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId,
    metadata: input.metadata ?? {},
  });

  if (error) {
    console.error("[adminAudit] insert failed", {
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      code: error.code,
    });
    throw error;
  }
}
