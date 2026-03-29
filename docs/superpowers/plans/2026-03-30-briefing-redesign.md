# Briefing Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 브리핑 메인 페이지를 오리지널 우선 통합 구조로 재설계하고, 글 작성 에디터를 Tiptap WYSIWYG 사이드바형으로 교체한다.

**Architecture:** DB에 `content_html` 컬럼을 추가하고, Tiptap 에디터가 HTML을 생성해 저장한다. 기존 `content_md`는 유지하며 `content_html`이 없는 글은 ReactMarkdown fallback으로 렌더링한다. 브리핑 메인 페이지는 oboon-original(featured 글 + 카테고리 카드)을 상단에 배치하고 일반 브리핑을 아래에 두는 통합 구조로 재편한다.

**Tech Stack:** Next.js 14 App Router, Tiptap (`@tiptap/react`, `@tiptap/starter-kit`, extensions), DOMPurify, Supabase, TypeScript, Tailwind CSS

---

## 파일 맵

### 신규 생성
- `supabase/migrations/081_briefing_posts_add_content_html.sql` — DB 컬럼 추가
- `features/briefing/components/TiptapEditor.client.tsx` — Tiptap WYSIWYG 에디터 컴포넌트
- `features/briefing/components/BriefingHtmlRenderer.client.tsx` — DOMPurify 렌더러

### 수정
- `app/briefing/admin/posts/new/PostEditor.client.tsx` — 사이드바형 레이아웃 + Tiptap 적용
- `app/briefing/admin/posts/new/page.tsx` — `content_html` 받아서 서비스 레이어로 전달
- `features/briefing/services/briefing.admin.ts` — `createBriefingPostWithSeq`에 `contentHtml` 추가
- `features/briefing/services/briefing.general.post.ts` — `content_html` 컬럼 SELECT 추가
- `features/briefing/services/briefing.original.post.ts` — `content_html` 컬럼 SELECT 추가
- `app/briefing/general/[slug]/page.tsx` — `content_html` 우선 렌더링 + fallback
- `app/briefing/oboon-original/[categoryKey]/[slug]/page.tsx` — `content_html` 우선 렌더링 + fallback
- `app/briefing/page.tsx` — 오리지널 섹션 통합 (featured + 카테고리 카드 + 일반 브리핑)

---

## Task 1: DB 마이그레이션 — content_html 컬럼 추가

**Files:**
- Create: `supabase/migrations/081_briefing_posts_add_content_html.sql`

- [ ] **Step 1: 마이그레이션 파일 생성**

```sql
-- supabase/migrations/081_briefing_posts_add_content_html.sql
-- briefing_posts 테이블에 HTML 본문 컬럼 추가
-- content_md는 기존 데이터 보존을 위해 유지 (deprecated)

ALTER TABLE briefing_posts
  ADD COLUMN IF NOT EXISTS content_html TEXT;

COMMENT ON COLUMN briefing_posts.content_html IS 'Tiptap WYSIWYG 에디터가 생성한 HTML 본문. NULL이면 content_md로 fallback 렌더링';
```

- [ ] **Step 2: 테스트 DB에 적용**

```bash
supabase link --project-ref ketjqhoeucxmxgnutlww
supabase db push
```

Expected output: `Applying migration 081_briefing_posts_add_content_html.sql...`

- [ ] **Step 3: 컬럼 추가 확인**

```bash
supabase db diff
```

Expected output: 변경사항 없음 (이미 적용됨)

- [ ] **Step 4: 커밋**

```bash
git add supabase/migrations/081_briefing_posts_add_content_html.sql
git commit -m "feat(db): briefing_posts에 content_html 컬럼 추가"
```

---

## Task 2: Tiptap 패키지 설치

**Files:** `package.json` (자동 수정)

- [ ] **Step 1: Tiptap 및 DOMPurify 설치**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin" pnpm add \
  @tiptap/react \
  @tiptap/starter-kit \
  @tiptap/extension-image \
  @tiptap/extension-table \
  @tiptap/extension-table-row \
  @tiptap/extension-table-header \
  @tiptap/extension-table-cell \
  @tiptap/extension-color \
  @tiptap/extension-text-style \
  @tiptap/extension-link \
  dompurify
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin" pnpm add -D @types/dompurify
```

- [ ] **Step 2: 빌드 통과 확인**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm build
```

Expected: 빌드 성공 (에러 없음)

- [ ] **Step 3: 커밋**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat(deps): Tiptap WYSIWYG + DOMPurify 설치"
```

---

## Task 3: BriefingHtmlRenderer 컴포넌트

**Files:**
- Create: `features/briefing/components/BriefingHtmlRenderer.client.tsx`

- [ ] **Step 1: 렌더러 컴포넌트 생성**

```tsx
// features/briefing/components/BriefingHtmlRenderer.client.tsx
"use client";

