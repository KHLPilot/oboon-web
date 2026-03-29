import { AppError, ERR } from "@/lib/errors";

export async function uploadFloorPlan(args: {
  file: File;
  propertyId: number;
  unitTypeName?: string;
}): Promise<string> {
  const { file, propertyId, unitTypeName } = args;

  if (!file) {
    throw new AppError(ERR.VALIDATION, "업로드할 파일이 없습니다.", 400);
  }
  if (!propertyId || !Number.isFinite(propertyId))
    throw new AppError(ERR.VALIDATION, "propertyId가 올바르지 않습니다.", 400);

  const fd = new FormData();
  fd.append("file", file);
  fd.append("propertyId", String(propertyId));
  fd.append("mode", "property_floor_plan");
  if (unitTypeName) fd.append("unitType", unitTypeName);

  const res = await fetch("/api/r2/upload", {
    method: "POST",
    body: fd,
  });

  // 서버가 json 에러를 내려주든 텍스트를 내려주든 안전 처리
  if (!res.ok) {
    try {
      await res.json();
    } catch {
      try {
        await res.text();
      } catch {}
    }
    throw new AppError(
      ERR.DB_QUERY,
      "파일 업로드 중 오류가 발생했습니다.",
      res.status || 500,
      { status: res.status },
    );
  }

  const json = (await res.json()) as { url?: string };
  if (!json.url) {
    throw new AppError(
      ERR.DB_QUERY,
      "업로드 응답이 올바르지 않습니다.",
      500,
    );
  }

  return json.url;
}
