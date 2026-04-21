# OBOON 저장소 구조 (최신)

## 1) 최상위 개요

| 경로 | 설명 |
| --- | --- |
| `app/` | Next.js 라우트/페이지 및 앱 전역 리소스 |
| `components/` | 재사용 UI 컴포넌트 |
| `features/` | 도메인/기능 단위 모듈 |
| `lib/` | 기반 유틸/외부 연동 코드 |
| `shared/` | 공통 데이터/문구 유틸 |
| `types/` | 공용 타입 정의 |
| `actions/` | 서버 액션 모듈 |
| `public/` | 정적 리소스(이미지/폰트) |
| `docs/` | 진단/감사 문서 |
| `guideline/` | 팀 가이드/규칙 문서 |
| `report/` | 분석/보고서 결과 |
| `scripts/` | 진단/검사 스크립트 |
| `supabase/` | Supabase 설정/로컬 관련 파일 |
| `.git/` | Git 메타데이터(관리 대상 아님) |
| `.next/` | Next.js 빌드 산출물(관리 대상 아님) |
| `node_modules/` | 의존성 설치 폴더(관리 대상 아님) |

## 2) 라우트/화면 (app/)

- `app/layout.tsx` : 루트 레이아웃
- `app/globals.css` : 전역 스타일/토큰
- `app/page.tsx` : 홈(`/`)
- `app/map/page.tsx` : 지도 페이지
- `app/profile/page.tsx` : 프로필 페이지
- `app/offerings/page.tsx` : 분양 목록
- `app/offerings/[id]/page.tsx` : 분양 상세
- `app/briefing/page.tsx` : 브리핑 목록
- `app/briefing/general/[slug]/page.tsx` : 브리핑 일반 상세
- `app/briefing/oboon-original/page.tsx` : 오분 오리지널 목록
- `app/briefing/oboon-original/[categoryKey]/page.tsx` : 카테고리 목록
- `app/briefing/oboon-original/[categoryKey]/[slug]/page.tsx` : 오리지널 상세
- `app/briefing/admin/posts/new/page.tsx` : 브리핑 작성 화면
- `app/briefing/admin/posts/new/PostEditor.client.tsx` : 에디터 클라이언트
- `app/auth/login/page.tsx` : 로그인
- `app/auth/signup/page.tsx` : 회원가입
- `app/auth/onboarding/page.tsx` : 온보딩
- `app/auth/callback/page.tsx` : 인증 콜백
- `app/auth/callback/AuthCallbackClient.tsx` : 콜백 클라이언트
- `app/admin/layout.tsx` : 관리자 레이아웃
- `app/admin/page.tsx` : 관리자 메인
- `app/admin/serverActions.ts` : 관리자 서버 액션
- `app/company/properties/layout.tsx` : 회사/현장 레이아웃
- `app/company/properties/page.tsx` : 현장 목록
- `app/company/properties/new/page.tsx` : 현장 신규 등록
- `app/company/properties/propertyStatus.ts` : 현장 상태 규칙
- `app/company/properties/PropertyStatusSelect.tsx` : 상태 선택 UI
- `app/company/properties/[id]/page.tsx` : 현장 상세
- `app/company/properties/[id]/location/page.tsx` : 위치 입력
- `app/company/properties/[id]/facilities/page.tsx` : 시설 입력
- `app/company/properties/[id]/specs/page.tsx` : 스펙 입력
- `app/company/properties/[id]/timeline/page.tsx` : 일정 입력
- `app/company/properties/[id]/units/page.tsx` : 유닛 입력/관리
- `app/company/properties/[id]/units/types.ts` : 유닛 타입 정의
- `app/company/properties/[id]/units/utils.ts` : 유닛 유틸
- `app/company/properties/[id]/units/useUnitTypes.ts` : 유닛 훅
- `app/company/properties/[id]/units/errors.ts` : 유닛 에러 정의
- `app/company/properties/[id]/units/validation.ts` : 유닛 입력 검증
- `app/components/HeaderAuth.tsx` : 헤더 인증 영역
- `app/components/FormField.tsx` : 폼 필드 래퍼
- `app/components/AddressBox.tsx` : 주소 입력 박스
- `app/components/ProfileChecker.tsx` : 프로필 체크
- `app/components/NaverMap.tsx` : 네이버 지도 연동
- `app/favicon.ico` : 파비콘

## 3) 서버 라우트 (app/api/)

- `app/api/admin/approve-agent/route.ts`
- `app/api/admin/agent-peding/route.ts`
- `app/api/auth/check-email/route.ts`
- `app/api/auth/check-verification/route.ts`
- `app/api/auth/create-verification-token/route.ts`
- `app/api/auth/mark-verified/route.ts`
- `app/api/auth/cleanup-temp-user/route.ts`
- `app/api/auth/google/callback/route.ts`
- `app/api/auth/naver/login/route.ts`
- `app/api/auth/naver/callback/route.ts`
- `app/api/geo/address/route.ts`
- `app/api/geo/reverse/route.ts`
- `app/api/profile/check-nickname/route.ts`
- `app/api/profile/delete-account/route.ts`
- `app/api/r2/upload/route.ts`

