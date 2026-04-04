# features/briefing/ — 콘텐츠 도메인 가이드

> 이 디렉토리 작업 시 루트 CLAUDE.md + 이 파일이 로드된다.

---

## 도메인 개요

콘텐츠/게시글/카테고리 기반 정보 페이지를 담당한다.

- 카테고리별 게시글 목록
- 게시글 상세 (분양 정보, 뉴스, 가이드 등)
- SEO 최적화 콘텐츠 페이지

---

## 도메인 용어

| 용어 | 설명 |
|------|------|
| briefing | 콘텐츠 게시글 단위 |
| briefing_category | 게시글 분류 카테고리 |

---

## 레이어 구조

```
features/briefing/
  ├─ domain/       → BriefingCategory, 타입 정의
  ├─ services/     → 게시글 조회 (Supabase)
  ├─ mappers/      → DB row → view model
  └─ components/   → 게시글 카드, 상세 UI
```

---

## 관련 경로

- 공개 페이지: `app/briefing/**`
- DB SSOT: `docs/db/README.md` (briefings 테이블)

---

## 주의사항

- 콘텐츠 페이지는 SEO를 위해 SSR/SSG 우선
- 카테고리 슬러그 변경 시 기존 URL 리다이렉트 고려
