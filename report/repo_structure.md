# OBOON 저장소 구조 (주요 소스)

## 1) 최상위 개요

| 경로          | 설명                                              |
| ------------- | ------------------------------------------------- |
| `app/`        | 사용자가 브라우저에서 보는 화면(페이지)이 있는 곳 |
| `components/` | 버튼/카드처럼 재사용하는 UI 조각 모음             |
| `features/`   | 기능 단위로 묶인 로직(분양, 현장, 지도 등)        |
| `lib/`        | 외부 서비스 연결 같은 기반 코드                   |
| `shared/`     | 전역 공통 유틸(가격 포맷 등)                      |
| `types/`      | 공통 타입 정의                                    |
| `actions/`    | 서버에서 실행되는 작업(데이터 저장 등)            |
| `scripts/`    | 점검/자동화 스크립트                              |
| `public/`     | 이미지 같은 정적 파일                             |
| `report/`     | 리포트/점검 결과 저장                             |
| `guideline/`  | 아키텍처/협업 규칙 문서                           |

## 2) 화면과 라우트 (`app/`)

폴더 이름이 곧 URL 구조와 연결됩니다.

- `app/layout.tsx` : 전체 공통 레이아웃(헤더/푸터 등 기본 틀)
- `app/page.tsx` : 루트 화면(`/`)
- `app/offerings/` : 분양 리스트/상세 화면
- `app/company/` : 현장(회사) 관리 화면
- `app/map/` : 지도 화면
- `app/briefing/` : 브리핑 화면
- `app/auth/`, `app/login/` : 로그인/인증 화면
- `app/api/` : 서버 API 엔드포인트
- `app/components/` : 특정 페이지 전용 컴포넌트

## 3) 재사용 UI (`components/`)

화면마다 스타일이 달라지지 않도록 공통 UI를 모아둔 곳입니다.

- `components/ui/` : 기본 UI (Button/Input/Card/Badge/DatePicker 등)
- `components/shared/` : 공통 레이아웃/내비게이션 (PageContainer, Header 등)
- `components/company/` : 현장 관리 화면 전용 UI

## 4) 기능 단위 로직 (`features/`)

기능별 규칙/서비스/화면 구성 로직을 분리합니다.

- `features/offerings/` : 분양 도메인(상태 규칙, 서비스, 매핑)
- `features/property/` : 현장 도메인(진행 상태 계산 등)
- `features/map/` : 지도 관련 기능
- `features/briefing/` : 브리핑 관련 기능
- `features/home/` : 홈 화면 구성 로직

## 5) 기반 코드 (`lib/`)

- `lib/supabaseClient.ts` : 브라우저에서 쓰는 Supabase 연결
- `lib/supabaseServer.ts` : 서버에서 쓰는 Supabase 연결
- `lib/utils.ts` : 공통 유틸(현재는 비어 있음)

## 6) 공통 유틸 (`shared/`)

- `shared/price.ts` : 가격 표시를 통일하는 포맷 함수
- `shared/uxCopy.ts` : 여러 화면에서 재사용하는 공통 문구

## 7) 공통 타입 (`types/`)

- `types/index.ts` : 공용 타입 엔트리

## 8) 보조 폴더

- `actions/` : 서버 액션(데이터 저장/수정 같은 작업)
- `scripts/` : 정책 체크/자동화 스크립트
- `report/` : 리포트/점검 결과
- `guideline/` : 아키텍처/협업 규칙 문서

## 9) 주요 설정 파일

- `package.json` : 스크립트/의존성
- `next.config.js` : Next.js 설정
- `tailwind.config.js` : 디자인 시스템 설정
- `eslint.config.mjs` : 코드 검사 규칙
- `tsconfig.json` : TypeScript 설정
- `next-env.d.ts` : TypeScript 환경 정의 파일

## 10) .ts / .tsx 파일 목록과 역할

### 루트

- `next-env.d.ts` : TypeScript가 Next.js 환경을 이해하도록 돕는 선언 파일

