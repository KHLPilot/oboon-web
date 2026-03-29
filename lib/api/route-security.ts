import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { z } from "zod";

import { createSupabaseServer } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServer>>;

type AuthSuccess = {
  ok: true;
  supabase: SupabaseServerClient;
  user: User;
};

type AuthFailure = {
  ok: false;
  response: NextResponse;
};

type ParsedBodySuccess<T> = {
  ok: true;
  data: T;
};

type ParsedBodyFailure = {
  ok: false;
  response: NextResponse;
};

type ParseJsonBodyOptions = {
  invalidJsonMessage?: string;
  invalidInputMessage?: string;
};

export const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const uuidV4Schema = z
  .string()
  .regex(UUID_V4_REGEX, "유효한 UUID 형식이 아닙니다");

export type StateTransitionMap<
  TState extends string,
  TAction extends string,
> = Partial<Record<TState, readonly TAction[]>>;

export function unauthorizedResponse(
  message = "인증이 필요합니다",
): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(
  message = "접근 권한이 없습니다",
): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function notFoundResponse(
  message = "대상을 찾을 수 없습니다",
): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function conflictResponse(
  message = "현재 상태에서 처리할 수 없습니다",
): NextResponse {
  return NextResponse.json({ error: message }, { status: 409 });
}

export function badRequestResponse(
  message = "입력값이 올바르지 않습니다",
): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function successResponse(
  payload: Record<string, unknown> = { success: true },
  status = 200,
): NextResponse {
  return NextResponse.json(payload, { status });
}

export async function requireAuthenticatedUser(): Promise<
  AuthSuccess | AuthFailure
> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false,
      response: unauthorizedResponse(),
    };
  }

  return {
    ok: true,
    supabase,
    user,
  };
}

export async function parseJsonBody<TSchema extends z.ZodTypeAny>(
  req: Request,
  schema: TSchema,
  options: ParseJsonBodyOptions = {},
): Promise<ParsedBodySuccess<z.infer<TSchema>> | ParsedBodyFailure> {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return {
      ok: false,
      response: badRequestResponse(
        options.invalidJsonMessage ?? "유효하지 않은 요청 형식",
      ),
    };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      response: badRequestResponse(
        options.invalidInputMessage ?? "입력값이 올바르지 않습니다",
      ),
    };
  }

  return {
    ok: true,
    data: parsed.data,
  };
}

export function hasAllowedRole(
  role: string | null | undefined,
  allowedRoles: readonly string[],
): boolean {
  if (!role) return false;
  return allowedRoles.includes(role);
}

export function isResourceOwner(
  resourceUserId: string | null | undefined,
  userId: string,
): boolean {
  return Boolean(resourceUserId) && resourceUserId === userId;
}

export function assertAllowedRole(
  role: string | null | undefined,
  allowedRoles: readonly string[],
  message = "접근 권한이 없습니다",
): NextResponse | null {
  return hasAllowedRole(role, allowedRoles)
    ? null
    : forbiddenResponse(message);
}

export function assertResourceOwner(
  resourceUserId: string | null | undefined,
  userId: string,
  message = "접근 권한이 없습니다",
): NextResponse | null {
  return isResourceOwner(resourceUserId, userId)
    ? null
    : forbiddenResponse(message);
}

export function canTransitionState<
  TState extends string,
  TAction extends string,
>(
  currentState: TState | null | undefined,
  action: TAction,
  transitions: StateTransitionMap<TState, TAction>,
): boolean {
  if (!currentState) return false;
  return Boolean(transitions[currentState]?.includes(action));
}

export function assertStateTransition<
  TState extends string,
  TAction extends string,
>(
  currentState: TState | null | undefined,
  action: TAction,
  transitions: StateTransitionMap<TState, TAction>,
  message = `현재 상태에서 '${action}' 불가`,
): NextResponse | null {
  return canTransitionState(currentState, action, transitions)
    ? null
    : conflictResponse(message);
}
