# Briefing Editor Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 글 에디터에 커버 이미지 파일 업로드 기능을 추가하고, 글 수정 페이지(`/briefing/admin/posts/[id]/edit`)를 신규 생성한다.

**Architecture:**
- `PostEditorClient`에 `mode`, `postId`, `initialValues`, `onUpdate` 선택 prop을 추가해 create/edit 양 모드를 지원한다.
- 커버 이미지 업로드는 기존 `/api/r2/upload?mode=briefing_cover` 엔드포인트를 사용하며, 신규 글(postId 없음)은 컴포넌트 마운트 시 생성한 temp UUID를 R2 경로 키로 사용한다.
- 글 수정 서비스(`fetchBriefingPostForEdit`, `updateBriefingPost`)는 `briefing.admin.ts`에 추가한다.

**Tech Stack:** Next.js 14 App Router, Supabase, TypeScript, Tailwind CSS

---

## File Map

| 파일 | 변경 | 내용 |
|------|------|------|
| `features/briefing/services/briefing.admin.ts` | Modify | `fetchBriefingPostForEdit`, `updateBriefingPost` 함수 추가 |
| `app/briefing/admin/posts/new/PostEditor.client.tsx` | Modify | mode/postId/initialValues/onUpdate prop 추가, 커버 이미지 업로드 UI 추가 |
| `app/briefing/admin/posts/[id]/edit/page.tsx` | Create | 수정 페이지 서버 컴포넌트 |

---

## Task 1: Edit Service Functions

**Files:**
- Modify: `features/briefing/services/briefing.admin.ts`

### 현재 상태 확인

파일 상단 import 및 기존 함수 시그니처:
```typescript
// 현재 export 목록:
// ensureBriefingAdminUser()
// fetchBriefingAdminBootstrap()
// createBriefingPostWithSeq(args)
```

### Steps

- [ ] **Step 1: `fetchBriefingPostForEdit` 함수 추가**

`features/briefing/services/briefing.admin.ts` 파일 맨 아래에 추가:

```typescript
export async function fetchBriefingPostForEdit(postId: string) {
  const supabase = await createSupabaseServer();
  const admin = await ensureBriefingAdminUser();
  if (!admin) return null;

  const { data: post, error } = await supabase
    .from("briefing_posts")
    .select(
      "id, slug, title, content_html, content_md, cover_image_url, status, board_id, category_id, post_tags(tag_id)"
    )
    .eq("id", postId)
    .maybeSingle();

  if (error) throw error;
  if (!post) return null;

  const tagId =
    Array.isArray(post.post_tags) && post.post_tags.length > 0
      ? (post.post_tags[0] as { tag_id: string }).tag_id
      : null;

  return {
    id: post.id as string,
    slug: post.slug as string,
    title: post.title as string,
    contentHtml: (post.content_html as string | null) ?? "",
    contentMd: (post.content_md as string | null) ?? "",
    coverImageUrl: (post.cover_image_url as string | null) ?? "",
    status: post.status as "draft" | "published",
    boardId: post.board_id as string,
    categoryId: post.category_id as string,
    tagId,
  };
}
```

- [ ] **Step 2: `updateBriefingPost` 함수 추가**

바로 아래 추가:

```typescript
export async function updateBriefingPost(args: {
  postId: string;
  title: string;
  contentHtml: string;
  coverImageUrl: string;
  intent: "draft" | "publish";
  tagId: string | null;
  userId: string;
}) {
  const supabase = await createSupabaseServer();
  const { postId, title, contentHtml, coverImageUrl, intent, tagId } = args;

  const now = new Date().toISOString();
  const status = intent === "publish" ? "published" : "draft";
  const publishedAt = intent === "publish" ? now : undefined;

  const updatePayload: Record<string, unknown> = {
    title,
    content_html: contentHtml,
    cover_image_url: coverImageUrl || null,
    status,
    updated_at: now,
  };
  if (publishedAt) updatePayload.published_at = publishedAt;

  const { error: updateErr } = await supabase
    .from("briefing_posts")
    .update(updatePayload)
    .eq("id", postId);

  if (updateErr) {
    return { ok: false as const, message: `수정 실패: ${updateErr.message}` };
  }

  // 태그 재할당: 기존 삭제 후 새로 삽입
  const { error: delTagErr } = await supabase
    .from("briefing_post_tags")
    .delete()
    .eq("post_id", postId);

  if (delTagErr) {
    return { ok: false as const, message: `태그 삭제 실패: ${delTagErr.message}` };
  }

  if (tagId) {
    const { error: insTagErr } = await supabase
      .from("briefing_post_tags")
      .insert({ post_id: postId, tag_id: tagId });

    if (insTagErr && insTagErr.code !== "23505") {
      return { ok: false as const, message: `태그 할당 실패: ${insTagErr.message}` };
    }
  }

  return { ok: true as const };
}
```

