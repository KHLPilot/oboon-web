export async function uploadFloorPlan(args: {
  file: File;
  propertyId: number;
  unitTypeName?: string;
}): Promise<string> {
  const { file, propertyId, unitTypeName } = args;

  if (!file) throw new Error("업로드할 파일이 없습니다.");
  if (!propertyId || !Number.isFinite(propertyId))
    throw new Error("propertyId가 올바르지 않습니다.");

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
    let detail = "";
    try {
      const j = await res.json();
      detail = j?.error ? String(j.error) : "";
    } catch {
      try {
        detail = await res.text();
      } catch {}
    }
    throw new Error(
      detail
        ? `파일 업로드 중 오류 발생: ${detail}`
        : "파일 업로드 중 오류 발생",
    );
  }

  const json = (await res.json()) as { url?: string };
  if (!json.url) {
    throw new Error(
      "업로드 응답에 url이 없습니다. /api/r2/upload 응답을 확인해주세요.",
    );
  }

  return json.url;
}
