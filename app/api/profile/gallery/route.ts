import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import {
  DeleteObjectsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  deleteProfileGalleryRows,
  fetchOwnedProfileGalleryRows,
  fetchProfileGalleryDeleteRows,
  fetchProfileGalleryImages,
  fetchProfileGallerySortRows,
  insertProfileGalleryRows,
  updateProfileGalleryRow,
} from "@/features/profile/services/profile.gallery";
import { handleServiceError } from "@/lib/api/route-error";
import { unwrapErrorCause } from "@/lib/errors";

const MAX_IMAGES = 5;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME!;
const R2_PUBLIC_BASE_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL!;

export const runtime = "nodejs";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

type GalleryUpdateItem = {
  id: string;
  sort_order: number;
  caption?: string | null;
};

function isMissingSchemaError(error: unknown): boolean {
  const source = unwrapErrorCause(error);
  if (!source || typeof source !== "object") return false;
  const code = String((source as { code?: unknown }).code ?? "");
  const message = String((source as { message?: unknown }).message ?? "");
  return (
    code === "42P01" ||
    code === "42703" ||
    code === "PGRST204" ||
    message.includes("schema cache")
  );
}

function extFromMimeType(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return null;
}

function buildR2PublicUrl(key: string) {
  return `${R2_PUBLIC_BASE_URL.replace(/\/+$/, "")}/${key}`;
}

async function createAuthedClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // 읽기 전용 컨텍스트는 무시
          }
        },
      },
    },
  );
}

