# SSOT 규칙 위반 수정 요약

## 변경 이유

- ARCHITECTURE.md / CONTRIBUTING.md 기준에 따라 status/region 정책은 domain에만 두고, page/components에서는 직접 해석/가공을 금지.
- 직접 문자열("READY/OPEN/CLOSED") 및 캐스팅(as)은 타입 안정성을 해치므로 SSOT 상수/guard로 통일.
- page.tsx에서 row 가공 로직을 제거하고 mappers로 이동해 계층 책임을 분리.

## 변경된 파일

- features/property/domain/propertyStatus.ts
- app/company/properties/propertyStatus.ts
- app/company/properties/new/page.tsx
- features/property/mappers/propertyProgress.ts
- app/company/properties/page.tsx
- app/company/properties/[id]/page.tsx
- features/offerings/constants/offeringBadges.ts
- features/offerings/domain/offering.constants.ts
- features/offerings/FilterBar.tsx
- features/offerings/detail/OfferingDetailLeft.tsx
- features/map/mappers/mapOffering.mapper.ts
- app/map/page.tsx
- types/index.ts

## 주요 변경 내용

- status/region 정책을 domain/mappers로 이동하고, 직접 문자열·캐스팅을 제거.
- page.tsx 내 row 가공 로직을 mappers로 분리(현장 목록/상세, 지도).
- types/index.ts에서 도메인 enum 재정의 제거(Offering 인터페이스만 domain 타입 직접 사용).

## 확인 사항

- pnpm typecheck
- pnpm lint
