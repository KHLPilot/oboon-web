# 클라우드 보안 취약점 분석 (CL-01 ~ CL-14)

> 평가 대상: Vercel + Supabase Cloud + Cloudflare R2
> 평가 일자: 2026-03-29

---

| 항목 | 제목 | 판정 | 근거 |
|------|------|------|------|
| CL-01 | 클라우드 계정 보안 | 양호 | Vercel/Supabase/Cloudflare 각각 별도 계정 관리, MFA 권고 |
| CL-02 | IAM 최소 권한 | 양호 | R2 전용 Access Key 분리, Supabase 역할 분리(anon/authenticated/service_role) |
| CL-03 | 루트 계정 사용 금지 | 부분이행 | Cloudflare 루트 계정 사용 여부 미확인. 루트 계정 MFA + 서브 토큰 사용 권고 |
| CL-04 | 접근 키 관리 | 양호 | 환경변수로만 관리, 소스 내 하드코딩 없음 |
| CL-05 | 스토리지 공개 접근 | 취약 | Cloudflare R2 퍼블릭 도메인 설정은 남아 있다. 다만 2026-04-03 기준 `app/api/r2/upload/sign-pdf/route.ts` 에서 `pdf-temp/` 업로드 응답의 퍼블릭 URL 반환은 제거했다. 버킷 정책과 민감 경로 차단 여부는 콘솔 확인이 계속 필요하다 |
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

## 조치 필요 항목 요약

| 우선순위 | 항목 | 조치 내용 |
|---------|------|----------|
| HIGH | CL-05 | R2 버킷 공개 접근 설정 확인, 민감 파일(`pdf-temp/`, 신분증) 버킷 정책 차단 또는 전용 비공개 버킷 분리 |
| MEDIUM | CL-03 | Cloudflare 루트 계정 MFA 활성화 확인, 서비스 토큰 사용 |
| LOW | CL-10 | 중앙 로그 집계(Vercel Log Drains 등) 및 보존 정책 수립 |
| LOW | CL-12 | 중요 비밀키(서비스 롤 키, OAuth 시크릿) 전용 Secrets Manager 이관 검토 |
