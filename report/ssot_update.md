# SSOT 적용 결과 요약

## 생성한 파일
- 없음

## 변경한 파일
- app/page.tsx
- features/offerings/OfferingCard.tsx
- app/map/page.tsx
- features/map/MapOfferingCompactList.tsx
- features/offerings/constants/offeringBadges.ts
- features/offerings/domain/offering.constants.ts

## 주요 변경 요약
- Region 필터가 SSOT 탭(OFFERING_REGION_TABS)과 OfferingRegionTab 타입을 직접 사용하도록 정리.
- status 값 정규화는 normalizeOfferingStatusValue + OfferingStatusValue로 통일, 직접 캐스팅 제거.
- OfferingCard의 region 라벨 처리에서 any 캐스팅 제거.

## 남은 TODO
- pnpm typecheck / pnpm lint 실행 및 오류 확인.
- SSOT 문자열 직접 노출 여부(READY/OPEN/CLOSED) 잔여 코드 점검.
