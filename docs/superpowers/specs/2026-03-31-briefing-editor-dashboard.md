# Spec: 브리핑 에디터 대시보드

**Date:** 2026-03-31
**Route:** `/briefing/editor`

---

## 1. 접근 제어

- `role === "admin"` 허용 (미래 `editor` role 추가 시 OR 조건으로 확장)
- 미인증 또는 권한 없음 → `/` 리다이렉트
- `app/briefing/editor/layout.tsx` 에서 role guard 처리

---

## 2. 페이지 구성

### 헤더 (고정)
```
[아바타 56px]  이름 (ob-typo-h1)
               역할 (ob-typo-caption, muted)

bio (있을 때만, ob-typo-body)
```

### 탭 (URL searchParams 기반)
```
개요 (?tab=overview, 기본)  |  내 글 (?tab=posts)  |  프로필 (?tab=profile)
```

---

## 3. 탭별 콘텐츠

### 개요 탭 (`?tab=overview`)
통계 카드 4개 (2×2 그리드):
- **총 글** — published + draft 합계
- **좋아요** — `sum(like_count)` from 내 posts
- **댓글** — `sum(comment_count)` from 내 posts
- **조회수** — `sum(view_count)` from 내 posts

각 카드: 숫자(ob-typo-h1) + 라벨(ob-typo-caption)

### 내 글 탭 (`?tab=posts`)
- **상단:** "새 글 작성" 버튼 → `/briefing/admin/posts/new`
- **필터:** 전체 / 발행 / 임시저장 (searchParams `?status=all|published|draft`)
- **글 목록:** 테이블 또는 카드 리스트
  - 제목, 상태 뱃지(발행/임시저장), 발행일, 좋아요 수, 댓글 수
  - 수정 버튼 → `/briefing/admin/posts/[id]/edit`
  - 삭제 버튼 (확인 후 삭제, Server Action)
- 글 없으면 빈 상태 표시

### 프로필 탭 (`?tab=profile`)
인라인 수정 폼:
- 아바타 (클릭하여 업로드 → `/api/r2/upload` 기존 활용)
- 닉네임 (text input, `/api/profile/check-nickname` 중복 확인)
- bio (textarea, 최대 200자)
- 저장 버튼 → `PATCH /api/briefing/editor/profile`

---

## 4. 서비스 함수

**`features/briefing/services/briefing.editor.ts`** (신규)

```ts
fetchEditorDashboardData(userId: string, tab: "overview" | "posts" | "profile")
```
- 공통: `profiles` 에서 본인 정보 조회 (id, name, nickname, role, avatar_url, bio)
- overview: `briefing_posts` 에서 `author_id = userId` 통계 집계
- posts: `briefing_posts` 에서 `author_id = userId` 목록 (title, status, like_count, comment_count, view_count, published_at, created_at)
- profile: profiles 정보만

---

## 5. API Routes

**`app/api/briefing/editor/profile/route.ts`** (신규)
```
PATCH /api/briefing/editor/profile
body: { nickname?: string, bio?: string, avatar_url?: string }
- 인증 필수 (admin role)
- profiles 업데이트
```

---

## 6. 컴포넌트 구조

```
app/briefing/editor/
  layout.tsx                         — role guard (admin)
  page.tsx                           — 서버 컴포넌트, 헤더 + 탭

features/briefing/components/editor/
  EditorOverviewTab.tsx              — 통계 카드 (서버)
  EditorPostsTab.client.tsx          — 글 목록 + 삭제 (클라이언트)
  EditorProfileTab.client.tsx        — 프로필 수정 폼 (클라이언트)
```

---

## 7. 변경 파일 목록

| 파일 | 신규/수정 |
|------|----------|
| `app/briefing/editor/layout.tsx` | 신규 |
| `app/briefing/editor/page.tsx` | 신규 |
| `app/api/briefing/editor/profile/route.ts` | 신규 |
| `features/briefing/services/briefing.editor.ts` | 신규 |
| `features/briefing/components/editor/EditorOverviewTab.tsx` | 신규 |
| `features/briefing/components/editor/EditorPostsTab.client.tsx` | 신규 |
| `features/briefing/components/editor/EditorProfileTab.client.tsx` | 신규 |

---

## 8. 완료 기준

- `/briefing/editor` 접근 시 admin role 이외 리다이렉트
- 탭 전환이 URL searchParams 기반으로 동작
- 개요 탭에 통계 4개 표시
- 내 글 탭에서 발행/임시저장 필터 + 수정/삭제 동작
- 프로필 탭에서 닉네임/bio/아바타 수정 저장
- `pnpm lint && pnpm build` 통과
