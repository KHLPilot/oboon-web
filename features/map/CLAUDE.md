# features/map/ — 지도 도메인 가이드

> 이 디렉토리 작업 시 루트 CLAUDE.md + 이 파일이 로드된다.

---

## 도메인 개요

지도 기반 분양 현장 탐색을 담당한다.

- 지도 위 현장 핀 렌더링
- 지오코딩 (주소 → 좌표)
- 주변 POI(관심 지점) 표시
- 위치 기반 현장 검색

---

## 도메인 용어

| 용어 | 설명 |
|------|------|
| poi | Point of Interest — 주변 편의시설, 교통 등 관심 지점 |
| geocoding | 주소 문자열 → 위도/경도 변환 |
| bounds | 지도 화면 범위 (북동/남서 좌표) |

---

## 레이어 구조

```
features/map/
  ├─ domain/       → MapBounds, GeoCoordinate 등 타입
  ├─ services/     → 지도 데이터 조회 (Supabase, 외부 API)
  ├─ mappers/      → DB row → 지도 핀 데이터
  └─ components/   → 지도 컴포넌트, 핀, 클러스터 UI
```

---

## 관련 경로

- 공개 페이지: `app/map`
- API: `app/api/geo/**`, `app/api/map/**`, `app/api/reco-pois/**`
- DB SSOT: `docs/db/README.md`

---

## 주의사항

- 지도 라이브러리(Kakao Map 등)는 **클라이언트 전용** — `dynamic(() => import(...), { ssr: false })` 필수
- 지오코딩 API 키는 서버(`app/api/geo/**`)에서만 사용 (클라이언트 노출 금지)
- 지도 bounds 변경 시 과도한 DB 쿼리 방지 — 디바운스 적용
