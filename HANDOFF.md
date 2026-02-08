# HANDOFF — 2026-02-08

## 현재 목표
QnA 및 FAQ 고객센터 기능 구현 완료

## 완료된 작업
- [x] DB 마이그레이션 (`supabase/migrations/009_support_qna_faq.sql`)
  - `faq_categories` 테이블 (4개 카테고리 초기 데이터 포함)
  - `faq_items` 테이블 (관리자만 작성)
  - `qna_questions` 테이블 (비밀글/익명 옵션)
  - `qna_answers` 테이블 (관리자만 작성)
  - RLS 정책 설정 완료
- [x] bcrypt 유틸 (`lib/password.ts`)
- [x] Support 도메인 (`features/support/`)
  - domain/support.ts: 타입 및 상수 정의
  - services/faq.service.ts, faq.server.ts: FAQ 조회/관리
  - services/qna.service.ts, qna.server.ts: QnA 조회/작성/답변
  - components/faq/: FAQAccordion, FAQCategoryTabs
  - components/qna/: QnAList, QnADetail, QnAWriteModal, QnAPasswordModal
  - components/SupportShell.tsx: 탭 전환 레이아웃
- [x] API 라우트 (`app/api/support/`)
  - faq/route.ts, categories/route.ts, admin/route.ts
  - qna/route.ts, [id]/route.ts, verify-password/route.ts, answer/route.ts
- [x] 페이지 (`app/support/`)
  - page.tsx (FAQ 메인, 아코디언 UI)
  - qna/page.tsx (QnA 목록)
  - qna/[id]/page.tsx (QnA 상세, 비밀번호 입력 모달)
- [x] Header.tsx NAV_ITEMS에 "고객센터" 추가
- [x] 쿠키 오류 수정 (`lib/supabaseServer.ts` - setAll try-catch 추가)
- [x] pnpm build 성공

## 수정된 파일 목록
- `supabase/migrations/009_support_qna_faq.sql` — 새 파일
- `lib/password.ts` — 새 파일 (bcrypt 유틸)
- `lib/supabaseServer.ts` — setAll에 try-catch 추가 (쿠키 오류 수정)
- `features/support/**` — 새 폴더 (도메인, 서비스, 컴포넌트)
- `app/support/**` — 새 폴더 (페이지)
- `app/api/support/**` — 새 폴더 (API)
- `components/shared/Header.tsx` — NAV_ITEMS에 고객센터 추가
- `package.json` — bcryptjs 추가

## 주의사항
- `009_support_qna_faq.sql`은 Supabase SQL Editor에서 직접 실행해야 DB에 반영됨
- FAQ 카테고리 초기 데이터: service, reservation, cost, privacy
- QnA 비밀글 비밀번호는 bcrypt로 해싱되어 저장
- 관리자(role='admin')만 FAQ 작성 및 QnA 답변 가능

## 기능 요약
| 기능 | 경로 | 설명 |
|------|------|------|
| FAQ | /support | 카테고리별 아코디언 UI |
| QnA 목록 | /support/qna | 질문 리스트, 비밀글 아이콘 표시 |
| QnA 작성 | /support/qna (모달) | 비밀글/익명 옵션, 로그인 필수 |
| QnA 상세 | /support/qna/[id] | 비밀글은 비밀번호 입력 필요, 관리자는 바로 열람 |
| 관리자 답변 | /support/qna/[id] | 관리자만 답변 작성 가능 |

## 다음 세션 시작 시
1. 이 파일 읽기
2. `pnpm build`로 상태 확인
3. Supabase에서 `009_support_qna_faq.sql` 실행 확인
4. FAQ 초기 콘텐츠 추가 (관리자 페이지 또는 직접 DB)