import { useMemo } from "react";
import DOMPurify from "dompurify";

type Props = {
  html: string;
  className?: string;
};

export default function BriefingHtmlRenderer({ html, className }: Props) {
  const sanitized = useMemo(() => {
    if (typeof window === "undefined") return html;
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        "p", "br", "strong", "em", "u", "s",
        "h1", "h2", "h3", "h4",
        "ul", "ol", "li",
        "blockquote", "pre", "code",
        "a", "img",
        "table", "thead", "tbody", "tr", "th", "td",
        "hr", "span", "div",
      ],
      ALLOWED_ATTR: ["href", "src", "alt", "class", "style", "target", "rel"],
    });
  }, [html]);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
```

- [ ] **Step 2: 타입체크**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add features/briefing/components/BriefingHtmlRenderer.client.tsx
git commit -m "feat(briefing): DOMPurify HTML 렌더러 컴포넌트 추가"
```

---

## Task 4: TiptapEditor 컴포넌트

**Files:**
- Create: `features/briefing/components/TiptapEditor.client.tsx`

- [ ] **Step 1: TiptapEditor 컴포넌트 생성**

```tsx
// features/briefing/components/TiptapEditor.client.tsx
"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import Color from "@tiptap/extension-color";
import TextStyle from "@tiptap/extension-text-style";
import Link from "@tiptap/extension-link";
import { useCallback, useEffect, useRef } from "react";

type Props = {
  initialValue?: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      disabled={disabled}
      title={title}
      className={[
        "flex h-7 min-w-[28px] items-center justify-center rounded px-1.5 text-xs transition-colors",
        active
          ? "bg-(--oboon-primary)/20 text-(--oboon-primary)"
          : "text-(--oboon-text-muted) hover:bg-(--oboon-bg-subtle) hover:text-(--oboon-text-title)",
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="mx-1 h-4 w-px bg-(--oboon-border-default)" />;
}

export default function TiptapEditor({
  initialValue = "",
  onChange,
  disabled = false,
  placeholder,
}: Props) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        code: {},
        codeBlock: {},
        horizontalRule: {},
      }),
      TextStyle,
      Color,
      Image.configure({ inline: false }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
    ],
    content: initialValue,
    editable: !disabled,
    onUpdate({ editor }) {
      onChangeRef.current(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "outline-none min-h-[320px] px-4 py-3 text-sm leading-7",
      },
    },
  });

  // initialValue 변경 시 에디터 리셋 (보드/카테고리 변경으로 autosave 복원 시)
  const prevInitialValue = useRef(initialValue);
  useEffect(() => {
    if (!editor) return;
    if (prevInitialValue.current !== initialValue) {
      prevInitialValue.current = initialValue;
      editor.commands.setContent(initialValue ?? "");
    }
  }, [editor, initialValue]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("이미지 URL을 입력하세요:");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("링크 URL:", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const insertTable = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface)">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-2 py-1.5">
        {/* Text style */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          disabled={disabled}
          title="굵게 (Ctrl+B)"
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          disabled={disabled}
          title="기울임 (Ctrl+I)"
        >
          <em>I</em>
        </ToolbarButton>

        <Divider />

        {/* Headings */}
        {([1, 2, 3] as const).map((level) => (
          <ToolbarButton
            key={level}
            onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
            active={editor.isActive("heading", { level })}
            disabled={disabled}
            title={`제목 H${level}`}
          >
            H{level}
          </ToolbarButton>
        ))}

        <Divider />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          disabled={disabled}
          title="순서 없는 목록"
        >
          ≡
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          disabled={disabled}
          title="순서 있는 목록"
        >
          1.
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          disabled={disabled}
          title="인용구"
        >
          "
        </ToolbarButton>

        <Divider />

        {/* Color */}
        <div className="relative flex items-center">
          <span className="pointer-events-none absolute left-1.5 text-xs text-(--oboon-text-muted)">A</span>
          <input
            type="color"
            className="h-7 w-9 cursor-pointer rounded border-none bg-transparent pl-4 opacity-60 hover:opacity-100"
            title="글자 색상"
            disabled={disabled}
            onChange={(e) => {
              editor.chain().focus().setColor(e.target.value).run();
            }}
          />
        </div>

        <Divider />

        {/* Image, Table, Link, HR */}
        <ToolbarButton onClick={addImage} disabled={disabled} title="이미지 삽입">
          🖼
        </ToolbarButton>
        <ToolbarButton onClick={insertTable} disabled={disabled} title="표 삽입 (3×3)">
          ⊞
        </ToolbarButton>
        <ToolbarButton
          onClick={setLink}
          active={editor.isActive("link")}
          disabled={disabled}
          title="링크"
        >
          🔗
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          disabled={disabled}
          title="구분선"
        >
          —
        </ToolbarButton>
      </div>

      {/* Editor content */}
      <EditorContent
        editor={editor}
        className={[
          "ob-md flex-1 text-(--oboon-text-title)",
          disabled ? "opacity-60 cursor-not-allowed" : "",
        ].join(" ")}
      />
    </div>
  );
}
```

