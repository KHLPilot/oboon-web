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

type InitialValues = {
  title: string;
  coverImageUrl: string;
  contentHtml: string;
  tagId: string | null;
  isEditorPick: boolean;
};

type Props = {
  bootstrap: EditorBootstrap;
  onCreate?: (input: {
    board_id: string;
    category_id: string;
    title: string;
    cover_image_url: string;
    content_html: string;
    intent: "draft" | "publish";
    tag_id: string | null;
    is_editor_pick: boolean;
  }) => Promise<
    { ok: true; redirectTo: string } | { ok: false; message: string }
  >;
  mode?: "create" | "edit";
  postId?: string;
  initialValues?: InitialValues;
  onUpdate?: (input: {
    title: string;
    cover_image_url: string;
    content_html: string;
    intent: "draft" | "publish";
    tag_id: string | null;
    is_editor_pick: boolean;
  }) => Promise<
    { ok: true; redirectTo: string } | { ok: false; message: string }
  >;
};

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

type DraftPayload = {
  title: string;
  coverImageUrl: string;
  contentHtml: string;
  selectedTagId: string | null;
  isEditorPick: boolean;
  savedAt: number;
};

export default function PostEditorClient({
  bootstrap,
  onCreate,
  mode = "create",
  postId,
  initialValues,
  onUpdate,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [cancelOpen, setCancelOpen] = useState(false);
  const uploadTempIdRef = useRef<string>(
    typeof crypto !== "undefined" ? crypto.randomUUID() : `temp-${Date.now()}`,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
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

  const [title, setTitle] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [editorInitialValue, setEditorInitialValue] = useState("");

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
  const [isEditorPick, setIsEditorPick] = useState(false);

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

  const [dirty, setDirty] = useState(false);
  const lastSavedRef = useRef<number>(0);
  const [lastSavedAt, setLastSavedAt] = useState<number>(0);
  const initialValuesApplied = useRef(false);

  useEffect(() => {
    if (!initialValues || initialValuesApplied.current) return;
    initialValuesApplied.current = true;

    const editKey = `oboon.briefing.editor.edit:${postId ?? "unknown"}`;
    const raw = localStorage.getItem(editKey);

    if (raw) {
      try {
        const parsed = JSON.parse(raw) as DraftPayload;
        queueMicrotask(() => {
          setTitle(parsed.title ?? initialValues.title);
          setCoverImageUrl(
            parsed.coverImageUrl ?? initialValues.coverImageUrl,
          );
          setContentHtml(parsed.contentHtml ?? initialValues.contentHtml);
          setEditorInitialValue(parsed.contentHtml ?? initialValues.contentHtml);
          setSelectedTagId(parsed.selectedTagId ?? initialValues.tagId);
          setIsEditorPick(parsed.isEditorPick ?? initialValues.isEditorPick);
          lastSavedRef.current = parsed.savedAt ?? Date.now();
          setLastSavedAt(lastSavedRef.current);
          setDirty(false);
        });
        return;
      } catch {
        // ignore
      }
    }

    queueMicrotask(() => {
      setTitle(initialValues.title);
      setCoverImageUrl(initialValues.coverImageUrl);
      setContentHtml(initialValues.contentHtml);
      setEditorInitialValue(initialValues.contentHtml);
      setSelectedTagId(initialValues.tagId);
      setIsEditorPick(initialValues.isEditorPick);
      setDirty(false);
    });
  }, [initialValues, postId]);

  useEffect(() => {
    if (mode === "edit" && initialValuesApplied.current) return;

    const key = storageKey(mode, boardId, categoryId, postId);
    const raw = localStorage.getItem(key);
    if (!raw) {
      queueMicrotask(() => {
        setTitle("");
        setCoverImageUrl("");
        setContentHtml("");
        setEditorInitialValue("");
        setSelectedTagId(null);
        setIsEditorPick(false);
        lastSavedRef.current = 0;
        setLastSavedAt(0);
        setDirty(false);
      });
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
        setIsEditorPick(parsed.isEditorPick ?? false);
        lastSavedRef.current = parsed.savedAt ?? Date.now();
        setLastSavedAt(lastSavedRef.current);
        setDirty(false);
      });
    } catch {
      // ignore
    }
  }, [boardId, categoryId, mode, postId]);

  useEffect(() => {
    queueMicrotask(() => setDirty(true));
  }, [
    title,
    coverImageUrl,
    contentHtml,
    selectedTagId,
    isEditorPick,
    boardId,
    categoryId,
    mode,
    postId,
  ]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const key = storageKey(mode, boardId, categoryId, postId);
      const payload: DraftPayload = {
        title,
        coverImageUrl,
        contentHtml,
        selectedTagId,
        isEditorPick,
        savedAt: Date.now(),
      };
      localStorage.setItem(key, JSON.stringify(payload));
      lastSavedRef.current = payload.savedAt;
      setLastSavedAt(payload.savedAt);
    }, 1500);

    return () => window.clearTimeout(t);
  }, [
    title,
    coverImageUrl,
    contentHtml,
    selectedTagId,
    isEditorPick,
    boardId,
    categoryId,
    mode,
    postId,
  ]);

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
    localStorage.removeItem(storageKey(mode, boardId, categoryId, postId));
    setTitle("");
    setCoverImageUrl("");
    setContentHtml("");
    setEditorInitialValue("");
    setSelectedTagId(null);
    setIsEditorPick(false);
    setDirty(false);
    setErrorMsg(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const uploadId =
        mode === "edit" && postId ? postId : uploadTempIdRef.current;
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", "briefing_cover");
      formData.append("postId", uploadId);

      const res = await fetch("/api/r2/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "업로드 실패");
      }
      const data = (await res.json()) as { url: string };
      setCoverImageUrl(data.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const submit = (intent: "draft" | "publish") => {
    setErrorMsg(null);
    startTransition(async () => {
      let res:
        | { ok: true; redirectTo: string }
        | { ok: false; message: string };

      if (mode === "edit" && onUpdate) {
        res = await onUpdate({
          title,
          cover_image_url: coverImageUrl,
          content_html: contentHtml,
          intent,
          tag_id: selectedTagId,
          is_editor_pick: isEditorPick,
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
          is_editor_pick: isEditorPick,
        });
      } else {
        setErrorMsg("액션이 설정되지 않았습니다.");
        return;
      }

      if (!res.ok) {
        setErrorMsg(res.message);
        return;
      }

      localStorage.removeItem(storageKey(mode, boardId, categoryId, postId));
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
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="ob-typo-h2 text-(--oboon-text-title)">
            {mode === "edit" ? "글 수정" : "글 작성"}
          </div>
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

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_280px]">
        <div className="flex flex-col gap-4">
          <div>
            <Label>제목</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              disabled={isPending}
            />
          </div>

          <div>
            <Label>본문</Label>
            <TiptapEditor
              initialValue={editorInitialValue}
              onChange={setContentHtml}
              disabled={isPending}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
            <Label>커버 이미지</Label>

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

            <div className="mt-2">
              <Input
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="또는 이미지 URL 직접 입력"
                disabled={isPending}
              />
            </div>

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

          {mode !== "edit" && (
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
          )}

          {mode !== "edit" && !hideCategoryUI && (
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
                      {selectedCategory
                        ? selectedCategory.name
                        : "카테고리 선택"}
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
                  <Button
                    variant="secondary"
                    size="sm"
                    shape="pill"
                    disabled={isPending}
                  >
                    태그 선택
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[min(280px,calc(100vw-1rem))] p-2">
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
                            <span className="text-[12px] text-(--oboon-primary)">
                              ✓
                            </span>
                          )}
                        </DropdownMenuItem>
                      ))
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
                      태그 1개
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
            <Label>홈 노출</Label>
            <label className="mt-2 flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={isEditorPick}
                onChange={(e) => setIsEditorPick(e.target.checked)}
                disabled={isPending}
                className="mt-0.5 h-4 w-4 rounded border-(--oboon-border-default)"
              />
              <div>
                <div className="ob-typo-body font-medium text-(--oboon-text-title)">
                  에디터 픽으로 지정
                </div>
                <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                  홈의 에디터 픽 섹션에 우선 노출됩니다.
                </div>
              </div>
            </label>
          </div>

          <div className="flex items-center gap-2 px-1">
            <div
              className={[
                "h-2 w-2 flex-shrink-0 rounded-full",
                dirty ? "bg-yellow-400" : "bg-green-500",
              ].join(" ")}
            />
            <span className="ob-typo-caption text-(--oboon-text-muted)">
              {dirty ? "변경사항 있음" : "자동 저장됨"}
            </span>
          </div>

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

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} showCloseIcon>
        <div className="ob-typo-h2 font-semibold text-(--oboon-text-title)">
          작성을 취소하시겠습니까?
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
    </>
  );
}
