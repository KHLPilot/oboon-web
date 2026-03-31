# Spec: 브리핑 좋아요 / 댓글 / 공유 기능

**Date:** 2026-03-31
**Scope:** 브리핑 글 상세 페이지 (general, oboon-original) 공통

---

## 1. DB 스키마

### briefing_posts 컬럼 추가
```sql
alter table briefing_posts
  add column like_count integer not null default 0,
  add column comment_count integer not null default 0;
```

### briefing_likes (로그인 유저 중복 방지)
```sql
create table briefing_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references briefing_posts(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(post_id, profile_id)
);
```
RLS:
- SELECT: 전체 허용 (anon + authenticated)
- INSERT: authenticated 본인만 (`auth.uid() = profile_id`)
- DELETE: authenticated 본인만 (`auth.uid() = profile_id`)

### briefing_comments
```sql
create table briefing_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references briefing_posts(id) on delete cascade,
  profile_id uuid references profiles(id) on delete set null,
  nickname text not null,
  content text not null,
  created_at timestamptz not null default now()
);
```
RLS:
- SELECT: 전체 허용
- INSERT: anon + authenticated 모두 허용
- DELETE: 본인(`auth.uid() = profile_id`) 또는 admin role

마이그레이션 파일: `supabase/migrations/101_briefing_likes_comments.sql`

---

## 2. API Routes

### POST `/api/briefing/[postId]/like`
- body: `{ action: "like" | "unlike" }`
- 로그인: `briefing_likes` insert/delete + `like_count` +1/-1
- 비로그인: `like_count` +1/-1만 (클라이언트 localStorage로 중복 방지)
- 응답: `{ like_count: number }`

### GET `/api/briefing/[postId]/comments`
- query: `?cursor=<iso_datetime>&limit=20`
- 최신순 (`created_at desc`), 커서 기반 페이지네이션
- 응답: `{ comments: Comment[], nextCursor: string | null }`

### POST `/api/briefing/[postId]/comments`
- body: `{ nickname?: string, content: string }`
- 로그인: `profile_id` 자동 설정, `nickname` = `profile.nickname ?? profile.name`
- 비로그인: `nickname` 필수 (없으면 400), `profile_id` null
- `comment_count` +1
- 응답: `{ comment: Comment }`

### DELETE `/api/briefing/[postId]/comments/[commentId]`
- 로그인 본인 또는 admin만 허용
- `comment_count` -1
- 응답: 204

파일:
- `app/api/briefing/[postId]/like/route.ts`
- `app/api/briefing/[postId]/comments/route.ts`
- `app/api/briefing/[postId]/comments/[commentId]/route.ts`

---

## 3. 클라이언트 컴포넌트

### `BriefingLikeShareBar.client.tsx`
위치: `features/briefing/components/BriefingLikeShareBar.client.tsx`

props:
```ts
{
  postId: string
  initialLikeCount: number
  initialLiked: boolean  // localStorage 기반 초기값
}
```

동작:
- **좋아요**: POST `/api/briefing/[postId]/like`, localStorage `briefing_liked_posts` 배열로 중복 관리, 숫자 표시
- **댓글**: `#briefing-comments` anchor로 스크롤
- **공유**: `navigator.clipboard.writeText(window.location.href)` + 토스트 "링크가 복사됐습니다"

### `BriefingCommentSection.client.tsx`
위치: `features/briefing/components/BriefingCommentSection.client.tsx`

props:
```ts
{
  postId: string
  initialComments: Comment[]
  initialNextCursor: string | null
  currentUserId: string | null
}
```

구성:
- `id="briefing-comments"` 앵커
- 댓글 작성 폼: 비로그인 시 닉네임 입력 + 내용 textarea, 로그인 시 닉네임 자동
- 댓글 목록: 닉네임 + 날짜 + 내용, 본인 댓글에 삭제 버튼
- 더보기: 커서 기반 추가 로드

---

## 4. 페이지 변경

두 page.tsx 공통:
- 서버에서 초기 댓글 20개 fetch (서비스 함수 추가)
- 서버에서 `like_count` fetch (이미 post 데이터에 포함)
- 사이드바 아이콘 3개 → `<BriefingLikeShareBar>` 교체
- 관련 글 카드 위에 `<BriefingCommentSection>` 추가

서비스 함수 추가 위치:
- `features/briefing/services/briefing.general.post.ts` — `fetchGeneralPostPageData`에 초기 댓글 fetch 포함
- `features/briefing/services/briefing.original.post.ts` — `fetchOboonOriginalPostPageData`에 초기 댓글 fetch 포함

---

## 5. 변경 파일 목록

| 파일 | 신규/수정 |
|------|----------|
| `supabase/migrations/101_briefing_likes_comments.sql` | 신규 |
| `app/api/briefing/[postId]/like/route.ts` | 신규 |
| `app/api/briefing/[postId]/comments/route.ts` | 신규 |
| `app/api/briefing/[postId]/comments/[commentId]/route.ts` | 신규 |
| `features/briefing/components/BriefingLikeShareBar.client.tsx` | 신규 |
| `features/briefing/components/BriefingCommentSection.client.tsx` | 신규 |
| `features/briefing/services/briefing.general.post.ts` | 수정 |
| `features/briefing/services/briefing.original.post.ts` | 수정 |
| `app/briefing/general/[slug]/page.tsx` | 수정 |
| `app/briefing/oboon-original/[categoryKey]/[slug]/page.tsx` | 수정 |

---

## 6. 완료 기준

- 좋아요 토글 동작 (비로그인/로그인 모두)
- 댓글 작성/삭제 동작 (비로그인 닉네임 입력, 로그인 자동)
- 공유 버튼 클릭 시 URL 복사 + 토스트
- 댓글창이 관련 글 카드 위에 표시
- 댓글 아이콘 클릭 시 댓글 섹션으로 스크롤
- `pnpm lint && pnpm build` 통과
- `console.log` 없음