- [ ] **Step 3: 타입 체크 확인**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck
```

Expected: 에러 없음

- [ ] **Step 4: Commit**

```bash
git add features/briefing/services/briefing.admin.ts
git commit -m "feat(briefing): add fetchBriefingPostForEdit and updateBriefingPost services"
```

---

## Task 2: PostEditorClient — Create/Edit 통합 + 커버 이미지 업로드

**Files:**
- Modify: `app/briefing/admin/posts/new/PostEditor.client.tsx`

### 변경 요약

1. `Props` 타입에 edit 모드용 선택 prop 추가 (`mode`, `postId`, `initialValues`, `onUpdate`)
2. 컴포넌트 상단에 temp UUID (`uploadTempId`) ref 추가 — create 모드에서 R2 업로드 경로 키로 사용
3. 커버 이미지 섹션을 파일 업로드 버튼 + URL 직접입력 두 가지로 교체
4. `initialValues`가 있으면 마운트 시 localStorage보다 우선 적용

### Steps

- [ ] **Step 1: Props 타입 확장**

파일 상단 `Props` 타입을 아래로 교체:

```typescript
type InitialValues = {
  title: string;
  coverImageUrl: string;
  contentHtml: string;
  tagId: string | null;
};

type Props = {
  bootstrap: EditorBootstrap;
  // create 모드
  onCreate?: (input: {
    board_id: string;
    category_id: string;
    title: string;
    cover_image_url: string;
    content_html: string;
    intent: "draft" | "publish";
    tag_id: string | null;
  }) => Promise<{ ok: true; redirectTo: string } | { ok: false; message: string }>;
  // edit 모드
  mode?: "create" | "edit";
  postId?: string;       // edit 모드에서 필수, create 모드에서는 undefined
  initialValues?: InitialValues;
  onUpdate?: (input: {
    title: string;
    cover_image_url: string;
    content_html: string;
    intent: "draft" | "publish";
    tag_id: string | null;
  }) => Promise<{ ok: true; redirectTo: string } | { ok: false; message: string }>;
};
```

- [ ] **Step 2: 업로드 상태 및 temp UUID ref 추가**

`PostEditorClient` 함수 컴포넌트 안 상단 state 선언부에 추가:

```typescript
// upload
const uploadTempIdRef = useRef<string>(
  typeof crypto !== "undefined" ? crypto.randomUUID() : `temp-${Date.now()}`
);
const fileInputRef = useRef<HTMLInputElement>(null);
const [isUploading, setIsUploading] = useState(false);
const [uploadError, setUploadError] = useState<string | null>(null);
```

- [ ] **Step 3: initialValues 적용 useEffect 추가**

기존 localStorage 복원 `useEffect` (boardId/categoryId 의존) 바로 **위에** 추가:

```typescript
// edit 모드: initialValues로 초기값 설정 (localStorage 보다 우선)
const initialValuesApplied = useRef(false);
useEffect(() => {
  if (!initialValues || initialValuesApplied.current) return;
  initialValuesApplied.current = true;

  const editKey = `oboon.briefing.editor.edit:${postId ?? "unknown"}`;
  const raw = localStorage.getItem(editKey);

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as DraftPayload;
      setTitle(parsed.title ?? initialValues.title);
      setCoverImageUrl(parsed.coverImageUrl ?? initialValues.coverImageUrl);
      setContentHtml(parsed.contentHtml ?? initialValues.contentHtml);
      setEditorInitialValue(parsed.contentHtml ?? initialValues.contentHtml);
      setSelectedTagId(parsed.selectedTagId ?? initialValues.tagId);
      return;
    } catch {
      // ignore
    }
  }

  setTitle(initialValues.title);
  setCoverImageUrl(initialValues.coverImageUrl);
  setContentHtml(initialValues.contentHtml);
  setEditorInitialValue(initialValues.contentHtml);
  setSelectedTagId(initialValues.tagId);
}, [initialValues, postId]);
```

- [ ] **Step 4: storageKey 함수 — edit 모드 분기**

기존 `storageKey` 함수를 아래로 교체:

```typescript
function storageKey(
  mode: "create" | "edit",
  boardId: string,
  categoryId: string,
  postId?: string,
) {
  if (mode === "edit" && postId) {
    return `oboon.briefing.editor.edit:${postId}`;
  }
  return `oboon.briefing.editor.draft:${boardId}:${categoryId}`;
}
```

localStorage를 사용하는 3개의 `storageKey(boardId, categoryId)` 호출을 아래로 교체 (파일 내 전체 3곳):
```typescript
// 변경 전: storageKey(boardId, categoryId)
// 변경 후:
storageKey(mode ?? "create", boardId, categoryId, postId)
```

- [ ] **Step 5: 파일 업로드 핸들러 추가**

`submit` 함수 바로 위에 추가:

```typescript
const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  setIsUploading(true);
  setUploadError(null);

  try {
    const uploadId = mode === "edit" && postId ? postId : uploadTempIdRef.current;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", "briefing_cover");
    formData.append("postId", uploadId);

    const res = await fetch("/api/r2/upload", { method: "POST", body: formData });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error ?? "업로드 실패");
    }
    const data = await res.json() as { url: string };
    setCoverImageUrl(data.url);
  } catch (err) {
    setUploadError(err instanceof Error ? err.message : "업로드 실패");
  } finally {
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }
};
```

- [ ] **Step 6: submit 함수 — edit 모드 분기**

기존 `submit` 함수를 아래로 교체:

```typescript
const submit = (intent: "draft" | "publish") => {
  setErrorMsg(null);
  startTransition(async () => {
    let res: { ok: true; redirectTo: string } | { ok: false; message: string };

    if (mode === "edit" && onUpdate) {
      res = await onUpdate({
        title,
        cover_image_url: coverImageUrl,
        content_html: contentHtml,
        intent,
        tag_id: selectedTagId,
      });
    } else if (onCreate) {
      res = await onCreate({
        board_id: boardId,
        category_id: categoryId,
        title,
        cover_image_url: coverImageUrl,
        content_html: contentHtml,
        intent,
        tag_id: selectedTagId,
      });
    } else {
      setErrorMsg("액션이 설정되지 않았습니다.");
      return;
    }

    if (!res.ok) {
      setErrorMsg(res.message);
      return;
    }

    localStorage.removeItem(storageKey(mode ?? "create", boardId, categoryId, postId));
    setDirty(false);
    router.push(res.redirectTo);
  });
};
```

- [ ] **Step 7: 커버 이미지 UI 섹션 교체**

기존 커버 이미지 `<div>` 블록(Label + Input + 미리보기) 전체를 아래로 교체:

```tsx
<div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
  <Label>커버 이미지</Label>

  {/* 파일 업로드 버튼 */}
  <input
    ref={fileInputRef}
    type="file"
    accept="image/jpeg,image/png,image/gif,image/webp"
    className="hidden"
    onChange={handleFileUpload}
    disabled={isPending || isUploading}
  />
  <button
    type="button"
    onClick={() => fileInputRef.current?.click()}
    disabled={isPending || isUploading}
    className={[
      "mt-1 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed",
      "border-(--oboon-border-default) bg-(--oboon-bg-subtle) py-2 text-[12px]",
      "text-(--oboon-text-muted) transition-colors hover:border-(--oboon-primary)/50",
      "hover:text-(--oboon-text-title) disabled:opacity-50",
    ].join(" ")}
  >
    {isUploading ? "업로드 중…" : "파일 업로드"}
  </button>

  {uploadError && (
    <div className="mt-1 text-[11px] text-red-400">{uploadError}</div>
  )}

  {/* URL 직접 입력 */}
  <div className="mt-2">
    <Input
      value={coverImageUrl}
      onChange={(e) => setCoverImageUrl(e.target.value)}
      placeholder="또는 이미지 URL 직접 입력"
      disabled={isPending}
    />
  </div>

  {/* 미리보기 */}
  {coverImageUrl ? (
    <div className="mt-2 aspect-video w-full overflow-hidden rounded-lg border border-(--oboon-border-default)">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={coverImageUrl}
        alt="커버 미리보기"
        className="h-full w-full object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
    </div>
  ) : (
    <div className="mt-2 flex aspect-video w-full items-center justify-center rounded-lg border border-dashed border-(--oboon-border-default) bg-(--oboon-bg-subtle)">
      <span className="ob-typo-caption text-(--oboon-text-muted)">
        업로드 또는 URL 입력 시 미리보기
      </span>
    </div>
  )}
