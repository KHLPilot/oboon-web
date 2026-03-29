# OBOON API Route Secure Checklist

신규 `app/api/**` 라우트는 아래 표준 패턴을 기본으로 사용한다.

## 공통 헬퍼

- 인증/입력 검증/상태 전이 응답: `@/lib/api/route-security`
- `AppError` 기반 서비스 에러 응답: `@/lib/api/route-error`
- 민감 엔드포인트 rate limiting: `@/lib/rateLimit`
- 서버 Supabase 클라이언트: `@/lib/supabase/server`
- 서비스 롤 Supabase 클라이언트: `@/lib/supabaseAdmin`

## 표준 템플릿

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  assertResourceOwner,
  assertStateTransition,
  notFoundResponse,
  parseJsonBody,
  requireAuthenticatedUser,
  successResponse,
  type StateTransitionMap,
} from "@/lib/api/route-security";
import {
  handleApiError,
  handleServiceError,
  handleSupabaseError,
} from "@/lib/api/route-error";
import {
  authLimiter,
  checkAuthRateLimit,
  getClientIp,
} from "@/lib/rateLimit";

const RequestSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["approve", "reject", "pending"]),
});

const ALLOWED_TRANSITIONS: StateTransitionMap<
  "pending" | "approved" | "rejected",
  z.infer<typeof RequestSchema>["action"]
> = {
  pending: ["approve", "reject"],
  approved: [],
  rejected: [],
};

export async function POST(req: NextRequest) {
  const rateLimitRes = await checkAuthRateLimit(
    authLimiter,
    getClientIp(req),
    { windowMs: 60 * 1000 },
  );
  if (rateLimitRes) return rateLimitRes;

  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(req, RequestSchema);
  if (!parsed.ok) return parsed.response;

  const { supabase, user } = auth;
  const { id, action } = parsed.data;

  const { data: resource, error: resourceError } = await supabase
    .from("resources")
    .select("user_id, status")
    .eq("id", id)
    .maybeSingle();

  if (resourceError) {
    return handleSupabaseError("resources 조회", resourceError, {
      defaultMessage: "처리 중 오류가 발생했습니다",
      context: { resourceId: id },
    });
  }

  if (!resource) {
    return notFoundResponse("대상을 찾을 수 없습니다");
  }

  const ownerResponse = assertResourceOwner(resource.user_id, user.id);
  if (ownerResponse) return ownerResponse;

  const transitionResponse = assertStateTransition(
    resource.status,
    action,
    ALLOWED_TRANSITIONS,
  );
  if (transitionResponse) return transitionResponse;

  try {
    const { error: dbError } = await supabase
      .from("resources")
      .update({
        status: action === "approve" ? "approved" : "rejected",
      })
      .eq("id", id)
      .eq("status", resource.status);

    if (dbError) {
      return handleSupabaseError("resources 상태 변경", dbError, {
        defaultMessage: "처리 중 오류가 발생했습니다",
        context: { resourceId: id },
      });
    }
  } catch (error) {
    return handleApiError("resources 상태 변경", error, {
      clientMessage: "서버 오류가 발생했습니다",
      context: { resourceId: id },
    });
  }

  return successResponse();
}
```

서비스 레이어가 `AppError`를 반환하면 라우트에서는 `handleServiceError()`를 사용한다.

```ts
const { data, error } = await getResource(id);
if (error) {
  return handleServiceError(error, "조회 중 오류가 발생했습니다");
}
```

## 작성 규칙

1. 인증이 필요한 라우트는 `auth.getUser()` 기준으로 인증을 확인한다.
2. 요청 body는 `zod`로 검증하고 `parsed.error.issues`를 클라이언트에 그대로 반환하지 않는다.
3. 권한은 역할, 소유권, 상태 조건을 각각 분리해서 검증한다.
4. 상태 변경은 허용 전이만 통과시키고 업데이트에는 이전 상태 조건을 함께 넣어 낙관적 락을 건다.
5. `select("*")` 대신 필요한 컬럼만 명시한다.
6. DB 에러 상세, 테이블명, 제약명, 스키마 정보는 응답에 넣지 않는다.
7. 로그에는 이메일, 전화번호, 토큰, 세션 ID, 키를 직접 남기지 않는다. 필요한 경우 마스킹한다.
8. 민감 엔드포인트는 `checkAuthRateLimit()`로 fail-secure rate limiting을 적용한다.
9. 응답은 최소 데이터만 반환한다.
10. `dangerouslySetInnerHTML`이 필요한 경우 DOMPurify 또는 동등한 새니타이징을 적용한다.
11. OAuth 토큰 교환 시 `client_secret`은 URL 쿼리에 넣지 않고 POST body로만 전송한다.

## 커밋 전 체크리스트

- [ ] `auth.getUser()` 또는 동등한 인증 확인을 넣었는가?
- [ ] 모든 입력을 `zod` 또는 동등 수준으로 검증했는가?
- [ ] 역할/소유권/상태 전이를 모두 검증했는가?
- [ ] 응답과 로그에 DB 내부 정보가 없는가?
- [ ] 로그에 PII/토큰/키를 남기지 않았는가?
- [ ] 민감 엔드포인트에 rate limiting을 적용했는가?
- [ ] `select("*")` 대신 필요한 컬럼만 조회했는가?
- [ ] HTML 렌더링이 있다면 새니타이징이 적용됐는가?
- [ ] OAuth secret이 URL에 포함되지 않았는가?
