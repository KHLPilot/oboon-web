"use client";

import Image from "next/image";
import { X } from "lucide-react";

import Button from "@/components/ui/Button";
import type { PropertyGalleryImage } from "@/features/company/hooks/usePropertyGallery";

export default function PropertyGallerySection({
  editMode,
  images,
  galleryInputRef,
  galleryUploading,
  galleryDeletingId,
  galleryReordering,
  draggingGalleryImageId,
  dragOverGalleryImageId,
  onSelect,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  editMode: boolean;
  images: PropertyGalleryImage[];
  galleryInputRef: React.RefObject<HTMLInputElement>;
  galleryUploading: boolean;
  galleryDeletingId: string | null;
  galleryReordering: boolean;
  draggingGalleryImageId: string | null;
  dragOverGalleryImageId: string | null;
  onSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDelete: (imageId: string) => void;
  onDragStart: (event: React.DragEvent<HTMLDivElement>, imageId: string) => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>, imageId: string) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>, imageId: string) => void;
  onDragEnd: () => void;
}) {
  return (
    <div className="mt-5 space-y-2 border-t border-(--oboon-border-default) pt-4">
      <div className="flex items-center justify-between">
        <h3 className="ob-typo-body font-semibold text-(--oboon-text-title)">
          추가 사진 (선택)
        </h3>
        <span className="ob-typo-caption text-(--oboon-text-muted)">
          {images.length}/10
        </span>
      </div>

      {editMode ? (
        <>
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={onSelect}
          />
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => galleryInputRef.current?.click()}
            disabled={galleryUploading || images.length >= 10}
            loading={galleryUploading}
          >
            이미지 업로드
          </Button>
          <p className="ob-typo-caption text-(--oboon-text-muted)">
            JPG, PNG, WEBP · 한 장당 5MB 이하 · 최대 10장
          </p>
        </>
      ) : null}

      {images.length === 0 ? (
        <div className="rounded-xl border border-dashed border-(--oboon-border-default) p-4 text-center ob-typo-caption text-(--oboon-text-muted)">
          등록된 추가 사진이 없습니다.
        </div>
      ) : (
        <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-5 md:overflow-visible">
          {images.map((image, index) => (
            <div
              key={image.id}
              draggable={editMode && !galleryReordering}
              onDragStart={(event) => onDragStart(event, image.id)}
              onDragOver={(event) => onDragOver(event, image.id)}
              onDrop={(event) => onDrop(event, image.id)}
              onDragEnd={onDragEnd}
              className={[
                "relative w-28 shrink-0 snap-start overflow-hidden rounded-xl border bg-(--oboon-bg-surface) transition md:w-auto",
                draggingGalleryImageId === image.id
                  ? "opacity-50 border-(--oboon-primary)"
                  : "border-(--oboon-border-default)",
                dragOverGalleryImageId === image.id
                  ? "ring-2 ring-(--oboon-primary)/50"
                  : "",
              ].join(" ")}
            >
              <div className="relative aspect-square w-full overflow-hidden bg-(--oboon-bg-subtle)">
                <Image
                  src={image.image_url}
                  alt={`현장 추가 사진 ${index + 1}`}
                  width={320}
                  height={320}
                  className="h-full w-full object-cover"
                />
                <div className="pointer-events-none absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-(--oboon-overlay) ob-typo-caption font-medium text-(--oboon-on-primary)">
                  {index + 1}
                </div>
                {editMode ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1 h-6 w-6 min-w-0 rounded-full p-0 !bg-transparent text-(--oboon-on-primary) hover:!bg-transparent hover:text-(--oboon-on-primary)"
                    disabled={galleryDeletingId === image.id}
                    onClick={() => onDelete(image.id)}
                  >
                    <X className="h-4 w-4 text-(--oboon-danger)" />
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
