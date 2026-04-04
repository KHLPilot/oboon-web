# features/offerings/ — 분양현장 도메인 가이드

> 이 디렉토리 작업 시 루트 CLAUDE.md + 이 파일이 로드된다.

---

## 도메인 개요

분양 현장(offerings) 정보 조회·지도 노출·상세 페이지를 담당한다.

- 분양 현장 목록/검색/필터
- 지도 위 현장 핀 표시
- 현장 상세 정보 (위치, 분양가, 평형 등)
- 맞춤 현장 추천 (reco 연계)

---

## 도메인 용어

| 용어 | 설명 |
|------|------|
| offering | 분양 현장 단위 |
| offering_status | 현장 상태 (분양 중 / 완료 등) |
| poi | 주변 관심 지점 (Point of Interest) |
| reco | 사용자 조건 기반 맞춤 추천 현장 |

---

## 레이어 구조

```
features/offerings/
  ├─ domain/       → OfferingStatus, 필터 정책 등
  ├─ services/     → 현장 조회/검색 (Supabase)
  ├─ mappers/      → DB row → view model
  └─ components/   → 현장 카드, 지도 핀, 상세 UI
```

---

## 관련 경로

- 공개 페이지: `app/offerings/**`
- 회사 관리: `app/company/properties/**`
- API: `app/api/offerings/**`, `app/api/geo/**`, `app/api/map/**`
- 추천: `features/reco/`, `app/api/reco-pois/**`
- DB SSOT: `docs/db/README.md` (offerings 테이블)

---

## 주의사항

- 지도 핀 렌더링은 클라이언트 전용 (SSR 시 window 객체 참조 오류 주의)
- 현장 승인 상태(admin 승인 필요) 확인 후 노출 여부 결정
- 추천 로직은 `features/reco/` 또는 `features/recommendations/`에서 관리
