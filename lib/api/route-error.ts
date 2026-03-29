import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";

type Primitive = string | number | boolean | null | undefined;

type SecureLogContext = Record<string, Primitive>;

type SupabaseLikeError = {
  code?: string | null;
  hint?: string | null;
  message?: string | null;
};

type ApiErrorOptions = {
  status?: number;
  clientMessage?: string;
  context?: SecureLogContext;
};

type StructuredApiErrorOptions<TExtra extends Record<string, unknown> = Record<string, never>> = {
  status?: number;
  code: string;
  message: string;
  extra?: TExtra;
  context?: SecureLogContext;
};

type SupabaseErrorOptions = {
  status?: number;
  defaultMessage?: string;
  context?: SecureLogContext;
  codeMap?: Record<string, { status: number; message: string }>;
};

type RouteErrorOptions = {
  status?: number;
  clientMessage?: string;
  defaultMessage?: string;
  codeMap?: Record<string, { status: number; message: string }>;
};

const DEFAULT_CLIENT_ERROR_MESSAGE = "요청 처리 중 오류가 발생했습니다";
const DEFAULT_DB_ERROR_MESSAGE = "처리 중 오류가 발생했습니다";

const DEFAULT_SUPABASE_CODE_MAP = {
  "23502": { status: 400, message: "필수 데이터가 누락되었습니다" },
  "23503": { status: 409, message: "연결된 데이터가 있어 삭제할 수 없습니다" },
  "23505": { status: 409, message: "이미 존재하는 데이터입니다" },
} as const;

function isSupabaseLikeError(error: unknown): error is SupabaseLikeError {
  return typeof error === "object" && error !== null;
}

export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (isSupabaseLikeError(error) && typeof error.message === "string") {
    return error.message;
  }

  return String(error);
}

function buildLogPayload(error: unknown, context?: SecureLogContext) {
  const payload: Record<string, unknown> = {
    message: extractErrorMessage(error),
  };

  if (isSupabaseLikeError(error)) {
    if (typeof error.code === "string" && error.code) {
      payload.code = error.code;
    }

    if (typeof error.hint === "string" && error.hint) {
      payload.hint = error.hint;
    }
  }

  // context에는 PII, 토큰, 키를 넣지 않는다.
  if (context && Object.keys(context).length > 0) {
    payload.context = context;
  }

  return payload;
}

export function logApiError(
  operation: string,
  error: unknown,
  context?: SecureLogContext,
) {
  console.error(`[API] ${operation} 실패:`, buildLogPayload(error, context));
}

export function apiErrorResponse(
  message = DEFAULT_CLIENT_ERROR_MESSAGE,
  status = 500,
): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function handleServiceError(
  error: unknown,
  fallbackMessage = DEFAULT_CLIENT_ERROR_MESSAGE,
): NextResponse {
  if (error instanceof AppError) {
    return apiErrorResponse(error.clientMessage, error.statusHint ?? 500);
  }

  return apiErrorResponse(fallbackMessage, 500);
}

export function handleApiError(
  operation: string,
  error: unknown,
  options: ApiErrorOptions = {},
): NextResponse {
  logApiError(operation, error, options.context);
  return apiErrorResponse(
    options.clientMessage ?? DEFAULT_CLIENT_ERROR_MESSAGE,
    options.status ?? 500,
  );
}

export function handleStructuredApiError<
  TExtra extends Record<string, unknown> = Record<string, never>,
>(
  operation: string,
  error: unknown,
  options: StructuredApiErrorOptions<TExtra>,
): NextResponse {
  logApiError(operation, error, options.context);
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: options.code,
        message: options.message,
        ...(options.extra ?? {}),
      },
    },
    { status: options.status ?? 500 },
  );
}

export function handleSupabaseError(
  operation: string,
  error: unknown,
  options: SupabaseErrorOptions = {},
): NextResponse {
  logApiError(operation, error, options.context);

  const code =
    isSupabaseLikeError(error) && typeof error.code === "string"
      ? error.code
      : undefined;
  const mapped = code
    ? options.codeMap?.[code] ?? DEFAULT_SUPABASE_CODE_MAP[code as keyof typeof DEFAULT_SUPABASE_CODE_MAP]
    : undefined;

  if (mapped) {
    return apiErrorResponse(mapped.message, mapped.status);
  }

  return apiErrorResponse(
    options.defaultMessage ?? DEFAULT_DB_ERROR_MESSAGE,
    options.status ?? 500,
  );
}

export function handleRouteError(
  operation: string,
  error: unknown,
  options: RouteErrorOptions = {},
): NextResponse {
  if (error instanceof AppError) {
    const status = options.status ?? error.statusHint ?? 500;
    console.error(`[${operation}] route error`, {
      status,
      message: error.clientMessage,
    });
    return apiErrorResponse(
      options.clientMessage ?? error.clientMessage,
      status,
    );
  }

  if (isSupabaseLikeError(error)) {
    const code =
      typeof error.code === "string" && error.code
        ? error.code
        : undefined;
    const mapped = code
      ? options.codeMap?.[code] ?? DEFAULT_SUPABASE_CODE_MAP[code as keyof typeof DEFAULT_SUPABASE_CODE_MAP]
      : undefined;
    const status = options.status ?? mapped?.status ?? 500;

    console.error(`[${operation}] route error`, {
      status,
      message: extractErrorMessage(error),
    });

    return apiErrorResponse(
      options.clientMessage ??
        mapped?.message ??
        options.defaultMessage ??
        DEFAULT_DB_ERROR_MESSAGE,
      status,
    );
  }

  const status = options.status ?? 500;
  console.error(`[${operation}] route error`, {
    status,
    message: extractErrorMessage(error),
  });
  return apiErrorResponse(
    options.clientMessage ?? DEFAULT_CLIENT_ERROR_MESSAGE,
    status,
  );
}

export function maskEmail(value: string): string {
  const [localPart, domainPart] = value.trim().split("@");
  if (!localPart || !domainPart) return value;

  if (localPart.length <= 2) {
    return `${localPart[0] ?? "*"}***@${domainPart}`;
  }

  return `${localPart.slice(0, 2)}***@${domainPart}`;
}

export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 7) return value;

  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}
