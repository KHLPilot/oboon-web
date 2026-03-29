# KESE CII 취약점 분석평가 보고서 — 종합 요약

## 개요

| 항목 | 내용 |
|------|------|
| 대상 시스템 | OBOON (오늘의 분양) — oboon-web |
| 평가 일자 | 2026-03-29 (3차 평가 — 재검토) |
| 기술 스택 | Next.js 15 App Router + Supabase + TypeScript (Vercel 배포) |
| 평가 범위 | 기술적 (웹서비스, 데이터베이스, 클라우드) / 관리적 / 물리적 |
| 평가 기준 | KISA 주요정보통신기반시설 기술적 취약점 분석·평가 방법 상세 가이드 |
| 평가 방법 | 정적 코드 분석 (읽기 전용, 파일 수정 없음) |

---

## 환경 탐지 결과

| 구성 요소 | 탐지 결과 |
|-----------|-----------|
| 운영체제 | Vercel Serverless (Linux 기반, 직접 접근 불가) |
| 웹 서버 | Next.js 15 App Router (자체 서버) |
| 데이터베이스 | Supabase Cloud (PostgreSQL 15) |
| 클라우드 | Vercel (컴퓨팅) + Supabase Cloud (DB/Auth) + Cloudflare R2 (스토리지) |
| 네트워크 장비 | Vercel Edge Network (관리형, 직접 접근 불가) |
| 보안 장비 | Vercel WAF (기본 포함), Upstash Redis (Rate Limiting) |
| 주요 의존성 | zod (입력 검증), bcryptjs (패스워드), @upstash/ratelimit (속도 제한) |

해당없음 항목: Unix/Linux 직접 (U), Windows (W), 보안 장비 직접 (S), 네트워크 장비 직접 (N), 제어시스템 (C), PC/단말기 직접 (PC), 가상화 직접 (V)

---

## 이전 평가 대비 개선 현황 (1·2차 → 3차)

| 항목 코드 | 발견 내용 | 이전 판정 | 현재 판정 | 변경 |
|-----------|-----------|:---------:|:---------:|:----:|
| WS-16 | Naver OAuth Client Secret URL 노출 | 취약 🔴 | 양호 ✅ | ✅ 수정됨 |
| WS-02 | dangerouslySetInnerHTML 미새니타이징 | 취약 🔴 | 양호 ✅ | ✅ 수정됨 |
| WS-41 | CSP unsafe-inline 허용 | 취약 🟠 | 양호 ✅ | ✅ 수정됨 |
| D-13 | listUsers() 무제한 호출 | 취약 🟠 | 부분이행 ⚠️ | ↗ 개선됨 |
| WS-13 | Admin 역할 변경 시 상태 미검증 | 부분이행 ⚠️ | 양호 ✅ | ✅ 수정됨 |
| WS-26 | 에러 메시지 내부 정보 전파 | 부분이행 ⚠️ | 양호 ✅ | ✅ 수정됨 |
| WS-18 | Rate Limit IP 헤더 위조 우회 | 부분이행 ⚠️ | 양호 ✅ | ✅ 수정됨 |

**이전 대비 7개 항목 개선, 취약→양호 전환 4건**

---

## 종합 평가 결과

### 기술적 취약점

| 도메인 | 총계 | 양호 | 부분이행 | 취약 | 해당없음 |
|--------|:----:|:----:|:--------:|:----:|:--------:|
| 웹 서비스 (WS) | 47 | 40 | 7 | **0** | 0 |
| 데이터베이스 (D) | 32 | 23 | 7 | **0** | 2 |
| 클라우드 (CL) | 14 | 11 | 3 | **0** | 0 |
| Unix/Linux (U) | 68 | 0 | 0 | 0 | 68 |
| Windows (W) | 73 | 0 | 0 | 0 | 73 |
| 보안 장비 (S) | 19 | 0 | 0 | 0 | 19 |
| 네트워크 장비 (N) | 40 | 0 | 0 | 0 | 40 |
| 제어시스템 (C) | 45 | 0 | 0 | 0 | 45 |
| PC/단말 (PC) | 18 | 0 | 0 | 0 | 18 |
| 가상화 (V) | 36 | 0 | 0 | 0 | 36 |
| **기술적 소계** | **392** | **74** | **17** | **0** | **302** |

> 실제 적용 가능 항목(91개) 기준 보안 적합률: **81.3%** (양호 74 / 91) ← 이전 65.6%에서 개선

