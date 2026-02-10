// app/briefing/admin/posts/new/PostEditor.client.tsx
"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Label from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
    content_md: string;
    intent: "draft" | "publish";
    tag_id: string | null;
  }) => Promise<
    { ok: true; redirectTo: string } | { ok: false; message: string }
  >;
};

function storageKey(boardId: string, categoryId: string) {
  return `oboon.briefing.editor.draft:${boardId}:${categoryId}`;
}

export default function PostEditorClient({ bootstrap, onCreate }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [boardId, setBoardId] = useState(bootstrap.defaultBoardId);
  const [categoryId, setCategoryId] = useState(bootstrap.defaultCategoryId);

  // board -> category options
  const catsForBoard = useMemo(
    () => bootstrap.categories.filter((c) => c.board_id === boardId),
    [bootstrap.categories, boardId],
  );

  // 보드 변경 시 카테고리 자동 교정
  useEffect(() => {
    // 현재 선택된 categoryId가 해당 보드에 없으면 1순위로 자동 세팅
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

  // form
  const [title, setTitle] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [contentMd, setContentMd] = useState("");
  const [tab, setTab] = useState<"write" | "preview">("write");

  // tags (single)
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

  // restore
  useEffect(() => {
    const key = storageKey(boardId, categoryId);
    const raw = localStorage.getItem(key);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as {
        title: string;
        coverImageUrl: string;
        contentMd: string;
        selectedTagId: string | null;
        savedAt: number;
      };

      queueMicrotask(() => {
        setTitle(parsed.title ?? "");
        setCoverImageUrl(parsed.coverImageUrl ?? "");
        setContentMd(parsed.contentMd ?? "");
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
  }, [title, coverImageUrl, contentMd, selectedTagId, boardId, categoryId]);

  // debounce save
  useEffect(() => {
    const t = window.setTimeout(() => {
      const key = storageKey(boardId, categoryId);
      const payload = {
        title,
        coverImageUrl,
        contentMd,
        selectedTagId,
        savedAt: Date.now(),
      };
      localStorage.setItem(key, JSON.stringify(payload));
      lastSavedRef.current = payload.savedAt;
      setLastSavedAt(payload.savedAt);
    }, 1500);

    return () => window.clearTimeout(t);
  }, [title, coverImageUrl, contentMd, selectedTagId, boardId, categoryId]);

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
    setContentMd("");
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
        content_md: contentMd,
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
      <div className="mb-6">
        <div className="ob-typo-h2 text-(--oboon-text-title)">글 작성</div>
        <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
          관리자 전용 편집기 · {savedAtText}
        </div>
      </div>

      <Card className="p-5 shadow-none">
        {/* header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="status">작성</Badge>
            {dirty ? (
              <span className="text-[12px] text-(--oboon-text-muted)">
                변경사항 있음
              </span>
            ) : (
              <span className="text-[12px] text-(--oboon-text-muted)">
                동기화됨
              </span>
            )}
          </div>

          <Button
            variant="secondary"
            size="sm"
            shape="pill"
            onClick={onResetDraft}
            disabled={isPending}
            title="현재 보드/카테고리의 임시저장을 초기화합니다."
          >
            임시저장 초기화
          </Button>
        </div>

        {errorMsg ? (
          <div className="mt-4 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-3">
            <div className="text-[13px] font-medium text-(--oboon-text-title)">
              저장 실패
            </div>
            <div className="mt-1 text-[12px] leading-5 text-(--oboon-text-muted)">
              {errorMsg}
            </div>
          </div>
        ) : null}

        {/* body */}
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* board dropdown */}
          <div>
            <Label>보드</Label>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="md"
                  shape="pill"
                  disabled={isPending}
                  className="w-full justify-between"
                >
                  <span className="min-w-0 truncate">
                    {selectedBoard
                      ? `${selectedBoard.name} (${selectedBoard.key})`
                      : "보드 선택"}
                  </span>
                  <span className="ml-2 text-(--oboon-text-muted)">▾</span>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="start" className="w-[360px]">
                {bootstrap.boards.map((b) => {
                  const active = b.id === boardId;
                  return (
                    <DropdownMenuItem
                      key={b.id}
                      onClick={() => setBoardId(b.id)}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm">
                        {b.name}{" "}
                        <span className="text-(--oboon-text-muted)">
                          ({b.key})
                        </span>
                      </span>
                      <span className="text-[12px] text-(--oboon-text-muted)">
                        {active ? "선택됨" : ""}
                      </span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* category dropdown */}
          {!hideCategoryUI ? (
            <div>
              <Label>카테고리</Label>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="md"
                    shape="pill"
                    disabled={isPending || catsForBoard.length === 0}
                    className="w-full justify-between"
                  >
                    <span className="min-w-0 truncate">
                      {selectedCategory
                        ? `${selectedCategory.name} (${selectedCategory.key})`
                        : "카테고리 선택"}
                    </span>
                    <span className="ml-2 text-(--oboon-text-muted)">▾</span>
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="start" className="w-[360px]">
                  {catsForBoard.length === 0 ? (
                    <div className="px-3 py-2 text-[12px] text-(--oboon-text-muted)">
                      선택한 보드에 활성 카테고리가 없습니다.
                    </div>
                  ) : (
                    catsForBoard.map((c) => {
                      const active = c.id === categoryId;
                      return (
                        <DropdownMenuItem
                          key={c.id}
                          onClick={() => setCategoryId(c.id)}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm">
                            {c.name}{" "}
                            <span className="text-(--oboon-text-muted)">
                              ({c.key})
                            </span>
                          </span>
                          <span className="text-[12px] text-(--oboon-text-muted)">
                            {active ? "선택됨" : ""}
                          </span>
                        </DropdownMenuItem>
                      );
                    })
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : null}

          {/* title */}
          <div className="md:col-span-2">
            <Label>제목</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              disabled={isPending}
            />
          </div>

          {/* cover */}
          <div>
            <Label>커버 이미지 URL</Label>
            <Input
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              placeholder="https://..."
              disabled={isPending}
            />
          </div>

          {/* tag */}
          <div>
            <Label>태그</Label>

            <div className="flex flex-wrap items-center gap-2">
              {selectedTag ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-3 py-1 text-[12px] text-(--oboon-text-title)">
                  {selectedTag.name}
                  <button
                    type="button"
                    className="text-(--oboon-text-muted) hover:text-(--oboon-text-title)"
                    onClick={clearTag}
                    aria-label={`${selectedTag.name} 제거`}
                    disabled={isPending}
                  >
                    ×
                  </button>
                </span>
              ) : (
                <span className="text-[12px] text-(--oboon-text-muted)">
                  아직 선택된 태그가 없습니다.
                </span>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    shape="pill"
                    disabled={isPending}
                  >
                    태그 선택
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="start" className="w-[320px] p-2">
                  <div className="p-1">
                    <Input
                      value={tagQuery}
                      onChange={(e) => setTagQuery(e.target.value)}
                      placeholder="태그 검색…"
                      disabled={isPending}
                    />
                  </div>

                  <div className="mt-2 max-h-[280px] overflow-auto">
                    {filteredTags.length === 0 ? (
                      <div className="px-2 py-3 text-[12px] text-(--oboon-text-muted)">
                        검색 결과가 없습니다.
                      </div>
                    ) : (
                      filteredTags.map((t) => {
                        const checked = selectedTagId === t.id;
                        return (
                          <DropdownMenuItem
                            key={t.id}
                            onClick={() => {
                              setSelectedTagId(t.id);
                              setTagQuery("");
                            }}
                            className="flex items-center justify-between"
                          >
                            <span className="text-sm">{t.name}</span>
                            <span className="text-[12px] text-(--oboon-text-muted)">
                              {checked ? "선택됨" : ""}
                            </span>
                          </DropdownMenuItem>
                        );
                      })
                    )}
                  </div>

                  <div className="mt-2 flex items-center justify-between border-t border-(--oboon-border-default) pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearTag}
                      disabled={isPending}
                    >
                      선택 해제
                    </Button>
                    <div className="text-[12px] text-(--oboon-text-muted)">
                      태그는 1개만 선택
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* content */}
          <div className="md:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <Label>본문(Markdown)</Label>

              <div className="inline-flex overflow-hidden rounded-full border border-(--oboon-border-default)">
                <button
                  type="button"
                  className={[
                    "px-3 py-1 text-xs transition",
                    tab === "write"
                      ? "bg-(--oboon-primary)/10 text-(--oboon-text-title)"
                      : "text-(--oboon-text-muted) hover:bg-(--oboon-bg-subtle)",
                  ].join(" ")}
                  onClick={() => setTab("write")}
                  disabled={isPending}
                >
                  작성
                </button>
                <button
                  type="button"
                  className={[
                    "px-3 py-1 text-xs transition",
                    tab === "preview"
                      ? "bg-(--oboon-primary)/10 text-(--oboon-text-title)"
                      : "text-(--oboon-text-muted) hover:bg-(--oboon-bg-subtle)",
                  ].join(" ")}
                  onClick={() => setTab("preview")}
                  disabled={isPending}
                >
                  미리보기
                </button>
              </div>
            </div>

            {tab === "write" ? (
              <Textarea
                value={contentMd}
                onChange={(e) => setContentMd(e.target.value)}
                rows={14}
                className="w-full rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-4 py-3 text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-(--oboon-primary)"
                placeholder="Markdown으로 작성하세요"
                disabled={isPending}
              />
            ) : (
              <div className="ob-md min-h-[360px] rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
                <div className="prose max-w-none">
                  {contentMd && contentMd.trim().length > 0 ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {contentMd}
                    </ReactMarkdown>
                  ) : (
                    <div className="ob-typo-body text-(--oboon-text-muted)">
                      미리보기: 본문을 입력하면 여기에 표시됩니다.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* actions */}
        <div className="mt-6 flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            size="md"
            onClick={() => setCancelOpen(true)}
            disabled={isPending}
          >
            취소
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => submit("draft")}
            disabled={isPending}
          >
            임시 저장
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => submit("publish")}
            disabled={isPending}
          >
            발행
          </Button>
        </div>

        {/* cancel confirm modal */}
        <Modal
          open={cancelOpen}
          onClose={() => setCancelOpen(false)}
          showCloseIcon={true}
        >
          <div className="ob-typo-h2 font-semibold text-(--oboon-text-title)">
            작성 취소하시겠습니까?
          </div>
          <div className="mt-2 ob-typo-caption leading-5 text-(--oboon-text-muted)">
            저장하지 않고 나가면 입력한 내용이 사라질 수 있습니다.
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              onClick={() => setCancelOpen(false)}
              className="w-full"
            >
              계속 작성
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setCancelOpen(false);
                router.push("/briefing");
              }}
              className="w-full"
            >
              나가기
            </Button>
          </div>
        </Modal>
      </Card>
    </>
  );
}