export async function GET(req: Request) {
  try {
    const supabase = await createAuthedClient();
    const { searchParams } = new URL(req.url);
    const requestedUserId = searchParams.get("userId");

    let targetUserId = requestedUserId;
    if (!targetUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json(
          { error: "userId가 필요합니다" },
          { status: 400 },
        );
      }
      targetUserId = user.id;
    }

    const { data, error } = await fetchProfileGalleryImages(targetUserId);

    if (error) {
      if (isMissingSchemaError(error)) {
        return NextResponse.json({ images: [] });
      }
      return handleServiceError(error, "갤러리 조회에 실패했습니다");
    }

    return NextResponse.json({ images: data || [] });
  } catch (error) {
    console.error("GET /api/profile/gallery 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createAuthedClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 },
      );
    }

    const formData = await req.formData();
    const files = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File);

    if (files.length === 0) {
      return NextResponse.json(
        { error: "업로드할 이미지가 없습니다" },
        { status: 400 },
      );
    }

    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return NextResponse.json(
          { error: "jpg, png, webp 파일만 업로드할 수 있습니다" },
          { status: 400 },
        );
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: "파일당 5MB 이하만 업로드할 수 있습니다" },
          { status: 400 },
        );
      }
    }

    const { data: existingRows, error: countError } =
      await fetchProfileGallerySortRows(user.id);

    if (countError) {
      return handleServiceError(countError, "기존 갤러리 확인에 실패했습니다");
    }

    const existingCount = existingRows?.length ?? 0;
    if (existingCount + files.length > MAX_IMAGES) {
      return NextResponse.json(
        { error: `최대 ${MAX_IMAGES}장까지 업로드할 수 있습니다` },
        { status: 400 },
      );
    }

    const maxSortOrder =
      existingRows?.reduce(
        (max, row) => (row.sort_order > max ? row.sort_order : max),
        0,
      ) ?? 0;

    const uploadedKeys: string[] = [];
    const insertRows: Array<{
      user_id: string;
      storage_path: string;
      image_url: string;
      sort_order: number;
      caption: string | null;
    }> = [];

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const ext = extFromMimeType(file.type);
      if (!ext) {
        return NextResponse.json(
          { error: "지원하지 않는 파일 형식입니다" },
          { status: 400 },
        );
      }

      const storagePath = `agent/${user.id}/${crypto.randomUUID()}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      try {
        await r2.send(
          new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: storagePath,
            Body: buffer,
            ContentType: file.type || "application/octet-stream",
          }),
        );
      } catch {
        // 실패 시 이미 업로드된 파일은 정리
        if (uploadedKeys.length > 0) {
          await r2.send(
            new DeleteObjectsCommand({
              Bucket: R2_BUCKET_NAME,
              Delete: {
                Objects: uploadedKeys.map((key) => ({ Key: key })),
              },
            }),
          );
        }
        return NextResponse.json(
          { error: "이미지 업로드에 실패했습니다" },
          { status: 500 },
        );
      }

      uploadedKeys.push(storagePath);

      insertRows.push({
        user_id: user.id,
        storage_path: storagePath,
        image_url: buildR2PublicUrl(storagePath),
        sort_order: maxSortOrder + i + 1,
        caption: null,
      });
    }

    const { data: inserted, error: insertError } =
      await insertProfileGalleryRows(insertRows);

    if (insertError) {
      if (uploadedKeys.length > 0) {
        await r2.send(
          new DeleteObjectsCommand({
            Bucket: R2_BUCKET_NAME,
            Delete: {
              Objects: uploadedKeys.map((key) => ({ Key: key })),
            },
          }),
        );
      }
      return handleServiceError(insertError, "갤러리 저장에 실패했습니다");
    }

    return NextResponse.json({ images: inserted || [] });
  } catch (error) {
    console.error("POST /api/profile/gallery 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createAuthedClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const updates = (body?.updates || []) as GalleryUpdateItem[];
    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: "수정할 항목이 없습니다" },
        { status: 400 },
      );
    }

    const ids = updates.map((item) => item.id).filter(Boolean);
    const { data: ownedRows, error: ownedError } =
      await fetchOwnedProfileGalleryRows(user.id, ids);

    if (ownedError) {
      return handleServiceError(ownedError, "수정 대상 확인에 실패했습니다");
    }

    if ((ownedRows?.length ?? 0) !== ids.length) {
      return NextResponse.json(
        { error: "본인 이미지만 수정할 수 있습니다" },
        { status: 403 },
      );
    }

    for (const item of updates) {
      const { error: updateError } = await updateProfileGalleryRow(user.id, {
        id: item.id,
        sort_order: item.sort_order,
        caption: item.caption ?? null,
      });

      if (updateError) {
        return handleServiceError(updateError, "정렬/설명 저장에 실패했습니다");
      }
    }

    const { data: refreshed, error: refreshError } =
      await fetchProfileGalleryImages(user.id);

    if (refreshError) {
      return handleServiceError(refreshError, "변경 내역 조회에 실패했습니다");
    }

    return NextResponse.json({ images: refreshed || [] });
  } catch (error) {
    console.error("PATCH /api/profile/gallery 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createAuthedClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const ids = Array.isArray(body?.ids)
      ? (body.ids as string[])
      : body?.id
        ? [body.id as string]
        : [];

    if (ids.length === 0) {
      return NextResponse.json(
        { error: "삭제할 이미지 ID가 필요합니다" },
        { status: 400 },
      );
    }

    const { data: rows, error: fetchError } = await fetchProfileGalleryDeleteRows(
      user.id,
      ids,
    );

    if (fetchError) {
      return handleServiceError(fetchError, "삭제 대상을 조회하지 못했습니다");
    }

    if ((rows?.length ?? 0) !== ids.length) {
      return NextResponse.json(
        { error: "본인 이미지만 삭제할 수 있습니다" },
        { status: 403 },
      );
    }

    const storagePaths = (rows || [])
      .map((row) => row.storage_path)
      .filter((path): path is string => Boolean(path));

    if (storagePaths.length > 0) {
      try {
        await r2.send(
          new DeleteObjectsCommand({
            Bucket: R2_BUCKET_NAME,
            Delete: {
              Objects: storagePaths.map((key) => ({ Key: key })),
            },
          }),
        );
      } catch (storageDeleteError) {
        console.error("R2 이미지 삭제 오류:", storageDeleteError);
        return NextResponse.json(
          { error: "스토리지 이미지 삭제에 실패했습니다" },
          { status: 500 },
        );
      }
    }

    const { error: deleteError } = await deleteProfileGalleryRows(user.id, ids);

    if (deleteError) {
      return handleServiceError(deleteError, "갤러리 삭제에 실패했습니다");
    }

    const { data: refreshed, error: refreshError } =
      await fetchProfileGalleryImages(user.id);

    if (refreshError) {
      return handleServiceError(refreshError, "삭제 후 갤러리 조회에 실패했습니다");
    }

    return NextResponse.json({ images: refreshed || [] });
  } catch (error) {
    console.error("DELETE /api/profile/gallery 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}
