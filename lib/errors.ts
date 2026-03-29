type Primitive = string | number | boolean | null | undefined;

type SecureErrorContext = Record<string, Primitive>;

type SupabaseLikeError = {
  code?: string | null;
  hint?: string | null;
  details?: string | null;
  message?: string | null;
};

type AppErrorMapping = {
  code?: string;
  clientMessage: string;
  statusHint: number;
};

type SupabaseAppErrorOptions = {
  scope: string;
  action: string;
  defaultMessage: string;
  fallbackCode?: string;
  fallbackStatus?: number;
  context?: SecureErrorContext;
  codeMap?: Record<string, AppErrorMapping>;
};

export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly clientMessage: string,
    public readonly statusHint?: number,
    public readonly cause?: unknown,
  ) {
    super(clientMessage);
    this.name = "AppError";
  }
}

export const ERR = {
  DB_QUERY: "DB_QUERY_FAILED",
  NOT_FOUND: "RESOURCE_NOT_FOUND",
  PERMISSION: "PERMISSION_DENIED",
  CONFLICT: "STATE_CONFLICT",
  UNAUTHORIZED: "AUTH_REQUIRED",
  VALIDATION: "VALIDATION_ERROR",
  CONFIG: "CONFIG_ERROR",
} as const;

export type ServiceResult<T> = {
  data: T | null;
  error: AppError | null;
};

const DEFAULT_SUPABASE_ERROR_MAP: Record<string, AppErrorMapping> = {
  PGRST116: {
    code: ERR.NOT_FOUND,
    clientMessage: "대상을 찾을 수 없습니다.",
    statusHint: 404,
  },
  "23502": {
    code: ERR.VALIDATION,
    clientMessage: "필수 데이터가 누락되었습니다.",
    statusHint: 400,
  },
  "23503": {
    code: ERR.CONFLICT,
    clientMessage: "연결된 데이터가 있어 처리할 수 없습니다.",
    statusHint: 409,
  },
  "23505": {
    code: ERR.CONFLICT,
    clientMessage: "이미 존재하는 데이터입니다.",
    statusHint: 409,
  },
  "42501": {
    code: ERR.PERMISSION,
    clientMessage: "권한이 없습니다.",
    statusHint: 403,
  },
} as const;

function isSupabaseLikeError(error: unknown): error is SupabaseLikeError {
  return typeof error === "object" && error !== null;
}

function buildErrorLogPayload(
  error: unknown,
  context?: SecureErrorContext,
): Record<string, unknown> {
  const source = unwrapErrorCause(error);
  const payload: Record<string, unknown> = {};

  if (source instanceof Error) {
    payload.name = source.name;
  }

  if (isSupabaseLikeError(source)) {
    if (typeof source.code === "string" && source.code) {
      payload.code = source.code;
    }

    if (typeof source.hint === "string" && source.hint) {
      payload.hint = source.hint;
    }
  }

  if (context && Object.keys(context).length > 0) {
    payload.context = context;
  }

  return payload;
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function unwrapErrorCause(error: unknown): unknown {
  return error instanceof AppError && error.cause ? error.cause : error;
}

export function logServiceError(
  scope: string,
  action: string,
  error: unknown,
  context?: SecureErrorContext,
) {
  console.error(
    `[${scope}] ${action} 실패:`,
    buildErrorLogPayload(error, context),
  );
}

export function toAppError(
  error: unknown,
  code: string,
  clientMessage: string,
  statusHint = 500,
): AppError {
  if (error instanceof AppError) {
    return error;
  }

  return new AppError(code, clientMessage, statusHint, error);
}

export function createSupabaseServiceError(
  error: SupabaseLikeError,
  options: SupabaseAppErrorOptions,
): AppError;
export function createSupabaseServiceError(
  error: null | undefined,
  options: SupabaseAppErrorOptions,
): null;
export function createSupabaseServiceError(
  error: SupabaseLikeError | null | undefined,
  options: SupabaseAppErrorOptions,
): AppError | null;
export function createSupabaseServiceError(
  error: SupabaseLikeError | null | undefined,
  options: SupabaseAppErrorOptions,
): AppError | null {
  if (!error) {
    return null;
  }

  logServiceError(options.scope, options.action, error, options.context);

  const errorCode =
    typeof error.code === "string" && error.code
      ? error.code
      : null;

  const mapped = errorCode
    ? options.codeMap?.[errorCode] ?? DEFAULT_SUPABASE_ERROR_MAP[errorCode]
    : undefined;

  if (mapped) {
    return new AppError(
      mapped.code ?? ERR.DB_QUERY,
      mapped.clientMessage,
      mapped.statusHint,
      error,
    );
  }

  return new AppError(
    options.fallbackCode ?? ERR.DB_QUERY,
    options.defaultMessage,
    options.fallbackStatus ?? 500,
    error,
  );
}