</div>
```

- [ ] **Step 8: edit 모드에서 보드/카테고리 UI 숨기기**

보드 선택 `<div>` 블록 앞에 조건 추가:

```tsx
{/* edit 모드에서는 보드/카테고리 변경 불가 (슬러그가 고정되어 있음) */}
{(mode !== "edit") && (
  <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
    <Label>보드</Label>
    {/* ... 기존 보드 칩 버튼들 ... */}
  </div>
)}

{(mode !== "edit") && !hideCategoryUI && (
  <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
    {/* ... 기존 카테고리 드롭다운 ... */}
  </div>
)}
```

- [ ] **Step 9: 타입 체크 확인**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck
```

Expected: 에러 없음

- [ ] **Step 10: Commit**

```bash
git add app/briefing/admin/posts/new/PostEditor.client.tsx
git commit -m "feat(briefing): add cover image upload and edit mode support to PostEditorClient"
```

---

## Task 3: Post Edit Page

**Files:**
- Create: `app/briefing/admin/posts/[id]/edit/page.tsx`

### Steps

- [ ] **Step 1: 파일 생성**

`app/briefing/admin/posts/[id]/edit/page.tsx` 생성:

```typescript
// app/briefing/admin/posts/[id]/edit/page.tsx
import { notFound } from "next/navigation";

import PageContainer from "@/components/shared/PageContainer";
import {
  ensureBriefingAdminUser,
  fetchBriefingAdminBootstrap,
  fetchBriefingPostForEdit,
  updateBriefingPost,
} from "@/features/briefing/services/briefing.admin";
import { validateRequired } from "@/shared/validationMessage";
import PostEditorClient, {
  type EditorBootstrap,
} from "@/app/briefing/admin/posts/new/PostEditor.client";

type BoardRow = { id: string; key: string; name: string };
type CategoryRow = { id: string; key: string; name: string; board_id: string };
type TagRow = {
  id: string;
  name: string;
  sort_order: number | null;
  is_active: boolean;
};

export default async function BriefingPostEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: postId } = await params;

  const [post, bootstrapData] = await Promise.all([
    fetchBriefingPostForEdit(postId),
    fetchBriefingAdminBootstrap(),
  ]);

  if (!post || !bootstrapData) notFound();

  const { boards, categories, tags } = bootstrapData;

  async function updatePostAction(input: {
    title: string;
    cover_image_url: string;
    content_html: string;
    intent: "draft" | "publish";
    tag_id: string | null;
  }): Promise<{ ok: true; redirectTo: string } | { ok: false; message: string }> {
    "use server";

    try {
      const admin = await ensureBriefingAdminUser();
      if (!admin) return { ok: false, message: "관리자 권한이 필요합니다." };

      const title = String(input.title ?? "").trim();
      const coverImageUrl = String(input.cover_image_url ?? "").trim();
      const contentHtml = String(input.content_html ?? "");
      const intent = input.intent;
      const tagId = input.tag_id ? String(input.tag_id).trim() : null;

      const titleError = validateRequired(title, "제목");
      if (titleError) return { ok: false, message: titleError };

      const result = await updateBriefingPost({
        postId,
        title,
        contentHtml,
        coverImageUrl,
        intent,
        tagId,
        userId: admin.userId,
      });

      if (!result.ok) return { ok: false, message: result.message };

      // 수정 후 해당 게시글 상세 페이지로 이동
      const board = (boards ?? []).find((b: BoardRow) => b.id === post.boardId);
      const category = (categories ?? []).find(
        (c: CategoryRow) => c.id === post.categoryId,
      );
      let redirectTo = "/briefing";
      if (board?.key === "general") {
        redirectTo = `/briefing/general/${encodeURIComponent(post.slug)}`;
      } else if (board?.key === "oboon_original" && category?.key) {
        redirectTo = `/briefing/oboon-original/${encodeURIComponent(category.key)}/${encodeURIComponent(post.slug)}`;
      }

      return { ok: true, redirectTo };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : null;
      return { ok: false, message: msg ?? "알 수 없는 오류가 발생했습니다." };
    }
  }

  const typedCategories = (categories ?? []) as CategoryRow[];

  const bootstrap: EditorBootstrap = {
    boards: (boards ?? []) as BoardRow[],
    categories: typedCategories,
    tags: (tags ?? []) as TagRow[],
    defaultBoardId: post.boardId,
    defaultCategoryId: post.categoryId,
  };

  const initialValues = {
    title: post.title,
    coverImageUrl: post.coverImageUrl,
    contentHtml: post.contentHtml,
    tagId: post.tagId,
  };

  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-20">
        <PostEditorClient
          bootstrap={bootstrap}
          mode="edit"
          postId={postId}
          initialValues={initialValues}
          onUpdate={updatePostAction}
        />
      </PageContainer>
    </main>
  );
}
```