- [ ] **Step 2: 타입체크**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add features/briefing/components/TiptapEditor.client.tsx
git commit -m "feat(briefing): Tiptap WYSIWYG 에디터 컴포넌트 추가"
```

---

## Task 5: PostEditor.client.tsx — 사이드바형 레이아웃 + Tiptap 적용

**Files:**
- Modify: `app/briefing/admin/posts/new/PostEditor.client.tsx`

- [ ] **Step 1: PostEditor.client.tsx 전체 교체**

```tsx
// app/briefing/admin/posts/new/PostEditor.client.tsx
"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import Modal from "@/components/ui/Modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";

import TiptapEditor from "@/features/briefing/components/TiptapEditor.client";

export type EditorBootstrap = {
  boards: Array<{ id: string; key: string; name: string }>;
  categories: Array<{
    id: string;
    key: string;
    name: string;
    board_id: string;
  }>;
  tags: Array<{
    id: string;
    name: string;
    sort_order: number | null;
    is_active: boolean;
  }>;
  defaultBoardId: string;
  defaultCategoryId: string;
};

type Props = {
  bootstrap: EditorBootstrap;
  onCreate: (input: {
    board_id: string;
    category_id: string;
    title: string;
    cover_image_url: string;
    content_html: string;
    intent: "draft" | "publish";
    tag_id: string | null;
  }) => Promise<
    { ok: true; redirectTo: string } | { ok: false; message: string }
  >;
};

function storageKey(boardId: string, categoryId: string) {
  return `oboon.briefing.editor.draft:${boardId}:${categoryId}`;
}

type DraftPayload = {
  title: string;
  coverImageUrl: string;
  contentHtml: string;
  selectedTagId: string | null;
  savedAt: number;
};

