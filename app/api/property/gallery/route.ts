import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import {
  DeleteObjectsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const TABLE_NAME = "property_gallery_images";
const MAX_IMAGES = 10;
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

function extFromMimeType(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return null;
}

function buildR2PublicUrl(key: string) {
  return `${R2_PUBLIC_BASE_URL.replace(/\/+$/, "")}/${key}`;
}

function parsePropertyId(value: FormDataEntryValue | string | null) {
  const raw = typeof value === "string" ? value : value?.toString() ?? "";
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
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

async function canManageProperty(
  supabase: Awaited<ReturnType<typeof createAuthedClient>>,
  propertyId: number,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, error: "로그인이 필요합니다", status: 401 };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = profile?.role ?? null;

  if (role === "admin") {
    return { ok: true as const, userId: user.id, role };
  }

  const { data: property } = await supabase
    .from("properties")
    .select("created_by")
    .eq("id", propertyId)
    .single();

  if (!property) {
    return { ok: false as const, error: "현장을 찾을 수 없습니다", status: 404 };
  }

  if (property.created_by === user.id) {
    return { ok: true as const, userId: user.id, role };
  }

  if (role === "agent") {
    const { data: memberships } = await supabase
      .from("property_agents")
      .select("id")
      .eq("property_id", propertyId)
      .eq("agent_id", user.id)
      .eq("status", "approved")
      .limit(1);

    if ((memberships?.length ?? 0) > 0) {
      return { ok: true as const, userId: user.id, role };
    }
  }

  return { ok: false as const, error: "권한이 없습니다", status: 403 };
}

export async function GET(req: Request) {
  try {
    const supabase = await createAuthedClient();
    const { searchParams } = new URL(req.url);
    const propertyId = parsePropertyId(searchParams.get("propertyId"));
    if (!propertyId) {
      return NextResponse.json({ error: "propertyId가 필요합니다" }, { status: 400 });
    }

    const auth = await canManageProperty(supabase, propertyId);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("id, property_id, storage_path, image_url, sort_order, caption, created_at")
      .eq("property_id", propertyId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "추가 사진 조회에 실패했습니다" },
        { status: 500 },
      );
    }

    return NextResponse.json({ images: data || [] });
  } catch (error) {
    console.error("GET /api/property/gallery 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createAuthedClient();
    const formData = await req.formData();
    const propertyId = parsePropertyId(formData.get("propertyId"));
    const files = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File);

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId가 필요합니다" }, { status: 400 });
    }

    const auth = await canManageProperty(supabase, propertyId);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: "업로드할 이미지가 없습니다" },
        { status: 400 },
      );
    }

    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return NextResponse.json(
          {
            error:
              "지원 형식이 아니에요. JPG, PNG, WEBP 파일만 업로드할 수 있어요.",
          },
          { status: 400 },
        );
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: "사진이 너무 커요. 한 장당 5MB 이하로 올려주세요." },
          { status: 400 },
        );
      }
    }

    const { data: existingRows, error: countError } = await supabase
      .from(TABLE_NAME)
      .select("id, sort_order")
      .eq("property_id", propertyId);

    if (countError) {
      return NextResponse.json(
        { error: "기존 추가 사진 확인에 실패했습니다" },
        { status: 500 },
      );
    }

    const existingCount = existingRows?.length ?? 0;
    if (existingCount + files.length > MAX_IMAGES) {
      return NextResponse.json(
        { error: `추가 사진은 최대 ${MAX_IMAGES}장까지 등록할 수 있어요.` },
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
      property_id: number;
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

      const storagePath = `properties/${propertyId}/gallery/${crypto.randomUUID()}.${ext}`;
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
      } catch (uploadError) {
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

        console.error("R2 업로드 오류:", uploadError);
        return NextResponse.json(
          {
            error:
              "한 번에 올리는 용량이 커서 업로드가 중단됐어요. 사진 수를 줄이거나 용량을 낮춰 다시 시도해 주세요.",
          },
          { status: 500 },
        );
      }

      uploadedKeys.push(storagePath);
      insertRows.push({
        property_id: propertyId,
        storage_path: storagePath,
        image_url: buildR2PublicUrl(storagePath),
        sort_order: maxSortOrder + i + 1,
        caption: null,
      });
    }

    const { error: insertError } = await supabase.from(TABLE_NAME).insert(insertRows);
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

      return NextResponse.json(
        { error: "업로드 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요." },
        { status: 500 },
      );
    }

    const { data: refreshed } = await supabase
      .from(TABLE_NAME)
      .select("id, property_id, storage_path, image_url, sort_order, caption, created_at")
      .eq("property_id", propertyId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    return NextResponse.json({ images: refreshed || [] });
  } catch (error) {
    console.error("POST /api/property/gallery 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createAuthedClient();
    const body = await req.json().catch(() => null);
    const propertyId = parsePropertyId(body?.propertyId ?? null);
    const updates = (body?.updates || []) as GalleryUpdateItem[];

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId가 필요합니다" }, { status: 400 });
    }
    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: "업데이트할 항목이 없습니다" }, { status: 400 });
    }

    const auth = await canManageProperty(supabase, propertyId);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const ids = updates.map((item) => item.id);
    const { data: existingRows, error: existingError } = await supabase
      .from(TABLE_NAME)
      .select("id")
      .eq("property_id", propertyId)
      .in("id", ids);

    if (existingError) {
      return NextResponse.json(
        { error: "추가 사진 확인에 실패했습니다" },
        { status: 500 },
      );
    }

    if ((existingRows?.length ?? 0) !== ids.length) {
      return NextResponse.json(
        { error: "정렬 가능한 사진 목록이 유효하지 않습니다" },
        { status: 400 },
      );
    }

    for (const update of updates) {
      const { error: updateError } = await supabase
        .from(TABLE_NAME)
        .update({
          sort_order: update.sort_order,
          caption: update.caption ?? null,
        })
        .eq("id", update.id)
        .eq("property_id", propertyId);

      if (updateError) {
        return NextResponse.json(
          { error: "정렬 저장에 실패했습니다" },
          { status: 500 },
        );
      }
    }

    const { data: refreshed } = await supabase
      .from(TABLE_NAME)
      .select("id, property_id, storage_path, image_url, sort_order, caption, created_at")
      .eq("property_id", propertyId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    return NextResponse.json({ images: refreshed || [] });
  } catch (error) {
    console.error("PATCH /api/property/gallery 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createAuthedClient();
    const body = await req.json().catch(() => null);
    const imageId = String(body?.id || "");
    const propertyId = parsePropertyId(body?.propertyId ?? null);

    if (!imageId) {
      return NextResponse.json({ error: "삭제할 id가 필요합니다" }, { status: 400 });
    }
    if (!propertyId) {
      return NextResponse.json({ error: "propertyId가 필요합니다" }, { status: 400 });
    }

    const auth = await canManageProperty(supabase, propertyId);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { data: target, error: targetError } = await supabase
      .from(TABLE_NAME)
      .select("id, storage_path")
      .eq("id", imageId)
      .eq("property_id", propertyId)
      .maybeSingle();

    if (targetError) {
      return NextResponse.json(
        { error: "삭제할 사진 조회에 실패했습니다" },
        { status: 500 },
      );
    }
    if (!target) {
      return NextResponse.json({ error: "사진을 찾을 수 없습니다" }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq("id", imageId)
      .eq("property_id", propertyId);

    if (deleteError) {
      return NextResponse.json({ error: "사진 삭제에 실패했습니다" }, { status: 500 });
    }

    try {
      await r2.send(
        new DeleteObjectsCommand({
          Bucket: R2_BUCKET_NAME,
          Delete: { Objects: [{ Key: target.storage_path }] },
        }),
      );
    } catch (r2Error) {
      console.error("R2 파일 삭제 오류:", r2Error);
    }

    const { data: refreshed } = await supabase
      .from(TABLE_NAME)
      .select("id, property_id, storage_path, image_url, sort_order, caption, created_at")
      .eq("property_id", propertyId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    return NextResponse.json({ images: refreshed || [] });
  } catch (error) {
    console.error("DELETE /api/property/gallery 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}
