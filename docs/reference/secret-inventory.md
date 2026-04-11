# Secret Inventory and Handling Rules

Last reviewed: 2026-04-11

이 문서는 `oboon-web`에서 사용 중인 비밀값과 처리 기준을 정리한다.
목적은 `CL-12` 항목의 운영 통제를 코드 저장소 안에 명시해, 어떤 값이 서버 전용인지와 어디에 쓰이는지 빠르게 검토할 수 있게 하는 것이다.

## 기본 원칙

- 비밀값은 클라이언트 번들에 넣지 않는다.
- 비밀값은 로그, 응답, 에러 메시지, 브라우저 localStorage/sessionStorage에 넣지 않는다.
- 비밀값은 서버 전용 환경변수로만 관리한다.
- 새 비밀값을 추가할 때는 이 문서와 `.env.example`를 함께 갱신한다.
- 값이 토큰/키/시크릿/세션 성격이면 코드에서 마스킹 또는 redaction을 우선 적용한다.

## 서버 전용 비밀값

| 변수 | 용도 | 비고 |
|------|------|------|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 관리 작업 | 서버 전용, 클라이언트 노출 금지 |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | R2 업로드/삭제 | 서버 전용 |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | R2 업로드/삭제 | 서버 전용 |
| `BANK_ACCOUNT_ENCRYPTION_KEY` | 은행 계좌 암복호화 | 서버 전용, 절대 교체 금지 |
| `RESTORE_TOKEN_SECRET` | 계정 복구 토큰 서명 | 서버 전용 |
| `GOOGLE_GENERATIVE_AI_API_KEY` | PDF 추출/분석 AI 호출 | 서버 전용 |
| `NAVER_CLIENT_SECRET` | 네이버 OAuth | 서버 전용 |
| `KAKAO_REST_API_KEY` | 지도/지오코딩 | 서버 전용 |
| `CLEANUP_API_KEY` | 임시 유저 정리 API | 내부 호출 전용 |
| `CRON_SECRET` | cron 엔드포인트 보호 | 내부 스케줄러 전용 |
| `UPSTASH_REDIS_REST_TOKEN` | rate limit / temp session 저장 | 서버 전용 |
| `REGULATION_SYNC_SOURCE_TOKEN` | 규제 원문 동기화 | 서버 전용 |
| `PUBLIC_DATA_SERVICE_KEY` | 공공데이터 조회 | 서버 전용 |

## 운영 확인 항목

- Vercel 환경변수는 `Production` / `Preview` / `Development` 범위를 분리해 점검한다.
- 서비스 롤 키나 외부 API 키를 PR 본문, 이슈, 댓글, 로그에 붙이지 않는다.
- 오류 로그는 `lib/api/route-error.ts`와 `lib/errors.ts`의 redaction을 거치도록 유지한다.
- 새 비밀값이 생기면 `.env.example`에 이름만 추가하고 실제 값은 넣지 않는다.
- 이관이 필요한 값은 Secrets Manager/Vault 후보로 분류한다.

## 관련 문서

- [API Route Secure Checklist](/Users/songzo/KHL_Pilot/oboon-web/docs/api-route-secure-checklist.md)
- [Supabase Service Role Audit](/Users/songzo/KHL_Pilot/oboon-web/docs/reference/supabase-service-role-audit.md)
