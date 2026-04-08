"use client";

type UploadBriefingImageArgs = {
  file: File;
  mode: "briefing_cover" | "briefing_content";
  postId: string;
};

export async function uploadBriefingImage({
  file,
  mode,
  postId,
}: UploadBriefingImageArgs): Promise<string> {
  if (!file) {
    throw new Error("업로드할 파일이 없습니다.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("mode", mode);
  formData.append("postId", postId);

  const res = await fetch("/api/r2/upload", {
    method: "POST",
    body: formData,
  });

  const data = (await res.json().catch(() => ({}))) as { error?: string; url?: string };

  if (!res.ok) {
    throw new Error(data.error ?? "업로드 실패");
  }

  if (!data.url) {
    throw new Error("업로드 응답이 올바르지 않습니다.");
  }

  return data.url;
}
