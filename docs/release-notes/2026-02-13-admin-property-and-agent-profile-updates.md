# 패치노트 (2026-02-13)

## 배포 준비 상태
- 코드 변경 반영: 완료
- 타입 체크: 통과 (`pnpm typecheck`)
- 린트: 통과 (`pnpm lint`)
- 프로덕션 빌드: 성공 (`pnpm build`)

## 주요 변경사항

### 1) 관리자 현장 관리 탭 UX/필터/카드 구조 개편
- 대상 파일:
  - `app/admin/page.tsx`
  - `features/admin/services/admin.dashboard.ts`
- 변경 내용:
  - 현장 카드 기준/표시 로직을 현장 등록 목록과 맞추도록 정리
  - 필터를 `전체/미완성` 중심으로 단순화
  - 미완성 항목 요약 문구를 카드에 직접 노출
  - 불필요 상태 배지/문구 제거 및 카드 액션(삭제) 동선 정리
  - 상단 액션에 `새 현장 등록` 버튼 추가

### 2) 현장 상세 하위 페이지 지도 표시 강화
- 대상 파일:
  - `app/company/properties/[id]/location/page.tsx`
  - `app/company/properties/[id]/facilities/page.tsx`
  - `features/map/components/NaverMap.tsx`
- 변경 내용:
  - `현장 위치`, `홍보시설` 페이지에 저장 좌표 기반 지도/마커 노출
  - 조회용 지도는 고정(비인터랙티브)으로 동작하도록 옵션 추가
  - 홍보시설 마커 하단 텍스트를 시설명 대신 시설 유형으로 통일

### 3) 홍보시설 페이지 구조 개선
- 대상 파일: `app/company/properties/[id]/facilities/page.tsx`
- 변경 내용:
  - 평면 타입과 유사한 `요약 카드 + 편집 진입` 형태로 리팩터링
  - 카드 목록 2열 배치(편집 중 카드는 풀폭)
  - 상단 액션을 `⋯` 메뉴(수정/삭제)로 변경
  - `시설 추가`를 인라인 카드 생성에서 모달 입력 방식으로 전환
  - 운영 기간 줄바꿈/가독성 이슈 개선

### 4) 평면 타입 이미지 업로드 UI 통일
- 대상 파일:
  - `features/company/components/units/UnitTypesPage.tsx`
  - `features/company/components/units/UnitTypeCard.tsx`
  - `features/company/services/unitTypes.service.ts`
- 변경 내용:
  - 평면도 이미지 선택 영역을 현장 등록의 추가 사진 UI 패턴으로 통일
  - 빈 상태 박스/썸네일 그리드/삭제 버튼/카운트 노출 방식 정렬
  - 생성 모달과 수정 카드 모두 동일한 업로드 경험 제공

### 5) 상담사 프로필 작성 가이드 및 한 줄 소개 추가
- 대상 파일:
  - `features/profile/components/ProfilePage.client.tsx`
  - `features/offerings/components/detail/BookingModal.tsx`
  - `supabase/migrations/051_profiles_add_agent_summary.sql`
- 변경 내용:
  - 미리보기 옆 `ⓘ` 버튼 추가, 작성 가이드 모달 제공
  - 가이드 예시를 아코디언(신뢰형/영업형/차분형/전문가형)으로 구성
  - 각 유형에 한 줄 요약 문구 추가
  - `한 줄 소개(agent_summary)` 입력/저장/미리보기/고객 노출까지 연결
  - 상담사 소개(기타) 본문을 카드 스타일로 통일

### 6) 헤더 반응형 행동 조정 (태블릿)
- 대상 파일: `components/shared/Header.tsx`
- 변경 내용:
  - 태블릿 구간에서 우측 액션을 모바일 패턴(햄버거 메뉴 중심)으로 통일
  - 역할 버튼 텍스트 노출 기준을 `lg` 중심으로 조정

### 7) 메인 히어로 상담사 카드 실데이터 랜덤 연결
- 대상 파일:
  - `features/home/components/HeroSection.tsx`
  - `features/home/components/HeroCounselorPreview.tsx`
- 변경 내용:
  - 히어로 상담사 카드를 더미가 아닌 승인 상담사 실데이터로 연결
  - 새로고침 시마다 랜덤 4명 카드 노출
  - 배지(칩)는 상담사의 현재 승인 소속 현장명을 표시
  - 카드 본문은 상담사 한 줄 요약(`agent_summary`) 중심으로 노출
  - 레이아웃은 유지하고 텍스트/톤만 소폭 다듬음
  - 등록 상담사 0명일 때만 예시 더미 카드 fallback 노출

## DB 변경사항
- 신규 마이그레이션:
  - `supabase/migrations/051_profiles_add_agent_summary.sql`
- 내용:
  - `profiles.agent_summary VARCHAR(120)` 컬럼 추가
  - 컬럼 설명(comment) 추가

## 배포 전 최종 확인 권장
- 마이그레이션 적용:
  - `051_profiles_add_agent_summary.sql` 반영 여부 확인
- 상담사 프로필:
  - 한 줄 소개 저장/수정/노출(미리보기, 고객 상담사 프로필) 확인
  - `ⓘ` 모달 아코디언 펼침/접힘 동작 확인
- 관리자/현장관리:
  - `전체/미완성` 필터 및 미완성 요약 노출 확인
  - 새 현장 등록/카드 삭제 액션 확인
- 홍보시설:
  - 시설 추가 모달 저장, 카드 메뉴(수정/삭제), 지도 고정/마커 텍스트 확인
- 평면 타입:
  - 생성/수정 화면에서 평면도 이미지 업로드/삭제/카운트 표기 확인
- 메인 히어로 상담사 카드:
  - 새로고침 시 노출 카드가 랜덤 변경되는지 확인
  - 배지가 소속 현장명으로 표시되는지 확인
  - 등록 상담사 0명일 때만 더미 카드가 노출되는지 확인

## 참고
- 빌드 중 일부 API route에서 `DYNAMIC_SERVER_USAGE` 및 Supabase DNS 관련 로그가 출력될 수 있으나, 이번 검증에서는 빌드 자체는 성공했습니다.
