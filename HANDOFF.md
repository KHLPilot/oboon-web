# HANDOFF — 2026-02-06

## 현재 목표
법적 분쟁 대응용 약관 동의 기록 시스템 구현 완료

## 완료된 작업
- [x] DB 마이그레이션 (`supabase/migrations/007_term_consents.sql`)
  - terms 테이블에 version 컬럼 추가 (버전 관리)
  - term_consents 테이블 생성 (동의 기록 + 법적 증거)
  - 회원가입 약관 4개 초기 데이터 삽입
- [x] 동의 기록 API (`app/api/term-consents/route.ts`)
  - POST: 약관 동의 기록 저장 (IP, User-Agent, 스냅샷)
  - GET: 본인 동의 기록 조회
- [x] 예약 생성 API 수정 (`app/api/consultations/route.ts`)
  - `agreed_to_terms` 서버 사이드 필수 검증
  - 예약 생성 시 customer_reservation 동의 기록 자동 저장
- [x] 예약 승인 API 수정 (`app/api/consultations/[id]/route.ts`)
  - 상담사 승인 시 `agreed_to_terms` 필수 검증
  - 승인 시 agent_visit_fee 동의 기록 자동 저장
- [x] 관리자 페이지 개선 (`app/admin/page.tsx`)
  - 약관 버전 표시 (v1, v2 등)
  - 회원가입 약관 4개 표시 (signup_terms, signup_privacy, signup_location, signup_marketing)
  - 예약/상담사 약관 분리 표시
- [x] 회원가입 페이지 개선 (`features/auth/components/SignupProfileClient.tsx`)
  - 각 약관 "보기" 버튼 추가 → 모달로 내용 표시
  - 회원가입 완료 시 약관 동의 기록 API 호출
- [x] 예약 모달 수정 (`features/offerings/components/detail/BookingModal.tsx`)
  - API 호출 시 `agreed_to_terms: true` 추가
- [x] 상담사 페이지 수정 (`app/agent/consultations/page.tsx`)
  - 승인 API 호출 시 `agreed_to_terms: true` 추가
- [x] pnpm build 성공

## 수정된 파일 목록
- `supabase/migrations/007_term_consents.sql` — 새 파일. terms 버전 + term_consents 테이블
- `app/api/term-consents/route.ts` — 새 파일. 동의 기록 API
- `app/api/consultations/route.ts` — agreed_to_terms 검증 + 동의 기록
- `app/api/consultations/[id]/route.ts` — 상담사 승인 시 동의 기록
- `app/api/admin/terms/route.ts` — 활성 버전만 조회하도록 수정
- `app/admin/page.tsx` — 버전 표시 + 회원가입 약관 UI
- `features/auth/components/SignupProfileClient.tsx` — 약관 보기 버튼 + 동의 기록 API
- `features/offerings/components/detail/BookingModal.tsx` — agreed_to_terms 추가
- `app/agent/consultations/page.tsx` — agreed_to_terms 추가

## 주의사항
- `007_term_consents.sql`은 Supabase SQL Editor에서 직접 실행해야 DB에 반영됨
- terms 테이블 스키마 변경: version 컬럼 추가, UNIQUE(type, version)
- 기존 lint 오류는 프로젝트 기존 코드의 any 타입 등 (새 코드와 무관)

## 약관 타입 정리
| type | 용도 | 필수 |
|------|------|------|
| signup_terms | 회원가입 - 서비스 이용약관 | 필수 |
| signup_privacy | 회원가입 - 개인정보 수집·이용 | 필수 |
| signup_location | 회원가입 - 위치정보 이용 | 필수 |
| signup_marketing | 회원가입 - 마케팅 수신 | 선택 |
| customer_reservation | 고객 예약금 안내 | 필수 |
| agent_visit_fee | 상담사 방문성과비 약관 | 필수 |

## 다음 세션 시작 시
1. 이 파일 읽기
2. `pnpm build`로 상태 확인
3. Supabase에서 `007_term_consents.sql` 실행 확인
4. E-2 (FAQ/Q&A) 진행 또는 다른 작업
