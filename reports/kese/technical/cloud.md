# 클라우드 보안 취약점 분석 (CL-01 ~ CL-14)

> 평가 대상: Vercel + Supabase Cloud + Cloudflare R2
> 평가 일자: 2026-04-11 (이전: 2026-03-29)

---

| 항목 | 제목 | 판정 | 근거 |
|------|------|------|------|
| CL-01 | 클라우드 계정 보안 | 양호 | Vercel/Supabase/Cloudflare 각각 별도 계정 관리, MFA 권고 |
| CL-02 | IAM 최소 권한 | 양호 | R2 전용 Access Key 분리, Supabase 역할 분리(anon/authenticated/service_role) |
| CL-03 | 루트 계정 사용 금지 | 부분이행 | Cloudflare 루트 계정 사용 여부 미확인. 루트 계정 MFA + 서브 토큰 사용 권고 |
| CL-04 | 접근 키 관리 | 양호 | 환경변수로만 관리, 소스 내 하드코딩 없음 |
| CL-05 | 스토리지 공개 접근 | 부분이행 | `postId`: UUID 검증 완료. `boardId`/`categoryId`: `!/^\d+$/.test()` 정수 검증 추가 완료(`2026-04-11`). R2 퍼블릭 버킷 정책 콘솔 확인 계속 필요 |
| CL-06 | 스토리지 암호화 | 양호 | Cloudflare R2 기본 at-rest 암호화 적용 |
| CL-07 | 전송 암호화 | 양호 | R2 업로드 서버 사이드 서명 URL, HTTPS 전용 |
| CL-08 | 네트워크 접근 제어 | 양호 | Vercel Edge Network 기본 DDoS 방어, IP 기반 접근 제한 없음(서버리스) |
| CL-09 | 보안 그룹/방화벽 | 해당없음 | 서버리스 환경(Vercel), VM 레벨 방화벽 없음 |
| CL-10 | 클라우드 감사 로그 | 부분이행 | Vercel 배포 로그, Supabase API 로그 존재. 중앙 집계 및 보존 정책 미수립 |
| CL-11 | 환경 분리 | 양호 | 테스트 DB(`ketjqhoeucxmxgnutlww`)와 메인 DB(`kjxoszqhofahjorbufhh`) 분리 운영 |
| CL-12 | 시크릿 관리 서비스 | 부분이행 | 환경변수 기반 관리. AWS Secrets Manager/Vault 등 전용 비밀키 관리 서비스 미사용 |
| CL-13 | 공급망 보안 | 양호 | pnpm lock 파일 + overrides, Vercel 빌드 환경 고정 |
| CL-14 | 클라우드 설정 드리프트 | 부분이행 | 인프라 코드(IaC) 미적용. Supabase 마이그레이션으로 DB 설정 관리 |

---

---

## 신규 발견사항 (2026-04-11)

### ✅ OAuth Callback — sessionKey URL 노출 [조치 완료 — 2026-04-11]
- `lib/auth/restoreSessionCookie.ts` 신규 생성 — `httpOnly: true`, `sameSite: "lax"`, 프로덕션 `secure: true` 쿠키로 전달
- `google/callback/route.ts:140` — URL 파라미터 제거, `setRestoreSessionCookie()` 호출
- `RestorePage.client.tsx` — 쿠키 자동 전송으로 변경, URL에 sessionKey 없음

### [LOW] R2 Upload — postId 경로 매개변수 숫자 검증 미비
- **파일**: `app/api/r2/upload/route.ts:251-255`
- **위험**: `postId`, `boardId`, `categoryId`가 숫자인지 검증 없이 경로에 삽입
- **권고**: `!/^\d+$/.test(postId)` 검증 추가

---

## 조치 필요 항목 요약

| 우선순위 | 항목 | 조치 내용 |
|---------|------|----------|
| HIGH | CL-05 | R2 버킷 공개 접근 설정 확인, 민감 파일(`pdf-temp/`, 신분증) 버킷 정책 차단 또는 전용 비공개 버킷 분리 |
| ✅ RESOLVED | CL-05-2 | boardId/categoryId 정수 검증 추가 완료 (2026-04-11) |
| MEDIUM | CL-03 | Cloudflare 루트 계정 MFA 활성화 확인, 서비스 토큰 사용 |
| LOW | OAuth sessionKey | sessionKey URL 노출 → POST 방식 또는 Redis TTL 강화 |
| LOW | CL-10 | 중앙 로그 집계(Vercel Log Drains 등) 및 보존 정책 수립 |
| LOW | CL-12 | 중요 비밀키(서비스 롤 키, OAuth 시크릿) 전용 Secrets Manager 이관 검토 |
