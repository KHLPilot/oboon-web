# 브리핑 페이지 리디자인 스펙

**날짜**: 2026-03-29
**상태**: 승인됨

---

## 목표

`/briefing` 메인 페이지에 일반 브리핑과 oboon-original을 통합한다.
현재 두 섹션이 독립적인 섬처럼 분리되어 있어 oboon-original로의 진입 동선이 없는 문제를 해결한다.

---

## 변경 범위

### 변경 대상
- `app/briefing/page.tsx` — 페이지 구조 개편
- `features/briefing/services/briefing.home.ts` — 카테고리 데이터 추가 fetch
- `features/briefing/components/BriefingHeroPost.tsx` — oboon_original 글만 노출하도록 필터 (또는 page에서 필터 후 전달)

### 유지 대상
- `app/briefing/oboon-original/**` — 카테고리 진입 후 상세 경로 그대로 유지
- `features/briefing/components/BriefingCardGrid.tsx` — 변경 없음
- `features/briefing/components/oboon-original/BriefingOriginalCard.tsx` — 재활용
- `components/shared/PageContainer.tsx` — 컨텐츠 폭 그대로 사용

---

## 새 페이지 구조

```
<main bg-(--oboon-bg-page)>
  <PageContainer pb-20>

    ① 오리지널 히어로
       - oboon_original 보드의 최신 published 글 1개
       - 기존 BriefingHeroPost 컴포넌트 재활용 또는 동일 스타일 적용
       - page=1일 때만 노출 (현재 동작 유지)
       - oboon_original 글이 없으면 히어로 섹션 전체 미노출 (null 처리)

    ② OBOON Original 카테고리 섹션
       - 섹션 헤더: "OBOON Original" + "전체 보기 →" (/briefing/oboon-original 링크)
       - BriefingOriginalCard 3열 그리드
       - 카테고리 목록 + 각 카테고리별 글 수

    ─────── 구분선 ───────

    ③ 검색바
       - BriefingSearchInput (기존 위치에서 아래로 이동)

    ④ 일반 브리핑 섹션
       - 섹션 헤더: "일반 브리핑" + 설명 텍스트 (기존 유지)
       - BriefingCardGrid (2열, 페이지네이션 포함)

  </PageContainer>
</main>
```

---

## 데이터 요구사항

`fetchBriefingHomeData`에 다음 데이터 추가:
- `oboonOriginalCategories`: 카테고리 목록 (key, name, id)
- `categoryCountMap`: 카테고리별 글 수 (Map<categoryId, count>)
- `heroPost` 필터: oboon_original 보드의 글만 히어로로 사용

기존 반환값:
- `isAdmin`, `heroPost`, `generalPosts`, `generalTotalCount`, `pageSize` — 유지

---

## 라우팅 변경사항

- `/briefing/oboon-original` — 유지 (카테고리 전체 보기 진입점)
- `/briefing/oboon-original/[categoryKey]` — 유지
- `/briefing/oboon-original/[categoryKey]/[slug]` — 유지
- 새로 추가되는 경로 없음

---

## 완료 기준

1. `/briefing` 메인에서 oboon-original 히어로가 최상단에 노출된다
2. 카테고리 카드 클릭 시 `/briefing/oboon-original/[categoryKey]`로 이동한다
3. "전체 보기 →" 클릭 시 `/briefing/oboon-original`로 이동한다
4. 일반 브리핑 카드, 페이지네이션, 검색바 동작 변경 없음
5. `pnpm lint`, `pnpm build` 통과

---

## 제약

- PageContainer를 컨텐츠 폭 기준으로 그대로 사용
- RLS/DB 변경 없음 — 기존 테이블에서 카테고리 데이터만 추가 쿼리
- 모바일 대응 필수 (3열 → 2열 또는 1열 반응형)