export default function PostEditorClient({ bootstrap, onCreate }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [boardId, setBoardId] = useState(bootstrap.defaultBoardId);
  const [categoryId, setCategoryId] = useState(bootstrap.defaultCategoryId);

  const catsForBoard = useMemo(
    () => bootstrap.categories.filter((c) => c.board_id === boardId),
    [bootstrap.categories, boardId],
  );

  useEffect(() => {
    if (!catsForBoard.some((c) => c.id === categoryId)) {
      queueMicrotask(() => setCategoryId(catsForBoard[0]?.id ?? ""));
    }
  }, [boardId, catsForBoard, categoryId]);

  const selectedBoard = useMemo(
    () => bootstrap.boards.find((b) => b.id === boardId) ?? null,
    [bootstrap.boards, boardId],
  );

  const selectedCategory = useMemo(
    () => catsForBoard.find((c) => c.id === categoryId) ?? null,
    [catsForBoard, categoryId],
  );

  const isGeneralBoard = selectedBoard?.key === "general";
  const hideCategoryUI = isGeneralBoard;

  // form state
  const [title, setTitle] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  // editorKey: 보드/카테고리 변경 시 에디터 initialValue 갱신을 위한 키
  const [editorInitialValue, setEditorInitialValue] = useState("");

  // tags
  const tags = useMemo(() => {
    const list = bootstrap.tags ?? [];
    return [...list]
      .filter((t) => t.is_active)
      .sort((a, b) => {
        const ao = typeof a.sort_order === "number" ? a.sort_order : 0;
        const bo = typeof b.sort_order === "number" ? b.sort_order : 0;
        if (ao !== bo) return ao - bo;
        return String(a.name ?? "").localeCompare(String(b.name ?? ""));
      });
  }, [bootstrap.tags]);

  const [tagQuery, setTagQuery] = useState("");
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);

  const selectedTag = useMemo(
    () => tags.find((t) => t.id === selectedTagId) ?? null,
    [tags, selectedTagId],
  );

  const filteredTags = useMemo(() => {
    const q = tagQuery.trim().toLowerCase();
    if (!q) return tags;
    return tags.filter((t) => t.name.toLowerCase().includes(q));
  }, [tags, tagQuery]);

  const clearTag = () => setSelectedTagId(null);

  // autosave
  const [dirty, setDirty] = useState(false);
  const lastSavedRef = useRef<number>(0);
  const [lastSavedAt, setLastSavedAt] = useState<number>(0);

  // restore from localStorage on board/category change
  useEffect(() => {
    const key = storageKey(boardId, categoryId);
    const raw = localStorage.getItem(key);
    if (!raw) {
      // 저장된 내용 없으면 초기화
      setTitle("");
      setCoverImageUrl("");
      setContentHtml("");
      setEditorInitialValue("");
      setSelectedTagId(null);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as DraftPayload;
      queueMicrotask(() => {
        setTitle(parsed.title ?? "");
        setCoverImageUrl(parsed.coverImageUrl ?? "");
        setContentHtml(parsed.contentHtml ?? "");
        setEditorInitialValue(parsed.contentHtml ?? "");
        setSelectedTagId(parsed.selectedTagId ?? null);
        lastSavedRef.current = parsed.savedAt ?? Date.now();
        setLastSavedAt(lastSavedRef.current);
        setDirty(false);
      });
    } catch {
      // ignore
    }
  }, [boardId, categoryId]);

  // dirty tracking
  useEffect(() => {
    queueMicrotask(() => setDirty(true));
  }, [title, coverImageUrl, contentHtml, selectedTagId, boardId, categoryId]);

  // debounce autosave
  useEffect(() => {
    const t = window.setTimeout(() => {
      const key = storageKey(boardId, categoryId);
      const payload: DraftPayload = {
        title,
        coverImageUrl,
        contentHtml,
        selectedTagId,
        savedAt: Date.now(),
      };
      localStorage.setItem(key, JSON.stringify(payload));
      lastSavedRef.current = payload.savedAt;
      setLastSavedAt(payload.savedAt);
    }, 1500);

    return () => window.clearTimeout(t);
  }, [title, coverImageUrl, contentHtml, selectedTagId, boardId, categoryId]);

  // beforeunload warning
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onResetDraft = () => {
    localStorage.removeItem(storageKey(boardId, categoryId));
    setTitle("");
    setCoverImageUrl("");
    setContentHtml("");
    setEditorInitialValue("");
    setSelectedTagId(null);
    setDirty(false);
    setErrorMsg(null);
  };

  const submit = (intent: "draft" | "publish") => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await onCreate({
        board_id: boardId,
        category_id: categoryId,
        title,
        cover_image_url: coverImageUrl,
        content_html: contentHtml,
        intent,
        tag_id: selectedTagId,
      });

      if (!res.ok) {
        setErrorMsg(res.message);
        return;
      }

      localStorage.removeItem(storageKey(boardId, categoryId));
      setDirty(false);
      router.push(res.redirectTo);
    });
  };

  const savedAtText = useMemo(() => {
    if (!lastSavedAt) return "자동 저장 준비됨";
    const d = new Date(lastSavedAt);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `최근 자동 저장: ${hh}:${mm}:${ss}`;
  }, [lastSavedAt]);

  return (
    <>
      {/* Page header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="ob-typo-h2 text-(--oboon-text-title)">글 작성</div>
          <div className="mt-0.5 ob-typo-caption text-(--oboon-text-muted)">
            관리자 전용 · {savedAtText}
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          shape="pill"
          onClick={() => setCancelOpen(true)}
          disabled={isPending}
        >
          취소
        </Button>
      </div>

      {errorMsg ? (
        <div className="mb-4 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-3">
          <div className="text-[13px] font-medium text-(--oboon-text-title)">
            저장 실패
          </div>
          <div className="mt-1 text-[12px] leading-5 text-(--oboon-text-muted)">
            {errorMsg}
          </div>
        </div>
      ) : null}

      {/* Main layout: editor + sidebar */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_280px]">

        {/* Left: Editor */}
        <div className="flex flex-col gap-4">
          {/* Title */}
          <div>
            <Label>제목</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              disabled={isPending}
            />
          </div>

          {/* Tiptap editor */}
          <div>
            <Label>본문</Label>
            <TiptapEditor
              initialValue={editorInitialValue}
              onChange={setContentHtml}
              disabled={isPending}
            />
          </div>
        </div>

        {/* Right: Sidebar */}
        <div className="flex flex-col gap-4">

          {/* Cover image */}
          <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
            <Label>커버 이미지 URL</Label>
            <Input
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              placeholder="https://..."
              disabled={isPending}
            />
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
                  URL 입력 시 미리보기
                </span>
              </div>
            )}
          </div>

          {/* Board */}
          <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
            <Label>보드</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {bootstrap.boards.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBoardId(b.id)}
                  disabled={isPending}
                  className={[
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    b.id === boardId
                      ? "border-(--oboon-primary) bg-(--oboon-primary)/10 text-(--oboon-primary)"
                      : "border-(--oboon-border-default) bg-(--oboon-bg-subtle) text-(--oboon-text-muted) hover:border-(--oboon-primary)/50",
                  ].join(" ")}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          {!hideCategoryUI && (
            <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
              <Label>카테고리</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    shape="pill"
                    disabled={isPending || catsForBoard.length === 0}
                    className="mt-1 w-full justify-between"
                  >
                    <span className="min-w-0 truncate">
                      {selectedCategory ? selectedCategory.name : "카테고리 선택"}
                    </span>
                    <span className="ml-2 text-(--oboon-text-muted)">▾</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[240px]">
                  {catsForBoard.length === 0 ? (
                    <div className="px-3 py-2 text-[12px] text-(--oboon-text-muted)">
                      활성 카테고리가 없습니다.
                    </div>
                  ) : (
                    catsForBoard.map((c) => (
                      <DropdownMenuItem
                        key={c.id}
                        onClick={() => setCategoryId(c.id)}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm">{c.name}</span>
                        {c.id === categoryId && (
                          <span className="text-[12px] text-(--oboon-primary)">
                            ✓
                          </span>
                        )}
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Tag */}
          <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
            <Label>태그</Label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {selectedTag ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-3 py-1 text-[12px] text-(--oboon-text-title)">
                  {selectedTag.name}
                  <button
                    type="button"
                    className="text-(--oboon-text-muted) hover:text-(--oboon-text-title)"
                    onClick={clearTag}
                    disabled={isPending}
                    aria-label={`${selectedTag.name} 제거`}
                  >
                    ×
                  </button>
                </span>
              ) : (
                <span className="text-[12px] text-(--oboon-text-muted)">
                  태그 없음
                </span>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="sm" shape="pill" disabled={isPending}>
                    태그 선택
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[280px] p-2">
                  <div className="p-1">
                    <Input
                      value={tagQuery}
                      onChange={(e) => setTagQuery(e.target.value)}
                      placeholder="태그 검색…"
                      disabled={isPending}
                    />
                  </div>
                  <div className="mt-2 max-h-[220px] overflow-auto">
                    {filteredTags.length === 0 ? (
                      <div className="px-2 py-3 text-[12px] text-(--oboon-text-muted)">
                        검색 결과 없음
                      </div>
                    ) : (
                      filteredTags.map((t) => (
                        <DropdownMenuItem
                          key={t.id}
                          onClick={() => {
                            setSelectedTagId(t.id);
                            setTagQuery("");
                          }}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm">{t.name}</span>
                          {selectedTagId === t.id && (
                            <span className="text-[12px] text-(--oboon-primary)">✓</span>
                          )}
                        </DropdownMenuItem>
                      ))
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-(--oboon-border-default) pt-2">
                    <Button variant="ghost" size="sm" onClick={clearTag} disabled={isPending}>
                      선택 해제
                    </Button>
                    <div className="text-[12px] text-(--oboon-text-muted)">태그 1개</div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Autosave status */}
          <div className="flex items-center gap-2 px-1">
            <div
              className={[
                "h-2 w-2 rounded-full flex-shrink-0",
                dirty ? "bg-yellow-400" : "bg-green-500",
              ].join(" ")}
            />
            <span className="ob-typo-caption text-(--oboon-text-muted)">
              {dirty ? "변경사항 있음" : "자동 저장됨"}
            </span>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button
              variant="secondary"
              size="md"
              shape="pill"
              onClick={onResetDraft}
              disabled={isPending}
              className="w-full"
              title="현재 보드/카테고리의 임시저장을 초기화합니다."
            >
              임시저장 초기화
            </Button>
            <Button
              variant="secondary"
              size="md"
              shape="pill"
              onClick={() => submit("draft")}
              disabled={isPending}
              className="w-full"
            >
              임시 저장
            </Button>
            <Button
              variant="primary"
              size="md"
              shape="pill"
              onClick={() => submit("publish")}
              disabled={isPending}
              className="w-full"
            >
              발행
            </Button>
          </div>

        </div>
      </div>

      {/* Cancel modal */}
      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} showCloseIcon>
        <div className="ob-typo-h2 font-semibold text-(--oboon-text-title)">
          작성을 취소하시겠습니까?
        </div>
        <div className="mt-2 ob-typo-caption leading-5 text-(--oboon-text-muted)">
          저장하지 않고 나가면 입력한 내용이 사라질 수 있습니다.
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setCancelOpen(false)} className="w-full">
            계속 작성
          </Button>
          <Button
            variant="danger"
            onClick={() => { setCancelOpen(false); router.push("/briefing"); }}
            className="w-full"
          >
            나가기
          </Button>
        </div>
      </Modal>
    </>
  );
}
```

- [ ] **Step 2: 타입체크**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add app/briefing/admin/posts/new/PostEditor.client.tsx
git commit -m "feat(briefing): 에디터 사이드바형 레이아웃 + Tiptap WYSIWYG 적용"
```

---

## Task 6: Server Action 및 Service 레이어 — content_html 전달

**Files:**
- Modify: `app/briefing/admin/posts/new/page.tsx`
- Modify: `features/briefing/services/briefing.admin.ts`

- [ ] **Step 1: page.tsx 서버 액션에서 `content_html` 수신 및 전달**

`app/briefing/admin/posts/new/page.tsx`의 `createPostAction` 함수 시그니처와 내부 로직을 수정한다.

```tsx
// 기존 input 타입에서 content_md → content_html 교체
async function createPostAction(input: {
  board_id: string;
  category_id: string;
  title: string;
  cover_image_url: string;
  content_html: string;   // ← content_md에서 변경
  intent: "draft" | "publish";
  tag_id: string | null;
}): Promise<
  { ok: true; redirectTo: string } | { ok: false; message: string }
> {
  "use server";

  try {
    const admin = await ensureBriefingAdminUser();
    if (!admin) {
      return { ok: false, message: "관리자 권한이 필요합니다." };
    }

    const userId = admin.userId;

    const boardId = String(input.board_id ?? "").trim();
    const categoryId = String(input.category_id ?? "").trim();
    const title = String(input.title ?? "").trim();
    const coverImageUrl = String(input.cover_image_url ?? "").trim();
    const contentHtml = String(input.content_html ?? "");  // ← 변경
    const intent = input.intent;
    const tagId = input.tag_id ? String(input.tag_id).trim() : null;

    if (!boardId || !categoryId)
      return { ok: false, message: "보드/카테고리를 선택해주세요." };
    const titleRequiredError = validateRequired(title, "제목");
    if (titleRequiredError) {
      return { ok: false, message: titleRequiredError };
    }

    const result = await createBriefingPostWithSeq({
      boardId,
      categoryId,
      title,
      contentHtml,          // ← 변경
      coverImageUrl,
      intent,
      tagId,
      userId,
    });

    if (!result.ok) {
      return { ok: false, message: result.message };
    }

    const boardKey =
      (boards ?? []).find((b: BoardRow) => b.id === boardId)?.key ?? "";
    let redirectTo = "/briefing";
    if (boardKey === "general") {
      redirectTo = `/briefing/general/${encodeURIComponent(result.slug)}`;
    } else if (boardKey === "oboon_original" && result.categoryKey) {
      redirectTo = `/briefing/oboon-original/${encodeURIComponent(
        result.categoryKey
      )}/${encodeURIComponent(result.slug)}`;
    }

    return { ok: true, redirectTo };
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : null;
    return {
      ok: false,
      message: errorMessage ?? "알 수 없는 오류가 발생했습니다.",
    };
  }
}
```

- [ ] **Step 2: `createBriefingPostWithSeq` 서비스 함수에 contentHtml 추가**

`features/briefing/services/briefing.admin.ts`에서 `createBriefingPostWithSeq` 함수를 찾아 아래와 같이 수정한다:

```typescript
// createBriefingPostWithSeq 파라미터 타입에 contentHtml 추가
export async function createBriefingPostWithSeq(args: {
  boardId: string;
  categoryId: string;
  title: string;
  contentHtml: string;    // ← 추가 (contentMd 제거)
  coverImageUrl: string;
  intent: "draft" | "publish";
  tagId: string | null;
  userId: string;
}) {
  // ... 기존 로직 유지 ...
  // DB insert 부분에서 content_html 컬럼에 contentHtml 값을 넣도록 수정
  // RPC create_briefing_post_with_seq 호출 시 content_html 파라미터 추가
}
```

> **주의**: `briefing.admin.ts` 파일을 먼저 Read로 확인한 후, RPC 호출부만 정확히 수정한다. RPC 함수 `create_briefing_post_with_seq`의 SQL 시그니처도 확인 필요 (001_schema.sql).

- [ ] **Step 3: RPC SQL 함수에 content_html 파라미터 추가 마이그레이션 생성**

```sql
-- supabase/migrations/082_briefing_rpc_add_content_html.sql
-- create_briefing_post_with_seq RPC에 content_html 파라미터 추가

CREATE OR REPLACE FUNCTION create_briefing_post_with_seq(
  p_board_id UUID,
  p_category_id INTEGER,
  p_title TEXT,
  p_content_html TEXT,
  p_cover_image_url TEXT,
  p_intent TEXT,
  p_tag_id INTEGER,
  p_user_id UUID
) RETURNS TABLE (slug TEXT, category_key TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
-- 기존 함수 본문을 유지하면서 content_md 대신 content_html을 INSERT하도록 수정
$$;
```

> **주의**: 이 단계는 `001_schema.sql`에서 기존 `create_briefing_post_with_seq` 함수의 전체 본문을 먼저 읽고, `content_md` → `content_html`로 교체한 완전한 함수를 작성해야 한다. 함수 본문을 추측하지 말 것.

- [ ] **Step 4: 테스트 DB에 적용**

```bash
supabase link --project-ref ketjqhoeucxmxgnutlww
supabase db push
```

- [ ] **Step 5: 타입체크 + 빌드**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm build
```

Expected: 에러 없음

- [ ] **Step 6: 커밋**

```bash
git add app/briefing/admin/posts/new/page.tsx \
        features/briefing/services/briefing.admin.ts \
        supabase/migrations/082_briefing_rpc_add_content_html.sql
git commit -m "feat(briefing): 글 생성 서버 액션 + RPC를 content_html 기반으로 전환"
```

---

## Task 7: 포스트 상세 페이지 — content_html 우선 렌더링

**Files:**
- Modify: `features/briefing/services/briefing.general.post.ts`
- Modify: `features/briefing/services/briefing.original.post.ts`
- Modify: `app/briefing/general/[slug]/page.tsx`
- Modify: `app/briefing/oboon-original/[categoryKey]/[slug]/page.tsx`

- [ ] **Step 1: `briefing.general.post.ts` — content_html SELECT 추가**

`fetchGeneralPostPageData` 함수에서 `briefing_posts`를 조회하는 쿼리에 `content_html` 컬럼을 추가한다.

> 파일을 먼저 Read로 확인하고, `.select()` 안의 컬럼 목록에 `content_html`을 추가한다.

- [ ] **Step 2: `briefing.original.post.ts` — content_html SELECT 추가**

`fetchOboonOriginalPostPageData` 함수에서 동일하게 `content_html` 컬럼을 SELECT에 추가한다.

- [ ] **Step 3: `general/[slug]/page.tsx` — PostRow 타입 + 렌더러 수정**

```tsx
// PostRow 타입에 content_html 추가
type PostRow = {
  id: string;
  slug: string;
  title: string;
  content_md: string | null;
  content_html: string | null;   // ← 추가
  // ... 나머지 필드 유지 ...
};
```

본문 렌더링 부분을 교체한다:

```tsx
// 기존 ReactMarkdown 렌더링 → content_html 우선 + fallback
import BriefingHtmlRenderer from "@/features/briefing/components/BriefingHtmlRenderer.client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// 렌더링 JSX:
<div className={cx("ob-md", isAdmin ? "pt-14" : "")}>
  {post.content_html ? (
    <BriefingHtmlRenderer
      html={post.content_html}
      className="prose max-w-none"
    />
  ) : (
    <div className="prose max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {post.content_md ?? ""}
      </ReactMarkdown>
    </div>
  )}
</div>
```

- [ ] **Step 4: `oboon-original/[categoryKey]/[slug]/page.tsx` — 동일하게 수정**

Step 3과 동일한 방식으로 `PostRow` 타입에 `content_html` 추가, 렌더러 교체.

- [ ] **Step 5: 타입체크 + 빌드**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm build
```

Expected: 에러 없음

- [ ] **Step 6: 커밋**

```bash
git add \
  features/briefing/services/briefing.general.post.ts \
  features/briefing/services/briefing.original.post.ts \
  app/briefing/general/[slug]/page.tsx \
  app/briefing/oboon-original/[categoryKey]/[slug]/page.tsx
git commit -m "feat(briefing): 포스트 상세 페이지 content_html 우선 렌더링 + content_md fallback"
```

---

## Task 8: 브리핑 메인 페이지 통합 재설계

**Files:**
- Modify: `app/briefing/page.tsx`

**목표 구조:**
```
[오리지널 Featured 글 — FeaturedHero 캐러셀]
[카테고리 카드 그리드 — 시리즈 탐색]
[──────────── 구분선 ────────────]
[검색바]
[일반 브리핑 섹션 제목]
[BriefingCardGrid + 페이지네이션]
```

- [ ] **Step 1: `app/briefing/page.tsx` 전체 교체**

```tsx
// app/briefing/page.tsx
import Link from "next/link";
import PageContainer from "@/components/shared/PageContainer";

import { fetchBriefingHomeData } from "@/features/briefing/services/briefing.home";
import { fetchOboonOriginalPageData } from "@/features/briefing/services/briefing.original";
import BriefingSearchInput from "@/features/briefing/components/BriefingSearchInput";
import BriefingCardGrid from "@/features/briefing/components/BriefingCardGrid";
import FeaturedHero from "@/features/briefing/components/oboon-original/FeaturedHero";
import BriefingOriginalCard from "@/features/briefing/components/oboon-original/BriefingOriginalCard";

// (기존 type 정의 및 pickFirst, pickPrimaryTagName, pickName 함수 모두 유지)

type CategoryRow = {
  id: string;
  key: string;
  name: string;
};

export default async function BriefingPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  // 두 데이터 소스를 병렬 fetch
  const [homeData, originalData] = await Promise.all([
    fetchBriefingHomeData(page),
    fetchOboonOriginalPageData(),
  ]);

  const { isAdmin, generalPosts, generalTotalCount, pageSize } = homeData;
  const {
    featuredPosts,
    categories,
    categoryCountMap,
  } = originalData;

  const catData = (categories ?? []) as CategoryRow[];

  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-20">

        {/* ===== OBOON Original Featured Hero ===== */}
        {page === 1 && featuredPosts.length > 0 && (
          <div className="mb-6">
            <FeaturedHero posts={featuredPosts} isAdmin={isAdmin} />
          </div>
        )}

        {/* ===== 카테고리 카드 (시리즈 탐색) ===== */}
        {page === 1 && catData.length > 0 && (
          <div className="mb-10">
            <div className="mb-3 flex items-end justify-between">
              <div className="ob-typo-h3 text-(--oboon-text-title)">
                오리지널 시리즈
              </div>
              <Link
                href="/briefing/oboon-original"
                className="ob-typo-caption text-(--oboon-text-muted) hover:text-(--oboon-text-title) transition-colors"
              >
                전체 보기 →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {catData.slice(0, 8).map((c) => (
                <BriefingOriginalCard
                  key={c.id}
                  original={{
                    key: c.key,
                    name: c.name,
                    description: null,
                    coverImageUrl: null,
                  }}
                  count={categoryCountMap.get(c.id) ?? 0}
                  href={`/briefing/oboon-original/${encodeURIComponent(c.key)}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* ===== 구분선 ===== */}
        {page === 1 && (
          <hr className="mb-10 border-(--oboon-border-default)" />
        )}

        {/* ===== 검색바 ===== */}
        <div className="mb-8">
          <BriefingSearchInput />
        </div>

        {/* ===== 일반 브리핑 ===== */}
        <div className="mb-4">
          <div className="flex items-end justify-between gap-3">
            <div className="ob-typo-h2 text-(--oboon-text-title)">
              일반 브리핑
            </div>
          </div>
          <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
            단일 주제로 정리된 최신 브리핑 글입니다.
          </div>
        </div>

        <BriefingCardGrid
          posts={generalPosts.map((p) => ({
            id: p.id,
            href: `/briefing/general/${encodeURIComponent(p.slug)}`,
            slug: p.slug,
            title: p.title,
            content_md: p.content_md ?? null,
            created_at: p.created_at,
            published_at: p.published_at ?? null,
            cover_image_url: p.cover_image_url ?? null,
            badgeLabel:
              pickPrimaryTagName(p) ?? pickName(p.category) ?? "브리핑",
          }))}
          pagination={{ currentPage: page, totalCount: generalTotalCount, pageSize }}
        />

      </PageContainer>
    </main>
  );
}
```

> **주의**: `pickFirst`, `pickPrimaryTagName`, `pickName`, `PostRow` 타입 정의는 기존 코드에서 그대로 유지한다. 위 코드는 전체가 아니라 변경 부분만 나타낸 것이므로, 실제 편집 시 기존 helper 함수들을 보존해야 한다.

- [ ] **Step 2: 타입체크 + 빌드**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm build
```

