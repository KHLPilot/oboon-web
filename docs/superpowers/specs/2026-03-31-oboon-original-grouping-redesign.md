# 오분 오리지널 그루핑 구조 재설계 — Design Spec
Date: 2026-03-31

## Overview

`/briefing/oboon-original` 메인 페이지의 그루핑 구조를 재설계한다.
현재는 태그가 섹션 헤더로 쓰이고 카테고리(시리즈)를 게시글을 통해 역추적하는 방식이지만,
토스피드 오리지널 시리즈 구조를 참고해 **시리즈가 1등 시민**으로 나열되고 태그는 클라이언트 필터 칩으로 동작하도록 변경한다.

---

## 핵심 변경 요약

| 항목 | 현재 | 변경 후 |
|------|------|---------|
| 태그 역할 | 섹션 헤더 (그루핑) | 필터 칩 |
| 시리즈(카테고리) 역할 | 태그 아래 카드 | 1등 시민 카드 그리드 |
| 태그↔시리즈 연결 | 게시글을 통해 역추적 | `briefing_category_tags` 테이블로 직접 연결 |
| 필터링 방식 | 없음 (dead link) | 클라이언트 상태 필터링 |
| 카드 내 태그 배지 | 없음 | 없음 (심플 유지) |

---

## 1. DB 변경

### 신규 테이블: `briefing_category_tags`

```sql
CREATE TABLE briefing_category_tags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES briefing_categories(id) ON DELETE CASCADE,
  tag_id      uuid NOT NULL REFERENCES briefing_tags(id) ON DELETE CASCADE,
  UNIQUE (category_id, tag_id)
);

-- RLS
ALTER TABLE briefing_category_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all" ON briefing_category_tags FOR SELECT USING (true);
CREATE POLICY "admin_write" ON briefing_category_tags FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND deleted_at IS NULL
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND deleted_at IS NULL
  ));
```

**기존 `briefing_post_tags`는 그대로 유지** — 아티클 상세 페이지에서 게시글별 태그 표시 용도로 계속 사용.

---

## 2. 페이지 구조

### `/briefing/oboon-original` (메인)

```
[FeaturedHero 캐러셀]          ← 변경 없음

[태그 필터 칩]
  전체 | 분양 트렌드 | 투자 인사이트 | ...
  (선택된 칩 강조 스타일)

[시리즈 카드 그리드]
  grid-cols-2 md:grid-cols-3
  각 카드: 커버 이미지 + 시리즈 제목 + "아티클 N개"
```

**동작:**
- 서버: 전체 시리즈 + 태그 데이터를 한 번에 내려줌
- "전체" 선택 시 모든 시리즈 표시
- 태그 칩 클릭 시 해당 태그가 달린 시리즈만 표시 (클라이언트 필터링)
- 태그가 하나도 달리지 않은 시리즈도 "전체" 선택 시 표시됨

**제거:**
- 현재의 "태그별 섹션" 구조 완전 제거
- `tagToCategoryIds` 역추적 로직 제거

### `/briefing/oboon-original/[categoryKey]` (시리즈 상세)
변경 없음.

### `/briefing/oboon-original/[categoryKey]/[slug]` (아티클 상세)
변경 없음. 기존 `briefing_post_tags` 기반 태그 표시 유지.

---

## 3. 데이터 & 서비스

### `briefing.original.ts` — `fetchOboonOriginalPageData()` 변경

**반환 타입:**
```ts
{
  isAdmin: boolean;
  featuredPosts: FeaturedPostRow[];
  series: {
    id: string;
    key: string;
    name: string;
    coverImageUrl: string | null;
    count: number;
    tags: { id: string; key: string; name: string }[];
  }[];
  tags: { id: string; key: string; name: string }[];
}
```

**쿼리 (병렬 fetching):**
```ts
Promise.all([
  // 1. 인증 + admin 확인
  // 2. 히어로용 최신 게시글 8개 (기존 유지)
  // 3. 시리즈 목록 (briefing_categories where board_id + is_active)
  // 4. 시리즈별 아티클 수
  // 5. briefing_category_tags join briefing_tags → 시리즈별 태그 목록
  // 6. 전체 태그 목록 (briefing_tags where is_active, sort_order ASC)
])
```

---

## 4. 컴포넌트

### 신규: `OboonOriginalFilter.client.tsx`

```ts
// features/briefing/components/oboon-original/OboonOriginalFilter.client.tsx
type Props = {
  series: SeriesWithTags[];
  tags: Tag[];
}
// 내부 상태: selectedTagId (null = 전체)
// 렌더: 태그 칩 행 + 필터된 시리즈 카드 그리드
```

### 변경: `app/briefing/oboon-original/page.tsx`
- `fetchOboonOriginalPageData()` 호출 후 `OboonOriginalFilter.client.tsx`에 데이터 전달
- 기존 태그 섹션 렌더링 로직 제거

### 기존 재사용
- `FeaturedHero` — 변경 없음
- `BriefingOriginalCard` — 변경 없음 (태그 배지 없는 현재 디자인 유지)

---

## 5. 마이그레이션 노트

- `briefing_category_tags` 테이블 생성 후 기존 시리즈에 태그를 수동으로 할당해야 함 (관리자 UI 또는 직접 INSERT)
- 신규 테이블이 비어있어도 페이지는 정상 동작 — "전체" 탭에 모든 시리즈 표시, 태그 필터 칩이 없거나 빈 결과를 보여주는 graceful fallback 처리
- `briefing.original.ts`의 함수 시그니처 변경 — 유일한 호출처가 `page.tsx`이므로 하위 호환 불필요
