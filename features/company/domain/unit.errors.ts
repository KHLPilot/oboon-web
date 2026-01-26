// app/company/properties/[id]/units/errors.ts

export type AppFormError = {
  title: string; // 상단 알림 제목
  description?: string; // 상단 알림 설명
  fieldErrors?: Record<string, string>; // 컬럼키 -> 필드 에러 메시지
  raw?: string; // (선택) 원문 저장 (디버그용)
};

const FIELD_LABELS: Record<string, string> = {
  type_name: "평면 타입 이름",
  exclusive_area: "전용 면적",
  supply_area: "공급 면적",
  rooms: "방 개수",
  bathrooms: "욕실 개수",
  building_layout: "구조",
  orientation: "향",
  price_min: "가격 하한",
  price_max: "가격 상한",
  unit_count: "세대수",
  floor_plan_url: "평면도 URL",
  image_url: "이미지 URL",
};

/**
 * Supabase/PostgREST 에러 -> 사용자 친화적 한글 에러로 변환
 * - 가능한 경우 code 기반(예: 23502) 매핑
 * - code가 없을 경우 message 패턴으로 fallback
 */
export function mapSupabaseErrorToKorean(err: unknown): AppFormError {
  const errorLike = err as {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
  };
  const code: string | undefined = errorLike?.code;
  const message: string = String(errorLike?.message ?? "");
  const details: string = String(errorLike?.details ?? "");
  const hint: string = String(errorLike?.hint ?? "");

  const raw = [message, details, hint].filter(Boolean).join(" | ");

  // Postgres NOT NULL violation: 23502
  const isNotNull =
    code === "23502" ||
    /violates not-null constraint/i.test(message) ||
    /null value in column/i.test(message);

  if (isNotNull) {
    const col = extractColumnName(message) ?? extractColumnName(details);
    const label = col ? FIELD_LABELS[col] ?? col : "필수 항목";

    return {
      title: "저장에 실패했어요",
      description: "필수 항목을 확인해 주세요.",
      fieldErrors: col ? { [col]: `${label}을(를) 입력해 주세요.` } : undefined,
      raw,
    };
  }

  // Postgres UNIQUE violation: 23505
  const isUnique =
    code === "23505" || /duplicate key value|already exists/i.test(message);

  if (isUnique) {
    const col = extractColumnName(message) ?? extractColumnName(details);
    const label = col ? FIELD_LABELS[col] ?? col : "값";
    return {
      title: "이미 등록된 값이에요",
      description: `${label}이(가) 이미 존재해요. 다른 값으로 다시 시도해 주세요.`,
      raw,
    };
  }

  // 잘못된 숫자/형식: 22P02 등
  const isInvalidFormat =
    code === "22P02" || /invalid input syntax|invalid/i.test(message);

  if (isInvalidFormat) {
    return {
      title: "입력 형식이 올바르지 않아요",
      description: "숫자/형식을 확인해 주세요.",
      raw,
    };
  }

  // 기본 fallback
  return {
    title: "저장에 실패했어요",
    description: "잠시 후 다시 시도해 주세요.",
    raw,
  };
}

function extractColumnName(text?: string): string | null {
  if (!text) return null;
  // message 예: column "type_name"
  const m = text.match(/column\s+"([^"]+)"/i);
  return m?.[1] ?? null;
}
