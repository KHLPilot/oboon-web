# QA Scope Definition v1

작성일: 2026-02-08  
목적: 런칭 전 QA 체크리스트 작성 대상 범위를 기능/페이지/사용자 흐름 기준으로 명확히 정의한다.

## 1) 범위 기준
- 대상 사용자: 비회원 + 회원 + 역할별 사용자(일반/상담사/관리자)
- 기준 단위: 사용자 액션이 발생하는 UI 흐름(클릭, 입력, 이동, 토글, 저장, 취소)
- 제외 대상: API 내부 구현, DB 스키마, RLS 정책 검증
- 추측 금지: 코드/라우트에서 확인 가능한 흐름만 포함

## 2) 포함 범위 (기능 그룹 + 라우트)

### A. 글로벌/공통 네비게이션
- `/` (홈 진입)
- 공통 헤더 네비게이션(분양 리스트/지도/커뮤니티/고객센터 이동)
- 헤더 우측 액션(알림 패널, 테마 토글, 로그인/프로필 진입 흐름)

### B. Auth
- `/auth/login`
- `/auth/signup`
- `/auth/signup/profile`
- `/auth/onboarding`
- `/auth/callback`
- 포함 흐름: 로그인, 회원가입, 온보딩 입력/진입/완료 동선

### C. Offerings
- `/offerings`
- `/offerings/[id]`
- 포함 흐름: 목록 노출, 필터/정렬/탐색 UI, 상세 진입, 예약 모달 진입/단계 이동

### D. Map
- `/map`
- 포함 흐름:
  - 데스크탑: 마커 클릭 시 미리보기 카드 노출까지
  - 모바일: 확장 지도 상태에서 마커 클릭 시 상세 이동
  - 마커-리스트 연동은 정성(눈으로 확인) 체크 항목으로만 포함

### E. Community
- `/community`
- `/community/profile`
- 포함 흐름:
  - 읽기: 목록/상세 진입 동선, 프로필 이동
  - 작성: 작성 진입 후 임시저장/취소/뒤로가기 UX
  - 비회원: 읽기 가능, 작성 불가 전제 포함
  - 이미지 업로드 항목은 작성 범위에 포함하지 않음

### F. Consultations / Chat
- `/my/consultations`
- `/chat/[consultationId]`
- 포함 흐름: 예약 목록 조회, 예약 상태별 액션 진입, 채팅방 이동/상호작용 UI

### G. Agent 전용
- `/agent/consultations`
- `/agent/profile`
- 포함 흐름: 상담사 예약 관리, 상담사 프로필/소속/현장 등록 관련 UI 동선

### H. Company Properties
- `/company/properties`
- `/company/properties/new`
- `/company/properties/[id]`
- `/company/properties/[id]/location`
- `/company/properties/[id]/specs`
- `/company/properties/[id]/timeline`
- `/company/properties/[id]/units`
- `/company/properties/[id]/facilities`
- `/company/properties/[id]/comment`
- 포함 흐름: 현장 등록/편집/요청/상세 섹션 편집 동선

### I. Support
- `/support`
- `/support/faq`
- `/support/qna`
- `/support/qna/[id]`
- 포함 흐름: FAQ 탐색, QnA 작성/조회/상세 확인 동선

### J. Profile
- `/profile`
- 포함 흐름: 내 정보 조회/수정, 계정 관련 사용자 액션

### K. Admin (어드민 전용 포함)
- `/admin`
- 포함 흐름: 관리자 대시보드 탭 전환, 목록/상세 모달, 승인/반려/처리 액션 UI

## 3) 제외 범위
- Briefing 전체 라우트 제외
  - `/briefing/page`
  - `/briefing/oboon-original/*`
  - `/briefing/general/[slug]`
  - `/briefing/admin/posts/new`
- API/DB/RLS 구현 검증 제외

## 4) 라우트 인벤토리 요약
- 사용자 페이지 라우트 총 35개 중:
  - 포함: 30개
  - 제외(briefing): 5개
  - 보류: 0개

## 5) 체크리스트 작성 시 변환 규칙
- 다음 단계에서 각 포함 라우트의 사용자 액션을 row 단위로 분해한다.
- 동일 라우트라도 이벤트가 다르면 별도 항목으로 분리한다.
- 플랫폼 조건(모바일/데스크탑), 회원 조건(비회원/회원/역할)은 비고 성격으로 유지한다.