### actions/

- `actions/property.ts` : 현장(프로퍼티) 관련 서버 작업

### lib/

- `lib/supabaseClient.ts` : 브라우저용 Supabase 연결
- `lib/supabaseServer.ts` : 서버용 Supabase 연결
- `lib/utils.ts` : 공통 유틸(현재 비어 있음)

### shared/

- `shared/price.ts` : 가격 표시 형식을 맞추는 함수
- `shared/uxCopy.ts` : 공통 UX 문구 모음

### types/

- `types/index.ts` : 공통 타입 정의 모음

### components/ui/

- `components/ui/Button.tsx` : 공통 버튼 UI
- `components/ui/Input.tsx` : 공통 입력창 UI
- `components/ui/Label.tsx` : 폼 라벨 UI
- `components/ui/Card.tsx` : 카드 레이아웃 UI
- `components/ui/Badge.tsx` : 상태 배지 UI
- `components/ui/DropdownMenu.tsx` : 드롭다운 메뉴 UI
- `components/ui/Modal.tsx` : 모달 UI
- `components/ui/DatePicker.tsx` : 날짜 선택 UI
- `components/ui/PercisionDateInput.tsx` : 월/일 정밀 입력용 날짜 필드
- `components/ui/datePrecision.ts` : 날짜 정밀도 계산/포맷 유틸

### components/shared/

- `components/shared/PageContainer.tsx` : 화면 공통 컨테이너
- `components/shared/Header.tsx` : 상단 헤더
- `components/shared/Footer.tsx` : 하단 푸터
- `components/shared/ThemeToggle.tsx` : 다크/라이트 모드 토글

### components/company/

- `components/company/units/UnitTypeCard.tsx` : 평면 타입 카드 UI
- `components/company/units/UnitTypeCreateForm.tsx` : 평면 타입 등록 폼

### features/offerings/

- `features/offerings/index.ts` : 분양 도메인 모듈 엔트리
- `features/offerings/FilterBar.tsx` : 분양 리스트 필터 UI
- `features/offerings/OfferingCard.tsx` : 분양 카드 UI
- `features/offerings/OfferingBadges.tsx` : 분양 상태 배지 UI
- `features/offerings/constants/offeringBadges.ts` : 분양 상태 배지 규칙
- `features/offerings/domain/offering.constants.ts` : 분양 상태/정책 상수
- `features/offerings/domain/offering.types.ts` : 분양 도메인 타입
- `features/offerings/mappers/offering.mapper.ts` : DB 데이터 → 화면 데이터 변환
- `features/offerings/services/offering.query.ts` : 분양 조회 쿼리 함수
- `features/offerings/services/offeringDetail.service.ts` : 분양 상세 서비스
- `features/offerings/detail/OfferingDetailLeft.tsx` : 상세 화면 좌측 영역
- `features/offerings/detail/OfferingDetailRight.tsx` : 상세 화면 우측 영역
- `features/offerings/detail/OfferingDetailTabs.client.tsx` : 상세 탭 UI
- `features/offerings/detail/BookingModal.tsx` : 예약 모달 UI

### features/property/

- `features/property/PropertyList.tsx` : 현장 리스트 UI
- `features/property/PropertyCard.tsx` : 현장 카드 UI
- `features/property/PropertyFilter.tsx` : 현장 필터 UI
- `features/property/domain/propertyStatus.ts` : 현장 상태 규칙
- `features/property/domain/property.types.ts` : 현장 도메인 타입
- `features/property/mappers/propertyProgress.ts` : 입력 진행 상태 계산

### features/map/

- `features/map/route.ts` : 지도 관련 라우팅/설정
- `features/map/MapLayer.tsx` : 지도 레이어 UI
- `features/map/MapOfferingCompactList.tsx` : 지도 옆 분양 리스트 UI
- `features/map/mappers/mapOffering.mapper.ts` : 지도용 데이터 변환