## 4) 공통 UI (components/)

- `components/ui/` : 기본 UI (Button, Input, Card, Badge, DropdownMenu, Modal, DatePicker, Toast 등)
  - `components/ui/Button.tsx`
  - `components/ui/Input.tsx`
  - `components/ui/Label.tsx`
  - `components/ui/Card.tsx`
  - `components/ui/Badge.tsx`
  - `components/ui/DropdownMenu.tsx`
  - `components/ui/Modal.tsx`
  - `components/ui/DatePicker.tsx`
  - `components/ui/PercisionDateInput.tsx`
  - `components/ui/Toast.tsx`
  - `components/ui/datePrecision.ts`
- `components/shared/` : 공용 레이아웃/내비게이션
  - `components/shared/PageContainer.tsx`
  - `components/shared/Header.tsx`
  - `components/shared/Footer.tsx`
  - `components/shared/ThemeToggle.tsx`
- `components/company/units/` : 현장/유닛 관련 UI
  - `components/company/units/UnitTypeCard.tsx`
  - `components/company/units/UnitTypeCreateForm.tsx`
- `components/briefing/AdminPostActions.client.tsx` : 브리핑 관리 액션

## 5) 기능 단위 (features/)

- `features/offerings/` : 분양 도메인
  - 리스트/필터/UI: `FilterBar.tsx`, `OfferingCard.tsx`, `OfferingBadges.tsx`
  - 상세 UI: `detail/OfferingDetailLeft.tsx`, `detail/OfferingDetailRight.tsx`, `detail/OfferingDetailTabs.client.tsx`, `detail/BookingModal.tsx`
  - 서비스/쿼리: `services/offering.query.ts`, `services/offeringDetail.service.ts`
  - 도메인/상수: `domain/offering.types.ts`, `domain/offering.constants.ts`, `constants/offeringBadges.ts`
  - 매퍼: `mappers/offering.mapper.ts`
- `features/property/` : 현장 도메인
  - UI: `PropertyCard.tsx`
  - 도메인/규칙: `domain/property.types.ts`, `domain/propertyStatus.ts`
  - 매퍼: `mappers/propertyProgress.ts`
- `features/map/` : 지도 도메인
  - UI: `MapLayer.tsx`, `MapOfferingCompactList.tsx`
  - 라우트 설정: `route.ts`
  - 매퍼: `mappers/mapOffering.mapper.ts`
- `features/briefing/` : 브리핑 도메인
  - UI: `BriefingCardGrid.tsx`, `BriefingPostCard.tsx`, `BriefingPostCardSkeleton.tsx`, `briefing.ui.tsx`
  - 타입: `types.ts`
  - 오리지널: `oboon-original/FeaturedHero.tsx`, `oboon-original/BriefingOriginalCard.tsx`
- `features/home/` : 홈 요약 카드
  - `HomeBriefingCompactCard.tsx`, `HomeBriefingCompactOriginalCard.tsx`

## 6) 기반/공유 코드

- `lib/` : 유틸/외부 연동
  - `lib/utils.ts`
  - `lib/supabaseClient.ts`
  - `lib/supabaseServer.ts`
  - `lib/validators/profileValidation.ts`
  - `lib/validators/banndedWords.ts`
- `shared/` : 공통 데이터
  - `shared/price.ts`
  - `shared/uxCopy.ts`
- `types/index.ts` : 공용 타입
- `actions/property.ts` : 서버 액션

## 7) 기타 리소스/문서

- `public/` : 로고/아이콘/폰트
  - `public/logo.svg`
  - `public/fonts/suit/*.woff2`
- `docs/` : 인코딩 감사 결과
  - `docs/encoding-audit.md`
  - `docs/encoding-audit.json`
- `guideline/` : 프로젝트 가이드 문서
- `report/` : 분석/리포트 산출물
- `scripts/` : 검사 스크립트
  - `scripts/encoding-audit.js`
  - `scripts/ssot-check.js`
- `supabase/` : Supabase 로컬 설정
  - `supabase/config.toml`
  - `supabase/.gitignore`
- 루트 SQL 파일
  - `schema_public.sql`
  - `briefing_schema.sql`

## 8) 주요 설정 파일

- `package.json`, `package-lock.json`
- `next.config.js`
- `tailwind.config.js`
- `postcss.config.mjs`
- `eslint.config.mjs`
- `tsconfig.json`
- `README.md`
- `TECHDEBT.md`
- `Token Guideline2.md`
