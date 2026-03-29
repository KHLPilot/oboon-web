# 데이터베이스 취약점 분석 (D-01 ~ D-32)

> 평가 대상: OBOON oboon-web — Supabase Cloud (PostgreSQL 15)
> 평가 일자: 2026-03-29 (3차 평가)
> 평가 기준: KISA 주요정보통신기반시설 기술적 취약점 분석·평가 방법 상세 가이드

---

## 평가 요약

| 구분 | 총계 | 양호 | 부분이행 | 취약 | 해당없음 |
|------|:----:|:----:|:--------:|:----:|:--------:|
| 계정 관리 (D-01~10) | 10 | 8 | 2 | 0 | 0 |
| 접근 제어 (D-11~18) | 8 | 5 | 3 | 0 | 0 |
| 암호화 (D-19~22) | 4 | 4 | 0 | 0 | 0 |
| 패치 및 로그 (D-23~32) | 10 | 6 | 2 | 0 | 2 |
| **합계** | **32** | **23** | **7** | **0** | **2** |

**이전(2차) 대비**: 취약 2→0, 양호 21→23

---

## 1. 계정 관리 (D-01 ~ D-10)

### D-01: 기본 계정 변경/삭제
- **판정: 양호 ✅**
- Supabase 관리형 서비스 — 기본 DB 계정은 Supabase가 관리
- 애플리케이션 수준: anon key(RLS 적용), service role key(서버 전용)

### D-02: 불필요한 계정 제거
- **판정: 양호 ✅**
- Supabase Cloud: 불필요 계정 프로비저닝 없음 (관리형)
- `SUPABASE_SERVICE_ROLE_KEY`: 서버 API 라우트 전용 사용

### D-03: 강력한 패스워드 정책
- **판정: 양호 ✅**
- Supabase Auth 패스워드 정책 적용
- 사용자 패스워드: bcryptjs 해싱 (`lib/password.ts`)

### D-04: 패스워드 복잡도
- **판정: 양호 ✅**
- `lib/validators/profileValidation.ts` 입력 유효성 검증
- Supabase Auth 최소 길이 정책

### D-05: 계정 잠금 정책
- **판정: 부분이행 ⚠️**
- Upstash Rate Limiting으로 브루트포스 차단 (IP당 분당 5회, fail-secure)
- Supabase Auth 레벨 계정 잠금: Supabase 콘솔에서 별도 확인 필요

### D-06~10: 기타 계정 관리
- **판정: 부분이행 ⚠️**
- 역할(admin, agent, company, customer) 분리 — 코드 레벨 검증
- `requireAdminRoute()` 중앙화 관리자 인증 헬퍼

---

## 2. 접근 제어 (D-11 ~ D-18)

### D-11: RLS (Row Level Security) 활성화
- **판정: 양호 ✅**
- 모든 테이블 RLS 활성화 (`docs/db/README.md` 기준 문서)
- 클라이언트: anon key + RLS 자동 필터링
- 이중 보호: 코드 레벨 소유권 확인 + DB 레벨 RLS

### D-12: 최소 권한 원칙
- **판정: 양호 ✅**
- 클라이언트: anon key (RLS 제약)
- 서버: service role key (API 라우트 전용)
- `"server-only"` import — Admin 클라이언트 클라이언트 번들 포함 방지

### D-13: 사용자 조회 최소화
- **판정: 부분이행 ⚠️** ← 이전: 취약 → 개선됨
- **개선**: `findAuthUserByEmail()`에 페이지네이션 적용 (50개/페이지, 최대 100페이지, 조기 종료):
  ```typescript
  // lib/supabaseAdminAuth.ts:49-71
  for (let page = 1; page <= maxPages; page += 1) {
    const { data } = await adminSupabase.auth.admin.listUsers({ page, perPage: 50 });
    const found = users.find(u => u.email === normalizedEmail);
    if (found) return found;          // 조기 종료
    if (users.length < perPage) return null;  // 마지막 페이지
  }
  ```
- **잔존 이슈**: 대규모 사용자 기반 시 최대 5,000 Auth API 호출
- `findProfileByEmail()` 헬퍼 존재하나 일부 라우트 미적용 — profiles 직접 조회 권장

### D-14: 원격 접속 제어
- **판정: 양호 ✅**
- Supabase: IP 화이트리스트 (Supabase 콘솔)
- 앱 레벨: HTTPS API만 노출, 직접 DB 포트 미노출

### D-15: 접근 로그
- **판정: 부분이행 ⚠️**
- Supabase 자체 쿼리/액세스 로그 (관리형)
- 애플리케이션 레벨 감사 로그: 기본 `console.info/error`만
  - 역할 변경: `[admin/approve-agent] 역할 승인: { adminId, targetId }`
  - 상담 상태 변경, 계정 복구/삭제 로그: 미구현

### D-16: 중요 데이터 접근 제어
- **판정: 양호 ✅**
- `profiles`: RLS + 본인 데이터만 접근
- `consultations`: agent_id/customer_id 기반 RLS

### D-17: DB 연결 암호화
- **판정: 양호 ✅**
- Supabase API: HTTPS + WSS (Realtime)

### D-18: 공유 계정 금지
- **판정: 양호 ✅**
- 사용자별 UUID 격리, RLS 적용

---

## 3. 암호화 (D-19 ~ D-22)

### D-19: 저장 데이터 암호화
- **판정: 양호 ✅**
- Supabase Cloud: AES-256 (인프라 레벨)
- 패스워드: bcryptjs

### D-20: 전송 암호화
- **판정: 양호 ✅**
- 모든 Supabase API 통신: HTTPS/TLS 1.3

### D-21: 암호화 키 관리
- **판정: 양호 ✅**
- 환경변수 관리, Vercel 암호화 저장

### D-22: 개인정보 암호화
- **판정: 양호 ✅**
- Supabase Storage 암호화 + RLS 접근 제어

---

## 4. 패치 및 로그 관리 (D-23 ~ D-32)

### D-23: DB 패치 관리
- **판정: 양호 ✅**
- Supabase Cloud: 자동 패치 (관리형)

### D-24: DB 감사 로그
- **판정: 부분이행 ⚠️**
- Supabase 내장 로그 (성능/오류)
- 애플리케이션 레벨 감사 로그 미구현
- **권장**: `audit_logs` 테이블 설계

### D-25~30: 마이그레이션/버전 관리
- **판정: 양호 ✅**
- `supabase/migrations/**` 타임스탬프 형식 관리
- 테스트 DB 선적용 후 메인 DB 적용 정책

### D-31~32: 기타
- **판정: 해당없음 N/A**
- Supabase 관리형으로 직접 설정 불가

---

## 주요 잔존 이슈

### MEDIUM: D-13
```
파일: lib/supabaseAdminAuth.ts:32-73
현황: 페이지네이션 적용(50/page, max 100 page) — 이전 무제한에서 개선
잔존: 사용자 증가 시 최대 5,000 API 호출 가능
권장: findProfileByEmail() (profiles 테이블 직접 단건 조회) 우선 적용
```

### LOW: D-15
```
현황: console.info/error 기본 로깅
위험: 관리자 액션, 보안 이벤트 추적 어려움
권장: audit_logs 테이블 + insert 트리거 또는 서비스 레이어 로깅
```