### 관리적 취약점

| 구분 | 총계 | 양호 | 부분이행 | 취약 | 해당없음 |
|------|:----:|:----:|:--------:|:----:|:--------:|
| 정책·조직 (A-01~22) | 22 | 8 | 10 | 4 | 0 |
| 자산·위험 (A-23~43) | 21 | 6 | 12 | 3 | 0 |
| 인적 보안 (A-44~60) | 17 | 5 | 9 | 3 | 0 |
| 접근 제어 (A-61~85) | 25 | 12 | 10 | 3 | 0 |
| 운영 보안 (A-86~103) | 18 | 7 | 9 | 2 | 0 |
| 침해 대응 (A-104~127) | 24 | 6 | 14 | 4 | 0 |
| **관리적 소계** | **127** | **44** | **64** | **19** | **0** |

> 보안 적합률: **34.6%** (변동 없음 — 코드 외적 문서화 영역)

### 물리적 취약점

| 구분 | 총계 | 양호 | 부분이행 | 취약 | 해당없음 |
|------|:----:|:----:|:--------:|:----:|:--------:|
| 물리 보안 (B-01~09) | 9 | 0 | 0 | 0 | 9 |

> 클라우드 서비스(Vercel, Supabase) 사용으로 물리 보안은 서비스 제공자 책임 영역

---

## 전체 보안 점수

| 도메인 | 적용 항목 | 양호 | 보안 적합률 | 이전 점수 |
|--------|:---------:|:----:|:-----------:|:---------:|
| 기술적 | 91 | 74 | **81.3%** | 65.6% (+15.7%p) |
| 관리적 | 127 | 44 | **34.6%** | 34.6% (동일) |
| 물리적 | 0 | 0 | **N/A** | N/A |
| **종합** | **218** | **118** | **54.1%** | 47.7% (+6.4%p) |

---

## 핵심 발견 사항 (3차 평가 — 잔존 이슈)

> 🔴 CRITICAL: 0건 / 🟠 HIGH: 0건 / 🟡 MEDIUM: 3건 / 🔵 LOW: 4건

### 🟡 MEDIUM (계획적 조치)

**1. [D-13] findAuthUserByEmail() — Admin listUsers() 페이지네이션 의존**
- **파일**: `lib/supabaseAdminAuth.ts:32-73`
- **현황**: 페이지네이션(50개/페이지, 최대 100페이지)으로 개선됨. 그러나 사용자 수 증가 시 최대 5,000 Auth API 호출 가능
- **위험**: 대규모 사용자 기반 시 응답 지연, 불필요한 개인정보 로드
- **권장**: `profiles` 테이블 직접 조회(`findProfileByEmail`) 우선 적용, Auth 조회는 fallback으로만 사용
- **코드 증거**:
  ```typescript
  // lib/supabaseAdminAuth.ts:50
  const { data, error } = await adminSupabase.auth.admin.listUsers({ page, perPage });
  ```

**2. [CL-02] restoreToken HMAC 서명키로 Service Role Key 재사용**
- **파일**: `lib/auth/restoreToken.ts:6-12`
- **위험**: Service Role Key가 DB 접근 AND 토큰 서명 두 가지 용도로 사용. 키 로테이션 시 활성 복구 토큰 일괄 무효화. 키 재사용은 암호학적 원칙(키 분리) 위반
- **권장**: 별도 `RESTORE_TOKEN_SECRET` 환경변수 사용
- **코드 증거**:
  ```typescript
  // lib/auth/restoreToken.ts:8
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;  // DB 접근 키를 서명키로 재사용
  ```

**3. [WS-12] oauthTempSession 메모리 폴백 — 서버리스 불신뢰**
- **파일**: `lib/auth/oauthTempSession.ts:66-70`
- **현황**: Redis 미설정 시 메모리(`Map`)로 폴백
- **위험**: Vercel 서버리스는 함수 인스턴스가 격리됨 → 생성 인스턴스와 조회 인스턴스가 달라 세션 소멸 가능 → OAuth 복구 플로우 실패
- **권장**: Redis 미설정 시 명시적 예외 발생으로 운영자 인지 유도
- **코드 증거**:
  ```typescript
  // lib/auth/oauthTempSession.ts:65-70
  // Redis 없을 때 memoryStore에 저장 (서버리스에서 신뢰 불가)
  memoryStore.set(sessionKey, { ... });
  ```

---

