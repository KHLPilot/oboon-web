"use client";

import { useRef, useState } from "react";
import Image from "next/image";

import Button from "@/components/ui/Button";

type Board = {
  id: string;
  key: string;
  name: string;
  cover_image_url: string | null;
};

type Category = {
  id: string;
  key: string;
  name: string;
  board_id: string;
  cover_image_url: string | null;
};

type Props = {
  boards: Board[];
  categories: Category[];
};

type UploadTarget =
  | { type: "board"; id: string }
  | { type: "category"; id: string };

type UploadStatus = {
  loading: boolean;
  error: string | null;
};

async function readErrorMessage(
  res: Response,
  fallbackMessage: string,
): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error?.trim() || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

function withCacheBust(url: string): string {
  const joiner = url.includes("?") ? "&" : "?";
  return `${url}${joiner}v=${Date.now()}`;
}

function CoverUploadCard({
  title,
  imageUrl,
  status,
  onFileSelect,
}: {
  title: string;
  imageUrl: string | null;
  status: UploadStatus;
  onFileSelect: (file: File) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="ob-typo-body font-medium text-(--oboon-text-title)">
            {title}
          </div>
          <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
            권장 비율 16:9
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.currentTarget.value = "";
            if (!file) return;
            void onFileSelect(file);
          }}
        />
        <Button
          variant="secondary"
          size="sm"
          shape="pill"
          loading={status.loading}
          onClick={() => inputRef.current?.click()}
        >
          파일 업로드
        </Button>
      </div>

      <div className="relative aspect-video overflow-hidden rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle)">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={`${title} 커버`}
            fill
            className="object-cover"
            sizes="(min-width: 1024px) 720px, 100vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center ob-typo-body text-(--oboon-text-muted)">
            등록된 커버가 없습니다.
          </div>
        )}
      </div>

      {status.error ? (
        <div className="mt-3 ob-typo-caption text-red-500">{status.error}</div>
      ) : null}
    </div>
  );
}

export default function EditorCoversTab({ boards, categories }: Props) {
  const [boardItems, setBoardItems] = useState<Board[]>(boards);
  const [categoryItems, setCategoryItems] = useState<Category[]>(categories);
  const [statusMap, setStatusMap] = useState<Record<string, UploadStatus>>({});

  const generalBoard =
    boardItems.find((board) => board.key === "general") ?? null;
  const oboonOriginalBoard =
    boardItems.find((board) => board.key === "oboon_original") ?? null;
  const oboonOriginalCategories = oboonOriginalBoard
    ? categoryItems.filter((category) => category.board_id === oboonOriginalBoard.id)
    : [];

  function setStatus(target: UploadTarget, next: UploadStatus) {
    const key = `${target.type}:${target.id}`;
    setStatusMap((prev) => ({ ...prev, [key]: next }));
  }

  function getStatus(target: UploadTarget): UploadStatus {
    return statusMap[`${target.type}:${target.id}`] ?? {
      loading: false,
      error: null,
    };
  }

  async function uploadCover(target: UploadTarget, file: File) {
    setStatus(target, { loading: true, error: null });

    try {
      const formData = new FormData();
      formData.append("file", file);

      if (target.type === "board") {
        formData.append("mode", "briefing_board_cover");
        formData.append("boardId", target.id);
      } else {
        formData.append("mode", "briefing_category_cover");
        formData.append("categoryId", target.id);
      }

      const uploadRes = await fetch("/api/r2/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        setStatus(target, {
          loading: false,
          error: await readErrorMessage(uploadRes, "이미지 업로드에 실패했습니다."),
        });
        return;
      }

      const { url } = (await uploadRes.json()) as { url?: string };
      if (!url) {
        setStatus(target, {
          loading: false,
          error: "업로드 URL을 받지 못했습니다.",
        });
        return;
      }

      const saveRes = await fetch("/api/briefing/editor/covers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: target.type,
          id: target.id,
          cover_image_url: url,
        }),
      });

      if (!saveRes.ok) {
        setStatus(target, {
          loading: false,
          error: await readErrorMessage(saveRes, "커버 저장에 실패했습니다."),
        });
        return;
      }

      const previewUrl = withCacheBust(url);

      if (target.type === "board") {
        setBoardItems((prev) =>
          prev.map((board) =>
            board.id === target.id
              ? { ...board, cover_image_url: previewUrl }
              : board,
          ),
        );
      } else {
        setCategoryItems((prev) =>
          prev.map((category) =>
            category.id === target.id
              ? { ...category, cover_image_url: previewUrl }
              : category,
          ),
        );
      }

      setStatus(target, { loading: false, error: null });
    } catch {
      setStatus(target, {
        loading: false,
        error: "업로드 중 오류가 발생했습니다.",
      });
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h2 className="ob-typo-h2 text-(--oboon-text-title)">일반 브리핑 보드</h2>
          <p className="mt-1 ob-typo-body text-(--oboon-text-muted)">
            일반 브리핑 메인 커버를 관리합니다.
          </p>
        </div>

        {generalBoard ? (
          <CoverUploadCard
            title={generalBoard.name}
            imageUrl={generalBoard.cover_image_url}
            status={getStatus({ type: "board", id: generalBoard.id })}
            onFileSelect={(file) =>
              uploadCover({ type: "board", id: generalBoard.id }, file)
            }
          />
        ) : (
          <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-6 ob-typo-body text-(--oboon-text-muted)">
            일반 브리핑 보드를 찾지 못했습니다.
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="ob-typo-h2 text-(--oboon-text-title)">
            오분 오리지널 카테고리
          </h2>
          <p className="mt-1 ob-typo-body text-(--oboon-text-muted)">
            오분 오리지널 카테고리별 커버 이미지를 관리합니다.
          </p>
        </div>

        {oboonOriginalCategories.length > 0 ? (
          <div className="space-y-4">
            {oboonOriginalCategories.map((category) => (
              <CoverUploadCard
                key={category.id}
                title={category.name}
                imageUrl={category.cover_image_url}
                status={getStatus({ type: "category", id: category.id })}
                onFileSelect={(file) =>
                  uploadCover({ type: "category", id: category.id }, file)
                }
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-6 ob-typo-body text-(--oboon-text-muted)">
            오분 오리지널 카테고리를 찾지 못했습니다.
          </div>
        )}
      </section>
    </div>
  );
}
