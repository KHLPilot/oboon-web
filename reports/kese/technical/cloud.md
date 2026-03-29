# 클라우드 보안 취약점 분석 (CL-01 ~ CL-14)

> 평가 대상: Vercel + Supabase Cloud + Cloudflare R2
> 평가 일자: 2026-03-29 (3차 평가)
> 평가 기준: KISA 주요정보통신기반시설 기술적 취약점 분석·평가 방법 상세 가이드

---

## 평가 요약

| 구분 | 총계 | 양호 | 부분이행 | 취약 | 해당없음 |
|------|:----:|:----:|:--------:|:----:|:--------:|
| IAM/계정 관리 (CL-01~04) | 4 | 3 | 1 | 0 | 0 |
| 네트워크/데이터 (CL-05~09) | 5 | 4 | 1 | 0 | 0 |
| 로깅/모니터링 (CL-10~12) | 3 | 2 | 1 | 0 | 0 |
| 컴플라이언스 (CL-13~14) | 2 | 2 | 0 | 0 | 0 |
| **합계** | **14** | **11** | **3** | **0** | **0** |

**이전(2차) 대비**: 취약 1→0, 양호 10→11

---

## 1. IAM/계정 관리 (CL-01 ~ CL-04)

### CL-01: 클라우드 IAM 구성
- **판정: 양호 ✅**
- Supabase: anon key(클라이언트), service role key(서버) 역할 분리
- Vercel: 환경변수 암호화, 미리보기/프로덕션 환경 분리
- Cloudflare R2: access key / secret key 서버 전용

### CL-02: 키/비밀 관리
- **판정: 부분이행 ⚠️**
- 환경변수: Vercel 암호화 저장 (양호)
- **잔존 이슈**: `SUPABASE_SERVICE_ROLE_KEY`가 DB 접근 AND HMAC 서명 두 가지 용도로 사용:
  ```typescript
  // lib/auth/restoreToken.ts:8
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;  // 서명 키로 재사용
  ```
- 키 로테이션 시 활성 복구 토큰 일괄 무효화 가능
- **권장**: 별도 `RESTORE_TOKEN_SECRET` 환경변수 분리

### CL-03: 최소 권한 원칙
- **판정: 양호 ✅**
- Supabase: RLS + anon/service role 분리
- R2: 업로드 전용 IAM 권한 (`PutObject`만 사용)
- `"server-only"` 모듈로 클라이언트 번들 분리

### CL-04: MFA 적용
- **판정: 양호 ✅**
- Vercel 팀 계정: MFA 설정 가능 (관리자 책임)
- Supabase 대시보드: MFA 설정 가능
- 사용자 앱 MFA: 현재 미구현 (향후 관리자 계정 TOTP 권장)

---

## 2. 네트워크/데이터 보호 (CL-05 ~ CL-09)

### CL-05: 네트워크 보안
- **판정: 양호 ✅**
- Vercel Edge Network: DDoS 보호, WAF 기본 포함
- Supabase: 내장 네트워크 보안 (관리형)

### CL-06: 데이터 전송 암호화
- **판정: 양호 ✅**
- 모든 엔드포인트 HTTPS/TLS 1.3
- HSTS 헤더 (프로덕션): `max-age=31536000; includeSubDomains; preload`

### CL-07: 저장 데이터 보호
- **판정: 양호 ✅**
- Supabase: AES-256 (인프라 레벨)
- Cloudflare R2: 저장 암호화

### CL-08: SSRF 방지
- **판정: 부분이행 ⚠️**
- 외부 API 호출: 고정 도메인만 사용 (Naver, Google, Kakao)
- CSP connect-src: 허용 도메인 명시 (wildcard `https:` 미사용)
- 사용자 제공 URL로 fetch 없음
- **잔존**: 명시적 SSRF 방어 코드(내부망 IP 차단 등) 부재

### CL-09: 컨테이너/함수 격리
- **판정: 양호 ✅**
- Vercel Serverless: 함수 레벨 격리 (인프라 제공)
- `export const runtime = "nodejs"` — 런타임 명시

---

## 3. 로깅/모니터링 (CL-10 ~ CL-12)

### CL-10: 클라우드 활동 로깅
- **판정: 양호 ✅**
- Vercel: 함수 로그, 빌드 로그 자동 수집
- Supabase: 쿼리 로그, Auth 이벤트 로그

### CL-11: 보안 이벤트 모니터링
- **판정: 부분이행 ⚠️**
- 기본 플랫폼 로그 존재 (Vercel, Supabase)
- 실시간 보안 이벤트 알림 미설정 (Slack/Discord/Telegram 연동 없음)
- **권장**: Rate Limit 초과, 인증 실패 급증 시 알림 설정

### CL-12: 로그 보존
- **판정: 양호 ✅**
- Vercel: 30일 로그 보존 (무료 플랜)
- Supabase: 7일 로그 보존 (플랜에 따라 다름)
- **권장**: 중요 보안 이벤트는 별도 저장

---

## 4. 컴플라이언스 (CL-13 ~ CL-14)

### CL-13: 의존성 취약점 관리
- **판정: 양호 ✅**
- `package.json` overrides로 알려진 취약 버전 강제 업그레이드:
  ```json
  "pnpm.overrides": {
    "fast-xml-parser@>=5.0.0 <5.5.7": "5.5.7",
    "path-to-regexp@>=8.0.0 <8.4.0": "8.4.0",
    ...
  }
  ```
- **권장**: CI에서 `pnpm audit --audit-level=high` 자동화, Dependabot 활성화

### CL-14: 클라우드 서비스 보안 인증
- **판정: 양호 ✅**
- Vercel: SOC 2 Type II 인증
- Supabase: SOC 2 Type II 인증
- Cloudflare: ISO 27001, SOC 2

---

## 주요 잔존 이슈

### MEDIUM: CL-02 — 키 재사용
```
파일: lib/auth/restoreToken.ts:8
현황: SUPABASE_SERVICE_ROLE_KEY를 HMAC 서명키로 재사용
위험: 키 로테이션 시 활성 토큰 무효화, 암호학적 키 분리 원칙 위반
권장: RESTORE_TOKEN_SECRET 별도 환경변수 설정
```

### LOW: CL-11 — 보안 이벤트 알림 미설정
```
현황: 기본 플랫폼 로그만 존재
권장: Rate Limit 초과/인증 실패 급증 시 Slack/Telegram 알림
```
