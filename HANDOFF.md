# HANDOFF — 2026-04-20

## 현재 목표
`app/api/**` 전체 보안 기준 적용 완료. 다음 세션에서 필요한 추가 작업만 남음.

## 완료된 작업

### 보안 기준 수립
- KESE/OWASP 기반 보안 코딩 프롬프트 작성 (범용 + 기능별)
- 이 저장소 전용 보안 기준 프롬프트 확정 (Zod, getUser, 감사 로그, 파일 업로드 등)

### 경계 설정
- `Header.tsx`: `getSession()` UI 상태 전용 경계 명시, 함수명 `syncHeaderFromClientSession`으로 변경
- ESLint: `components/`, `features/`, `app/components/`, `*.client.*`에서 `supabaseAdmin` import 금지

### API 라우트 Zod 적용
- `app/api/auth/**` — 공통 스키마(`lib/auth/auth-request-schemas.ts`) + 전 라우트 적용
- `app/api/profile/**` — `_schemas.ts` 인라인 방식 + 4개 라우트 적용
- `app/api/consultations/**` — `_schemas.ts` + status allowlist + 소유권 재검증 + cleanup rate limit
- `app/api/admin/**` — `_schemas.ts` + 전 라우트 적용
- `app/api/community/**` — `_schemas.ts` + 4개 write 라우트 적용
- `app/api/briefing/**` — `_schemas.ts` + write 라우트 적용

### 민감 데이터 보호
- `settlements`: 목록 응답에서 계좌번호 제거
- `settlements/[id]/bank-account`: 단건 조회 엔드포인트 신규 추가
- `SettlementDetailModal`: 모달 열릴 때 단건 엔드포인트 호출로 변경

### 감사 로그
- `supabase/migrations/114_admin_audit_logs.sql`: `admin_audit_logs` 테이블 + RLS
- `lib/adminAudit.ts`: 재사용 헬퍼
- 적용 액션: `view_bank_account`, `approve_agent`, `trigger_reward_payout`, `trigger_refund`, `delete_account`
- 감사 실패 시 응답도 실패 (fail-closed)

### DB 마이그레이션
- `113_atomic_terms_version_update.sql`: `update_term_version()` RPC (비원자적 2단계 → 단일 트랜잭션)
- `114_admin_audit_logs.sql`: 감사 로그 테이블

### 파일 업로드
- `r2/upload/sign-pdf`: JSON → FormData 전환, `%PDF-` 매직바이트 검증 추가
- `lib/r2.ts`: 미사용 헬퍼 삭제

### 버그 수정
- `briefing/editor/posts/[id]` DELETE: admin도 본인 글만 삭제 가능하던 로직 수정 → admin은 모든 글, author는 본인 글 삭제 가능
- `briefing/editor/profile`, `briefing/editor/covers`: `error.message` 내부 노출 제거

### Rate Limiting
- `lib/rateLimit.ts`: `adminAgentLastSeenIpLimiter`, `consultationCleanupIpLimiter` 추가
- `agent-last-seen`: userId 배열 최대 100개 제한 + rate limit
- `cleanup`: IP rate limit

### 테스트
- `tests/auth-route-schemas.test.mjs`
- `tests/profile-route-schemas.test.mjs`
- `tests/consultations-route-schemas.test.mjs`

## 미완료 / 잔여 사항

| 항목 | 내용 | 우선도 |
|------|------|--------|
| `delete-account` soft delete 재로그인 | auth.users 비활성화 또는 로그인 플로우 deleted_at 체크 | Medium |
| `gallery` 매직바이트 | profile gallery 업로드 매직바이트 미적용 (MIME + 크기는 완료) | Low |
| `briefing/[postId]/like` 비인증 조작 | 의도된 설계 (비로그인 허용) — 스킵 | 스킵 |
| `admin_audit_logs` 확장 | 추가 민감 액션 감사 로그 확장 가능 | Low |

## 주의사항
- `briefing_categories`에 `cover_image_url` 컬럼 없을 수 있음 (환경별 마이그레이션 상태 다름)
- community/briefing 비인증 읽기/쓰기(좋아요·댓글·조회수)는 의도된 설계
- `covers` PATCH의 "company" 역할 허용은 추후 확장을 위한 것 (현재 미완성)
- DB: 테스트 DB(`ketjqhoeucxmxgnutlww`) migrations 113~114 적용 필요

## 다음 세션 시작 시
1. 이 파일 읽기
2. `pnpm build`로 상태 확인
3. 필요 시 `delete-account` soft delete 재로그인 차단 구현
