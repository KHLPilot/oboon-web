// app/api/r2/upload/route.ts

import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { handleApiError } from "@/lib/api/route-error";
import { uuidV4Schema } from "@/lib/api/route-security";
import { createSupabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_UPLOAD_MODES = [
  "property_main",
  "property_floor_plan",
  "briefing_cover",
  "briefing_content",
  "briefing_board_cover",
  "briefing_category_cover",
  "agent_avatar",
] as const;

type UploadMode = (typeof ALLOWED_UPLOAD_MODES)[number];

const ALLOWED_IMAGE_SIGNATURES: Record<string, string> = {
  ffd8ffe0: "image/jpeg",
  ffd8ffe1: "image/jpeg",
  ffd8ffe2: "image/jpeg",
  ffd8ffe3: "image/jpeg",
  ffd8ffe8: "image/jpeg",
  "89504e47": "image/png",
  "47494638": "image/gif",
};

const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

function safeSeg(input: string) {
  return (input ?? "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 40);
}

function parseUploadMode(rawMode: FormDataEntryValue | null): UploadMode | null {
  const normalized = rawMode?.toString().trim() ?? "";
  if (!normalized) return null;

  return ALLOWED_UPLOAD_MODES.includes(normalized as UploadMode)
    ? (normalized as UploadMode)
    : null;
}

function isNumericId(value: string | null): value is string {
  return Boolean(value) && /^\d+$/.test(value);
}

function detectMimeType(bytes: Uint8Array): string | null {
  if (bytes.length < 4) return null;

  const headerHex = Array.from(bytes.slice(0, 4))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  const directMatch =
    ALLOWED_IMAGE_SIGNATURES[headerHex] ??
    ALLOWED_IMAGE_SIGNATURES[headerHex.slice(0, 8)];

  if (directMatch) {
    return directMatch;
  }

  const riffHeader = headerHex === "52494646";
  const webpSignature =
    bytes.length >= 12 &&
    String.fromCharCode(...Array.from(bytes.slice(8, 12))) === "WEBP";

  if (riffHeader && webpSignature) {
    return "image/webp";
  }

  return null;
}

function getExtensionForMime(mimeType: string): string {
  return MIME_TO_EXTENSION[mimeType] ?? "bin";
}

async function uploadToR2(args: {
  key: string;
  body: Buffer;
  contentType: string;
}) {
  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
      Key: args.key,
      Body: args.body,
      ContentType: args.contentType,
    }),
  );
}

