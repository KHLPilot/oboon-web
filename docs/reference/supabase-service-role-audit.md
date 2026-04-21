# Supabase Service Role Audit

Last reviewed: 2026-04-03

이 문서는 `@/lib/supabaseAdmin` 사용 위치를 전수 인벤토리한 결과다.
목적은 `service_role` 사용 범위를 숨기지 않고, RLS 우회가 필요한 경로와 아닌 경로를 구분해 재검토할 수 있게 만드는 것이다.

## 감사 기준

- 검색 기준: `rg -l "@/lib/supabaseAdmin" app lib features shared`
- 원칙: 새 사용처를 추가할 때는 이 문서와 PR 설명에 사유를 남긴다.
- 원칙: 사용자 요청 처리 경로는 가능하면 authed server client를 먼저 검토한다.
- 원칙: 배치, 정리 작업, 권한 상승이 필요한 시스템 작업만 `service_role`을 허용한다.
- 원칙: 민감 관리자 조회는 `admin_audit_logs`에 적재해 서버 로그 소실에 대비한다.
- 원칙: 관련 비밀값은 `docs/reference/secret-inventory.md`와 함께 관리한다.
- 원칙: `service_role` 경로의 오류 로그는 PII/토큰/키 redaction 규칙을 따라야 한다.

## 사용처 인벤토리

- `lib/services/supabase-admin.ts`
- `lib/api/admin-route.ts`
- `features/agent/services/agent.propertyAgents.ts`
- `app/api/property-agents/[id]/route.ts`
- `app/api/property-requests/route.ts`
- `app/api/property-requests/[id]/route.ts`
- `app/api/agent/notifications/route.ts`
- `app/api/agent/slots/route.ts`
- `app/api/agent/holidays/route.ts`
- `app/api/agent/working-hours/route.ts`
- `app/api/auth/create-verification-token/route.ts`
- `app/api/auth/cleanup-temp-user/route.ts`
- `app/api/auth/delete-and-recreate/route.ts`
- `app/api/auth/mark-verified/route.ts`
- `app/api/auth/restore-account/route.ts`
- `app/api/auth/check-deleted-account/route.ts`
- `app/api/auth/check-email/route.ts`
- `app/api/auth/check-verification/route.ts`
- `app/api/auth/google/callback/route.ts`
- `app/api/auth/naver/callback/route.ts`
- `app/api/terms/route.ts`
- `app/api/admin/settlements/[id]/bank-account/route.ts`
- `app/api/chat/[consultationId]/route.ts`
- `app/api/community/follows/[profileId]/route.ts`
- `app/api/community/posts/[postId]/route.ts`
- `app/api/community/posts/[postId]/repost/route.ts`
- `app/api/community/posts/[postId]/bookmark/route.ts`
- `app/api/community/posts/[postId]/like/route.ts`
- `app/api/community/posts/[postId]/comments/route.ts`
- `app/api/community/comments/[commentId]/route.ts`
- `app/api/community/comments/[commentId]/like/route.ts`
- `app/api/briefing/[postId]/view/route.ts`
- `app/api/briefing/[postId]/like/route.ts`
- `app/api/briefing/[postId]/comments/route.ts`
- `app/api/briefing/[postId]/comments/[commentId]/route.ts`
- `app/api/offerings/[id]/scrap/route.ts`
- `app/api/consultations/route.ts`
- `app/api/consultations/[id]/route.ts`
- `app/api/consultations/[id]/refund/route.ts`
- `app/api/consultations/[id]/reward-payout/route.ts`
- `app/api/consultations/[id]/settlement-summary/route.ts`
- `app/api/consultations/cleanup/route.ts`
- `app/api/agents/response-rates/route.ts`
- `app/api/visits/verify-gps/route.ts`
- `app/api/visits/visit-confirm-requests/route.ts`
- `app/api/support/qna/route.ts`
- `app/api/support/qna/[id]/answer/route.ts`
- `app/api/reference/regulation-rules/route.ts`
- `app/api/condition-validation/profiles/upsert/route.ts`
- `app/api/condition-validation/evaluate/route.ts`
- `app/api/condition-validation/evaluate-guest/route.ts`
- `app/api/condition-validation/evaluate-v2/route.ts`
- `app/api/condition-validation/recommend/route.ts`
- `app/api/cron/cleanup-cancelled/route.ts`
- `app/api/cron/regulation-rules-bootstrap/route.ts`
- `app/api/cron/condition-validation-profiles/route.ts`

## 우선 재검토 대상

- 공개 또는 반공개 조회 성격인데 `service_role`을 쓰는 카운터, 리액션, 히스토리 라우트
- 사용자 본인 인증 뒤 처리 가능한데 관리자 클라이언트를 쓰는 계정 보조 라우트
- 알림, 커뮤니티, 오퍼링 조회처럼 RLS 친화적으로 바꾸기 쉬운 경로

## 유지 허용 대상

- 정기 배치와 정리 작업
- 시스템 계정으로만 가능한 상태 전이
- 관리자 전용 기능
- 복구, 정산, 검증처럼 RLS 우회가 불가피한 운영 작업

## 변경 규칙

- 새 `service_role` 사용처를 추가할 때는 왜 authed server client로 충분하지 않은지 남긴다.
- 리뷰 시에는 조회 범위, 변경 대상, 반환 데이터 최소화를 같이 본다.
- 분기적으로 이 문서를 기준으로 사용처를 다시 스캔한다.