### features/briefing/

- `features/briefing/BriefingPostCard.tsx` : 브리핑 카드 UI
- `features/briefing/BriefingPostCardSkeleton.tsx` : 브리핑 로딩 스켈레톤
- `features/briefing/BriefingSeriesCard.tsx` : 브리핑 시리즈 카드
- `features/briefing/briefing.ui.tsx` : 브리핑 UI 유틸

### features/home/

- `features/home/HomeBriefingCompactCard.tsx` : 홈 브리핑 카드
- `features/home/HomeBriefingCompactSeriesCard.tsx` : 홈 브리핑 시리즈 카드

### app/components/

- `app/components/HeaderAuth.tsx` : 로그인 상태 헤더 영역
- `app/components/FormField.tsx` : 폼 필드 공통 래퍼
- `app/components/NaverMap.tsx` : 네이버 지도 연동 컴포넌트

### app (페이지)

- `app/layout.tsx` : 전역 레이아웃
- `app/page.tsx` : 홈 화면
- `app/login/page.tsx` : 로그인 화면
- `app/onboarding/page.tsx` : 온보딩 화면
- `app/profile/page.tsx` : 프로필 화면
- `app/briefing/page.tsx` : 브리핑 목록 화면
- `app/briefing/_data.ts` : 브리핑 더미/샘플 데이터
- `app/briefing/series/[id]/page.tsx` : 브리핑 시리즈 상세
- `app/offerings/page.tsx` : 분양 목록 화면
- `app/offerings/[id]/page.tsx` : 분양 상세 화면
- `app/map/page.tsx` : 지도 화면
- `app/admin/layout.tsx` : 관리자 영역 레이아웃

### app/auth/

- `app/auth/login/page.tsx` : 인증 로그인 화면
- `app/auth/signup/page.tsx` : 회원가입 화면
- `app/auth/onboarding/page.tsx` : 인증 온보딩 화면
- `app/auth/callback/page.tsx` : 인증 콜백 진입 화면
- `app/auth/callback/AuthCallbackClient.tsx` : 인증 콜백 클라이언트 처리

### app/company/properties/

- `app/company/properties/layout.tsx` : 현장 관리 공통 레이아웃
- `app/company/properties/page.tsx` : 현장 목록 화면
- `app/company/properties/new/page.tsx` : 새 현장 등록 화면
- `app/company/properties/propertyStatus.ts` : 현장 상태 라벨 규칙
- `app/company/properties/PropertyStatusSelect.tsx` : 상태 선택 UI
- `app/company/properties/[id]/page.tsx` : 현장 상세 요약 화면
- `app/company/properties/[id]/location/page.tsx` : 현장 위치 입력 화면
- `app/company/properties/[id]/facilities/page.tsx` : 홍보시설 입력 화면
- `app/company/properties/[id]/specs/page.tsx` : 건물 스펙 입력 화면
- `app/company/properties/[id]/timeline/page.tsx` : 분양 일정 입력 화면
- `app/company/properties/[id]/units/page.tsx` : 평면 타입 입력/관리 화면
- `app/company/properties/[id]/units/types.ts` : 평면 타입 데이터 타입
- `app/company/properties/[id]/units/utils.ts` : 평면 타입 유틸
- `app/company/properties/[id]/units/useUnitTypes.ts` : 평면 타입 훅
- `app/company/properties/[id]/units/errors.ts` : 평면 타입 에러 정의
- `app/company/properties/[id]/units/validation.ts` : 평면 타입 입력 검증

### app/api/

- `app/api/geo/address/route.ts` : 주소 검색 API
- `app/api/auth/create-profile/route.ts` : 프로필 생성 API
- `app/api/auth/ensure-profile/route.ts` : 프로필 존재 확인 API
- `app/api/auth/naver/login/route.ts` : 네이버 로그인 시작 API
- `app/api/auth/naver/callback/route.ts` : 네이버 로그인 콜백 API