function getPublicUrl(key: string): string {
  return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`;
}

function randomKeySegment() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 },
      );
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const propertyId = form.get("propertyId") as string | null;
    const postId = (form.get("postId") as string | null)?.trim() || null;
    const boardId = (form.get("boardId") as string | null)?.trim() || null;
    const categoryId =
      (form.get("categoryId") as string | null)?.trim() || null;
    const userId = (form.get("userId") as string | null)?.trim() || null;
    const mode = parseUploadMode(form.get("mode"));
    const unitType = (form.get("unitType") as string | null)?.trim() || "";

    if (!file) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }

    if (!mode) {
      return NextResponse.json(
        { error: "유효하지 않은 업로드 유형" },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "파일 크기는 10MB를 초과할 수 없습니다" },
        { status: 400 },
      );
    }

    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const detectedMime = detectMimeType(fileBytes);
    if (!detectedMime) {
      return NextResponse.json(
        { error: "허용되지 않는 파일 형식" },
        { status: 400 },
      );
    }

    const ext = getExtensionForMime(detectedMime);
    const fileBody = Buffer.from(fileBytes);
    const numericPropertyId = propertyId ? Number(propertyId) : NaN;

    if (
      mode === "property_main" ||
      mode === "property_floor_plan"
    ) {
      if (!propertyId || !Number.isFinite(numericPropertyId)) {
        return NextResponse.json(
          { error: "propertyId required" },
          { status: 400 },
        );
      }

      const { data: agentRow, error: agentError } = await supabase
        .from("property_agents")
        .select("id")
        .eq("property_id", numericPropertyId)
        .eq("agent_id", user.id)
        .eq("status", "approved")
        .maybeSingle();

      if (agentError) {
        throw agentError;
      }

      if (!agentRow) {
        return NextResponse.json(
          { error: "권한이 없습니다" },
          { status: 403 },
        );
      }
    }

    if (
      mode === "briefing_cover" ||
      mode === "briefing_content" ||
      mode === "briefing_board_cover" ||
      mode === "briefing_category_cover"
    ) {
      if (
        (mode === "briefing_cover" || mode === "briefing_content") &&
        !uuidV4Schema.safeParse(postId).success
      ) {
        return NextResponse.json(
          { error: "유효하지 않은 postId" },
          { status: 400 },
        );
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (!profile || !["admin", "company"].includes(profile.role ?? "")) {
        return NextResponse.json(
          { error: "권한이 없습니다" },
          { status: 403 },
        );
      }
    }

    if (mode === "property_main") {
      // 대표 이미지는 교체 업로드가 잦아 고정 경로를 쓰면 CDN/브라우저 캐시로
      // 이전 이미지가 보일 수 있어 버전 키를 사용한다.
      const key = `properties/${propertyId}/main-${Date.now()}.${ext}`;

      await uploadToR2({ key, body: fileBody, contentType: detectedMime });

      return NextResponse.json({ url: getPublicUrl(key) });
    }

    if (mode === "property_floor_plan") {
      const seg = safeSeg(unitType) || "floorplan";
      const key = `properties/${propertyId}/floor-plans/${randomKeySegment()}_${seg}.${ext}`;

      await uploadToR2({ key, body: fileBody, contentType: detectedMime });

      return NextResponse.json({ url: getPublicUrl(key) });
    }

    if (mode === "briefing_cover") {
      if (!isNumericId(postId)) {
        return NextResponse.json(
          { error: "postId required (numeric)" },
          { status: 400 },
        );
      }

      const key = `briefing/posts/${postId}/cover.${ext}`;

      await uploadToR2({ key, body: fileBody, contentType: detectedMime });

      return NextResponse.json({ url: getPublicUrl(key) });
    }

    if (mode === "briefing_content") {
      if (!isNumericId(postId)) {
        return NextResponse.json(
          { error: "postId required (numeric)" },
          { status: 400 },
        );
      }

      const key = `briefing/posts/${postId}/content/${randomKeySegment()}.${ext}`;

      await uploadToR2({ key, body: fileBody, contentType: detectedMime });

      return NextResponse.json({ url: getPublicUrl(key) });
    }

    if (mode === "briefing_board_cover") {
      if (!isNumericId(boardId)) {
        return NextResponse.json({ error: "boardId required (numeric)" }, { status: 400 });
      }

      const key = `briefing/boards/${boardId}/cover.${ext}`;

      await uploadToR2({ key, body: fileBody, contentType: detectedMime });

      return NextResponse.json({ url: getPublicUrl(key) });
    }

    if (mode === "briefing_category_cover") {
      if (!isNumericId(categoryId)) {
        return NextResponse.json(
          { error: "categoryId required (numeric)" },
          { status: 400 },
        );
      }

      const key = `briefing/categories/${categoryId}/cover.${ext}`;

      await uploadToR2({ key, body: fileBody, contentType: detectedMime });

      return NextResponse.json({ url: getPublicUrl(key) });
    }

    if (mode === "agent_avatar") {
      if (!userId) {
        return NextResponse.json({ error: "userId required" }, { status: 400 });
      }

      if (userId !== user.id) {
        return NextResponse.json(
          { error: "권한이 없습니다" },
          { status: 403 },
        );
      }

      const key = `profiles/${userId}/avatar-${Date.now()}.${ext}`;
      await uploadToR2({ key, body: fileBody, contentType: detectedMime });

      return NextResponse.json({ url: getPublicUrl(key), key });
    }

    return NextResponse.json(
      { error: "유효하지 않은 업로드 유형" },
      { status: 400 },
    );
  } catch (e: unknown) {
    return handleApiError("r2/upload", e, {
      clientMessage: "업로드 처리 중 오류가 발생했습니다",
    });
  }
}