- [ ] **Step 2: 에디터 헤더 타이틀 edit 모드 분기**

`PostEditor.client.tsx`에서 "글 작성" 타이틀을 mode에 따라 분기:

```tsx
// 변경 전
<div className="ob-typo-h2 text-(--oboon-text-title)">글 작성</div>

// 변경 후
<div className="ob-typo-h2 text-(--oboon-text-title)">
  {mode === "edit" ? "글 수정" : "글 작성"}
</div>
```

- [ ] **Step 3: 타입 체크 + 빌드 확인**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm build
```

Expected: 에러 없음, 빌드 성공

- [ ] **Step 4: Commit**

```bash
git add app/briefing/admin/posts/[id]/edit/page.tsx app/briefing/admin/posts/new/PostEditor.client.tsx
git commit -m "feat(briefing): add post edit page /briefing/admin/posts/[id]/edit"
```

---

## 최종 검증

- [ ] `/briefing/admin/posts/new` — 글 작성 정상 동작, 파일 업로드 버튼 노출
- [ ] `/briefing/admin/posts/{실제postId}/edit` — 기존 글 내용 pre-fill, 수정 후 저장 정상 동작
- [ ] 상세 페이지(`/briefing/general/[slug]`, `/briefing/oboon-original/[cat]/[slug]`) — "수정" 버튼 클릭 시 edit 페이지 이동 정상 확인
- [ ] 커버 이미지 업로드 — JPEG/PNG/GIF/WEBP 파일 업로드 후 미리보기 노출 확인
- [ ] `pnpm lint && pnpm build` 모두 통과

---

## 주의사항

- `briefing_categories`에 `cover_image_url` 컬럼이 없으므로 카테고리 카드 이미지는 이 플랜 범위 밖 (별도 마이그레이션 필요)
- edit 모드에서 보드/카테고리 변경은 슬러그 충돌 방지를 위해 비활성화
- R2 업로드 신규 글: temp UUID 경로 사용 (`briefing/posts/{tempId}/cover.{ext}`) — postId와 다른 경로지만 URL로 저장되므로 문제 없음
- Task 2 Step 4 (`storageKey` 3곳 교체) 누락 시 TypeScript 오류 발생하므로 주의
