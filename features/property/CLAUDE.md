# features/property/ — 매물 도메인 가이드

> 이 디렉토리 작업 시 루트 CLAUDE.md + 이 파일이 로드된다.

---

## 도메인 개요

개별 매물(property) 상세 정보를 담당한다.

- 매물 등록/수정/삭제 (회사 역할)
- 매물 상세 정보 (평형, 가격, 층, 방향 등)
- 매물-상담사 연결
- 매물 요청(고객 → 상담사)

---

## 도메인 용어

| 용어 | 설명 |
|------|------|
| property | 개별 분양 매물 단위 |
| property_agent | 매물 담당 상담사 연결 |
| property_request | 고객의 매물 상담 요청 |

---

## 레이어 구조

```
features/property/
  ├─ domain/       → PropertyStatus, 유효성 규칙 등
  ├─ services/     → 매물 조회/등록/수정 (Supabase)
  ├─ mappers/      → DB row → view model
  └─ components/   → 매물 카드, 등록 폼, 상세 UI
```

---

## 관련 경로

- 회사 관리: `app/company/properties/**`
- 상담사 뷰: `app/agent/properties/**`
- API: `app/api/property/**`, `app/api/property-agents/**`, `app/api/property-requests/**`
- DB SSOT: `docs/db/README.md` (properties 테이블)

---

## 주의사항

- 매물 등록/수정은 회사 역할만 가능 (RLS 확인)
- 매물-상담사 연결(`property_agents`) 변경 시 기존 연결 정리 필요
- 이미지 업로드는 `app/api/r2/upload` 경유