### 🔵 LOW (개선 권장)

**4. [WS-01] delete-and-recreate 비표준 Admin 클라이언트 생성**
- **파일**: `app/api/auth/delete-and-recreate/route.ts:6-9`, `app/api/auth/mark-verified/route.ts:14-17`
- **현황**: 45개 파일 중 2개가 `createClient(url, serviceRoleKey)` 직접 사용 (나머지는 `createSupabaseAdminClient()` 헬퍼 사용)
- **위험**: 중앙화된 클라이언트 관리 불일치 — 향후 설정 변경 시 누락 가능
- **권장**: `createSupabaseAdminClient()` 헬퍼로 통일

**5. [WS-26] delete-and-recreate 에러 로깅 비표준**
- **파일**: `app/api/auth/delete-and-recreate/route.ts:133, 146, 158`
- **현황**: `console.error("Profile 삭제 실패:", profileDeleteError)` — 원본 에러 객체 직접 로깅
- **위험**: 서버 로그에 Supabase 에러 상세(hint, details)가 구조화되지 않은 형태로 기록
- **권장**: `handleApiError()` / `handleSupabaseError()` 헬퍼 통일 적용

**6. [WS-18] cleanup-temp-user API 키 비교 타이밍 공격**
- **파일**: `app/api/auth/cleanup-temp-user/route.ts:11-13`
- **위험**: `authHeader !== \`Bearer ${secret}\`` — 일반 문자열 비교 → 타이밍 공격으로 유효 키 추론 이론적 가능
- **권장**: `crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))` 사용
- **코드 증거**:
  ```typescript
  // route.ts:13
  if (!secret || authHeader !== `Bearer ${secret}`) {  // 타이밍 공격 취약
  ```

**7. [CL-13] 의존성 취약점 자동 스캔 미설정**
- **현황**: `package.json`에 보안 패치 override 설정 있음 (양호). 그러나 CI에서 자동 취약점 스캔 설정 불명확
- **권장**: GitHub Dependabot 활성화, CI에 `pnpm audit --audit-level=high` 추가

---

## 규정 준수 현황

| 규정/기준 | 상태 | 주요 미충족 사항 |
|-----------|:----:|-----------------|
| 주요정보통신기반시설 보호법 | ⚠️ 부분 준수 | 관리적 보안 체계 미비 |
| 개인정보보호법 (PIPA) | ⚠️ 부분 준수 | Auth listUsers() 최소 수집, 감사 로그 부재 |
| ISMS-P 인증 요구사항 | ❌ 미충족 | 정책·조직·위험관리 문서화 부족 |

---

## 조치 우선순위 로드맵 (3차 업데이트)

### Phase 1 — 즉시 수행 가능 (1주 이내)
- [ ] `lib/auth/restoreToken.ts` — `RESTORE_TOKEN_SECRET` 환경변수 분리
- [ ] `lib/auth/oauthTempSession.ts` — Redis 미설정 시 명시적 에러 발생
- [ ] `delete-and-recreate/route.ts`, `mark-verified/route.ts` — `createSupabaseAdminClient()` 헬퍼로 통일

### Phase 2 — 단기 (1개월 이내)
- [ ] `findAuthUserByEmail()` → `findProfileByEmail()` 우선 적용 (D-13 개선)
- [ ] `cleanup-temp-user` 타이밍 안전 비교 적용
- [ ] CI/CD에 `pnpm audit --audit-level=high` 추가
- [ ] GitHub Dependabot 활성화

### Phase 3 — 중기 (3개월 이내)
- [ ] 감사 로그 테이블 설계 및 구현 (관리자 액션 추적)
- [ ] 미들웨어 글로벌 인증 게이트 구현
- [ ] 보안 이벤트 Slack/Telegram 알림 시스템

### Phase 4 — 장기 (6개월 이내)
- [ ] 관리적 보안 정책 문서 작성 (정보보안 정책, 침해 대응 절차)
- [ ] 개인정보 컬럼 레벨 암호화 검토
- [ ] ISMS-P 인증 준비

---

## 세부 보고서 링크

| 도메인 | 파일 |
|--------|------|
| 웹 서비스 (WS) | `technical/web-service.md` |
| 데이터베이스 (D) | `technical/database.md` |
| 클라우드 (CL) | `technical/cloud.md` |
| 관리적 보안 (A) | `administrative/admin-security.md` |
| 물리적 보안 (B) | `physical/physical-security.md` |
