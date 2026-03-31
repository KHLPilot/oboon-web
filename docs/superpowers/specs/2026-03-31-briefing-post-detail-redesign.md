# Spec: 브리핑 글 상세 페이지 리디자인

**Date:** 2026-03-31
**Scope:** 히어로, 관련 글 카드, 사이드바 카드, 작성자 페이지(신규)

---

## 1. 히어로 섹션 ✅ (구현 완료)

- 커버 이미지 풀 배경 + 그라디언트 오버레이 + 제목/메타 하단 오버레이
- 두 상세 페이지(`general/[slug]`, `oboon-original/[categoryKey]/[slug]`) 모두 적용

---

## 2. 관련 글 카드 ✅ (구현 완료)

- 가로형 카드: 좌측 썸네일 `w-28` + 우측 제목/excerpt
- `cover_image_url` 서비스 쿼리에 추가 완료

---

## 3. 사이드바 카드 변경

### 현재
- 상단 뱃지: 태그명 또는 카테고리명 (`{badgeLabel}`)
- 아바타 + 이름 + 역할 텍스트(`ob-typo-caption`) 세로 배치
- "전체 글 보기" 버튼 → `/briefing` 또는 카테고리 페이지

### 변경 후
- **상단 뱃지**: 작성자 역할로 교체
  - `author?.role === "admin"` → `"오분 에디터"`, 그 외 → `"작성자"`
- **아바타 아래 역할 텍스트 제거** — 뱃지로 이미 표시되므로 중복 제거
- **"전체 글 보기" 버튼**: `/briefing/author/[authorId]` 로 링크 변경
  - `author?.id` 가 없으면 기존 링크 폴백

적용 파일:
- `app/briefing/general/[slug]/page.tsx`
- `app/briefing/oboon-original/[categoryKey]/[slug]/page.tsx`

---

## 4. 작성자 페이지 (신규)

### 라우트
`/briefing/author/[authorId]`

### URL 탭 상태
`?tab=general` (기본) | `?tab=oboon-original`
- 서버 컴포넌트에서 `searchParams.tab`으로 읽어 렌더링
- 클라이언트 상태 없이 Link로 탭 전환

### 페이지 구성
```
[작성자 이름] · [역할 뱃지]

[탭: 일반 브리핑 | 오분 오리지널]

[선택된 탭의 글 카드 그리드]
```

### 글 카드
- 기존 `BriefingPostCard` 컴포넌트 재사용
- 없으면 "아직 작성한 글이 없습니다" 빈 상태

### 서비스 함수 (신규)
`features/briefing/services/briefing.author.ts`

```ts
fetchAuthorPageData(authorId: string, tab: "general" | "oboon-original")
```
- `profiles` 에서 작성자 정보 조회 (id, name, nickname, role)
- `briefing_boards` 에서 해당 tab의 board_id 조회
- `briefing_posts` 에서 `author_id = authorId`, `board_id`, `status = published` 조회
  - select: `id, slug, title, excerpt, cover_image_url, published_at, created_at, category:briefing_categories(key)`
  - oboon-original 탭: `category.key` 를 사용해 `/briefing/oboon-original/[categoryKey]/[slug]` URL 생성
  - order: `published_at desc, created_at desc`
  - limit: 20

### 파일 목록
| 파일 | 신규/수정 |
|------|----------|
| `app/briefing/author/[authorId]/page.tsx` | 신규 |
| `features/briefing/services/briefing.author.ts` | 신규 |
| `app/briefing/general/[slug]/page.tsx` | 사이드바 수정 |
| `app/briefing/oboon-original/[categoryKey]/[slug]/page.tsx` | 사이드바 수정 |

---

## 5. 완료 기준

- 사이드바 뱃지가 작성자 역할을 표시
- 아바타 아래 역할 텍스트 없음
- "전체 글 보기" 클릭 시 `/briefing/author/[authorId]` 이동
- 작성자 페이지에서 탭 전환으로 general / oboon-original 글 분리 표시
- `pnpm lint && pnpm build` 통과
