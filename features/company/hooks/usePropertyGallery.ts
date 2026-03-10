"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";

export type PropertyGalleryImage = {
  id: string;
  property_id: number;
  storage_path: string;
  image_url: string;
  sort_order: number;
  caption: string | null;
  created_at: string;
};

type ToastLike = {
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
};

export function usePropertyGallery({
  propertyId,
  toast,
}: {
  propertyId: number;
  toast: ToastLike;
}) {
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const [galleryImages, setGalleryImages] = useState<PropertyGalleryImage[]>([]);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [galleryDeletingId, setGalleryDeletingId] = useState<string | null>(null);
  const [galleryReordering, setGalleryReordering] = useState(false);
  const [draggingGalleryImageId, setDraggingGalleryImageId] = useState<string | null>(null);
  const [dragOverGalleryImageId, setDragOverGalleryImageId] = useState<string | null>(null);

  const fetchGalleryImages = useCallback(async (targetPropertyId: number) => {
    try {
      const response = await fetch(`/api/property/gallery?propertyId=${targetPropertyId}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "추가 사진 조회에 실패했습니다");
      }
      setGalleryImages((payload.images || []) as PropertyGalleryImage[]);
    } catch (error) {
      console.error("property gallery fetch error:", error);
      setGalleryImages([]);
    }
  }, []);

  const handleGallerySelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      if (files.length === 0) return;

      if (galleryImages.length + files.length > 10) {
        toast.error("추가 사진은 최대 10장까지 등록할 수 있어요.", "업로드 실패");
        event.target.value = "";
        return;
      }

      setGalleryUploading(true);
      try {
        let latestImages: PropertyGalleryImage[] = galleryImages;
        let uploadedCount = 0;

        for (const file of files) {
          const formData = new FormData();
          formData.append("propertyId", String(propertyId));
          formData.append("files", file);

          const response = await fetch("/api/property/gallery", {
            method: "POST",
            body: formData,
          });
          const payload = await response.json().catch(() => null);
          if (!response.ok) {
            if (response.status === 413) {
              throw new Error(
                "업로드 용량이 너무 큽니다. 이미지 수를 줄이거나 파일 크기를 줄여 다시 시도해주세요.",
              );
            }
            throw new Error(
              payload?.error || "업로드 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.",
            );
          }
          latestImages = (payload?.images || []) as PropertyGalleryImage[];
          uploadedCount += 1;
        }

        setGalleryImages(latestImages);
        toast.success(
          uploadedCount > 0
            ? `추가 사진 ${uploadedCount}장이 업로드되었습니다.`
            : "추가 사진이 업로드되었습니다.",
          "완료",
        );
      } catch (error: unknown) {
        toast.error(
          (error instanceof Error ? error.message : "알 수 없는 오류") ||
            "업로드 중 오류가 발생했습니다.",
          "업로드 실패",
        );
      } finally {
        setGalleryUploading(false);
        event.target.value = "";
      }
    },
    [galleryImages.length, propertyId, toast],
  );

  const handleGalleryDelete = useCallback(
    async (imageId: string) => {
      if (!confirm("이 사진을 삭제할까요?")) return;

      setGalleryDeletingId(imageId);
      try {
        const response = await fetch("/api/property/gallery", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: imageId, propertyId }),
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "삭제에 실패했습니다");
        }

        setGalleryImages((payload.images || []) as PropertyGalleryImage[]);
        toast.success("사진이 삭제되었습니다.", "완료");
      } catch (error: unknown) {
        toast.error(
          (error instanceof Error ? error.message : "알 수 없는 오류") ||
            "삭제 중 오류가 발생했습니다.",
          "삭제 실패",
        );
      } finally {
        setGalleryDeletingId(null);
      }
    },
    [propertyId, toast],
  );

  const saveGalleryOrder = useCallback(
    async (reordered: PropertyGalleryImage[]) => {
      const updates = reordered.map((image, index) => ({
        id: image.id,
        sort_order: index + 1,
        caption: image.caption,
      }));

      setGalleryReordering(true);
      try {
        const response = await fetch("/api/property/gallery", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ propertyId, updates }),
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "정렬 저장에 실패했습니다");
        }

        setGalleryImages((payload.images || []) as PropertyGalleryImage[]);
      } catch (error: unknown) {
        toast.error(
          (error instanceof Error ? error.message : "알 수 없는 오류") ||
            "정렬 저장 중 오류가 발생했습니다.",
          "정렬 실패",
        );
      } finally {
        setGalleryReordering(false);
      }
    },
    [propertyId, toast],
  );

  const handleGalleryDragStart = useCallback(
    (event: DragEvent<HTMLDivElement>, imageId: string) => {
      if (galleryReordering) return;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", imageId);
      setDraggingGalleryImageId(imageId);
      setDragOverGalleryImageId(null);
    },
    [galleryReordering],
  );

  const handleGalleryDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>, imageId: string) => {
      if (!draggingGalleryImageId || draggingGalleryImageId === imageId) return;
      event.preventDefault();
      setDragOverGalleryImageId(imageId);
    },
    [draggingGalleryImageId],
  );

  const handleGalleryDragEnd = useCallback(() => {
    setDraggingGalleryImageId(null);
    setDragOverGalleryImageId(null);
  }, []);

  const handleGalleryDrop = useCallback(
    async (event: DragEvent<HTMLDivElement>, targetImageId: string) => {
      event.preventDefault();

      const sourceImageId =
        draggingGalleryImageId || event.dataTransfer.getData("text/plain");
      if (!sourceImageId || sourceImageId === targetImageId) {
        handleGalleryDragEnd();
        return;
      }

      const sourceIndex = galleryImages.findIndex((image) => image.id === sourceImageId);
      const targetIndex = galleryImages.findIndex((image) => image.id === targetImageId);

      if (sourceIndex < 0 || targetIndex < 0) {
        handleGalleryDragEnd();
        return;
      }

      const reordered = [...galleryImages];
      const [moved] = reordered.splice(sourceIndex, 1);
      reordered.splice(targetIndex, 0, moved);

      handleGalleryDragEnd();
      await saveGalleryOrder(reordered);
    },
    [draggingGalleryImageId, galleryImages, handleGalleryDragEnd, saveGalleryOrder],
  );

  return {
    galleryInputRef,
    galleryImages,
    galleryUploading,
    galleryDeletingId,
    galleryReordering,
    draggingGalleryImageId,
    dragOverGalleryImageId,
    fetchGalleryImages,
    handleGallerySelect,
    handleGalleryDelete,
    handleGalleryDragStart,
    handleGalleryDragOver,
    handleGalleryDragEnd,
    handleGalleryDrop,
  };
}