Expected: 에러 없음

- [ ] **Step 3: lint**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm lint
```

Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add app/briefing/page.tsx
git commit -m "feat(briefing): 메인 페이지 오리지널 우선 통합 구조로 재설계"
```

---

## 최종 검증

- [ ] **전체 lint + build**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm lint
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm build
```

- [ ] **브라우저 동선 확인**
  1. `/briefing` — 오리지널 히어로 + 카테고리 카드 + 일반 브리핑 순서로 렌더링
  2. `/briefing/admin/posts/new` — 사이드바형 Tiptap 에디터 로딩
  3. 글 작성 → 발행 → 포스트 상세 페이지에서 HTML 렌더링 확인
  4. 기존 글 (content_md만 있는 글) — ReactMarkdown fallback 정상 렌더링

---

## Self-Review

### Spec 커버리지 체크

| 요구사항 | 커버 태스크 |
|----------|-------------|
| content_html DB 컬럼 추가 | Task 1 |
| Tiptap 설치 (이미지, 표, 글자색) | Task 2 |
| DOMPurify 렌더러 | Task 3 |
| Tiptap 에디터 컴포넌트 | Task 4 |
| 사이드바형 에디터 레이아웃 | Task 5 |
| 서버 액션 + RPC content_html 전달 | Task 6 |
| 포스트 상세 content_html 렌더링 + fallback | Task 7 |
| 브리핑 메인 오리지널 우선 통합 | Task 8 |

### 주의사항

- **Task 6 Step 3**: RPC SQL 함수 수정 전 반드시 `001_schema.sql`에서 기존 함수 본문 Read 확인 필수
- **Task 7 Step 1-2**: 서비스 파일 Read 확인 후 SELECT 컬럼만 정확히 추가 (다른 로직 변경 금지)
- **Task 8**: `PostRow` 타입 정의와 helper 함수는 기존 파일에서 그대로 유지
- **Tiptap SSR**: 에디터는 `"use client"` 파일에만 있으므로 SSR 이슈 없음
- **DOMPurify**: 브라우저 전용이므로 `"use client"` 파일에서만 사용. `typeof window === "undefined"` 체크 포함

### 에디터 수정 페이지 (현재 플랜 외)

`/briefing/admin/posts/${id}/edit` 경로는 현재 구현이 없어 404 상태. 이 플랜 완료 후 별도 태스크로 추가 필요.
