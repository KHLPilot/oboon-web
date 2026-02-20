import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createHash } from "node:crypto";
import {
  DeleteObjectsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const TABLE_NAME = "property_gallery_images";
const IMAGE_ASSET_TABLE = "property_image_assets";
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

type LegacyGalleryRow = {
  id: string;
  property_id: number;
  storage_path: string | null;
  image_url: string;
  sort_order: number;
  caption: string | null;
  created_at: string | null;
};

type GalleryAssetRow = {
  id: string;
  property_id: number;
  image_url: string;
  storage_path: string | null;
  sort_order: number | null;
  caption: string | null;
  image_hash: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type GalleryResponseRow = {
  id: string;
  property_id: number;
  storage_path: string | null;
  image_url: string;
  sort_order: number;
  caption: string | null;
  created_at: string | null;
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

function mapAssetRowsToResponse(rows: GalleryAssetRow[]): GalleryResponseRow[] {
  return rows
    .sort((a, b) => {
      const sortDiff = (a.sort_order ?? 0) - (b.sort_order ?? 0);
      if (sortDiff !== 0) return sortDiff;
      return (a.created_at ?? "").localeCompare(b.created_at ?? "");
    })
    .map((row, index) => ({
      id: row.id,
      property_id: row.property_id,
      storage_path: row.storage_path,
      image_url: row.image_url,
      sort_order: row.sort_order ?? index,
      caption: row.caption,
      created_at: row.created_at,
    }));
}

function resolveStorageKey(
  storagePath: string | null | undefined,
  imageUrl: string | null | undefined,
) {
  if (storagePath) return storagePath;
  if (!imageUrl) return null;
  const base = R2_PUBLIC_BASE_URL.replace(/\/+$/, "");
  if (!imageUrl.startsWith(base + "/")) return null;
  return imageUrl.slice(base.length + 1);
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

async function fetchGalleryAssets(
  supabase: Awaited<ReturnType<typeof createAuthedClient>>,
  propertyId: number,
) {
  const { data, error } = await supabase
    .from(IMAGE_ASSET_TABLE)
    .select(
      "id, property_id, image_url, storage_path, sort_order, caption, image_hash, created_at, updated_at",
    )
    .eq("property_id", propertyId)
    .eq("kind", "gallery")
    .eq("is_active", true);

  if (error) {
    if (error.code === "42P01") {
      return { exists: false as const, rows: [] as GalleryAssetRow[] };
    }
    throw error;
  }

  return {
    exists: true as const,
    rows: (data ?? []) as GalleryAssetRow[],
  };
}

async function fetchLegacyGalleryRows(
  supabase: Awaited<ReturnType<typeof createAuthedClient>>,
  propertyId: number,
) {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("id, property_id, storage_path, image_url, sort_order, caption, created_at")
    .eq("property_id", propertyId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    if (error.code === "42P01") {
      return { exists: false as const, rows: [] as LegacyGalleryRow[] };
    }
    throw error;
  }

  return {
    exists: true as const,
    rows: (data ?? []) as LegacyGalleryRow[],
  };
}

async function listGalleryResponseRows(
  supabase: Awaited<ReturnType<typeof createAuthedClient>>,
  propertyId: number,
): Promise<GalleryResponseRow[]> {
  const [assets, legacy] = await Promise.all([
    fetchGalleryAssets(supabase, propertyId),
    fetchLegacyGalleryRows(supabase, propertyId),
  ]);

  if (assets.exists && assets.rows.length > 0) {
    return mapAssetRowsToResponse(assets.rows);
  }

  if (legacy.exists) {
    return legacy.rows.map((row) => ({
      id: row.id,
      property_id: row.property_id,
      storage_path: row.storage_path,
      image_url: row.image_url,
      sort_order: row.sort_order,
      caption: row.caption,
      created_at: row.created_at,
    }));
  }

  if (assets.exists) {
    return [];
  }

  return [];
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

    const images = await listGalleryResponseRows(supabase, propertyId);
    return NextResponse.json({ images });
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
    const captionRaw = formData.get("caption");
    const caption =
      typeof captionRaw === "string" ? captionRaw.trim() || null : null;
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

    const [assets, legacy] = await Promise.all([
      fetchGalleryAssets(supabase, propertyId),
      fetchLegacyGalleryRows(supabase, propertyId),
    ]);

    const existingRowsForLimit = assets.exists ? assets.rows : legacy.rows;
    const existingCount = existingRowsForLimit.length;

    if (existingCount + files.length > MAX_IMAGES) {
      return NextResponse.json(
        { error: `최대 ${MAX_IMAGES}장까지 업로드할 수 있습니다` },
        { status: 400 },
      );
    }

    const maxSortOrder = existingRowsForLimit.reduce(
      (max, row) => ((row.sort_order ?? 0) > max ? (row.sort_order ?? 0) : max),
      0,
    );

    const uploadedKeys: string[] = [];
    const legacyInsertRows: Array<{
      property_id: number;
      storage_path: string;
      image_url: string;
      sort_order: number;
      caption: string | null;
    }> = [];
    const assetRows: Array<{
      property_id: number;
      unit_type_id: null;
      kind: "gallery";
      image_url: string;
      storage_path: string;
      image_hash: string;
      caption: string | null;
      sort_order: number;
      is_active: boolean;
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
      const imageHash = createHash("sha256")
        .update(new Uint8Array(buffer))
        .digest("hex");

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
          { error: "이미지 업로드에 실패했습니다" },
          { status: 500 },
        );
      }

      uploadedKeys.push(storagePath);
      const imageUrl = buildR2PublicUrl(storagePath);
      const nextSortOrder = maxSortOrder + i + 1;

      legacyInsertRows.push({
        property_id: propertyId,
        storage_path: storagePath,
        image_url: imageUrl,
        sort_order: nextSortOrder,
        caption,
      });
      assetRows.push({
        property_id: propertyId,
        unit_type_id: null,
        kind: "gallery",
        image_url: imageUrl,
        storage_path: storagePath,
        image_hash: imageHash,
        caption,
        sort_order: nextSortOrder,
        is_active: true,
      });
    }

    if (assets.exists) {
      const { error: deactivateError } = await supabase
        .from(IMAGE_ASSET_TABLE)
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("property_id", propertyId)
        .eq("kind", "gallery")
        .in(
          "image_hash",
          assetRows.map((row) => row.image_hash),
        )
        .eq("is_active", true);
      if (deactivateError) {
        return NextResponse.json(
          { error: "이미지 자산 동기화(비활성화)에 실패했습니다" },
          { status: 500 },
        );
      }

      const { error: assetInsertError } = await supabase
        .from(IMAGE_ASSET_TABLE)
        .insert(assetRows);
      if (assetInsertError) {
        return NextResponse.json(
          { error: "이미지 자산 동기화(저장)에 실패했습니다" },
          { status: 500 },
        );
      }
    } else if (legacy.exists) {
      const { error: insertError } = await supabase.from(TABLE_NAME).insert(legacyInsertRows);
      if (insertError) {
        return NextResponse.json(
          { error: "추가 사진 저장에 실패했습니다" },
          { status: 500 },
        );
      }
    } else {
      return NextResponse.json(
        { error: "갤러리 저장 테이블을 찾을 수 없습니다" },
        { status: 500 },
      );
    }

    // 레거시 테이블이 살아있으면 dual-write를 유지하되, 실패해도 메인 저장 성공을 우선한다.
    if (legacy.exists && assets.exists) {
      const { error: legacyInsertError } = await supabase
        .from(TABLE_NAME)
        .insert(legacyInsertRows);
      if (legacyInsertError && legacyInsertError.code !== "42P01") {
        console.warn("legacy gallery sync failed:", legacyInsertError);
      }
    }

    const images = await listGalleryResponseRows(supabase, propertyId);
    return NextResponse.json({ images });
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
    const [assets, legacy] = await Promise.all([
      fetchGalleryAssets(supabase, propertyId),
      fetchLegacyGalleryRows(supabase, propertyId),
    ]);

    const assetById = new Map(assets.rows.map((row) => [row.id, row]));
    const legacyById = new Map(legacy.rows.map((row) => [row.id, row]));
    const isAssetMode = assets.exists && ids.every((id) => assetById.has(id));

    if (isAssetMode) {
      for (const update of updates) {
        const { error: assetUpdateError } = await supabase
          .from(IMAGE_ASSET_TABLE)
          .update({
            sort_order: update.sort_order,
            caption: update.caption ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", update.id)
          .eq("property_id", propertyId)
          .eq("kind", "gallery")
          .eq("is_active", true);

        if (assetUpdateError) {
          return NextResponse.json(
            { error: "이미지 자산 정렬 저장에 실패했습니다" },
            { status: 500 },
          );
        }
      }

      if (legacy.exists) {
        for (const update of updates) {
          const asset = assetById.get(update.id);
          if (!asset) continue;
          const { error: legacyUpdateError } = await supabase
            .from(TABLE_NAME)
            .update({
              sort_order: update.sort_order,
              caption: update.caption ?? null,
            })
            .eq("property_id", propertyId)
            .eq("image_url", asset.image_url);
          if (legacyUpdateError && legacyUpdateError.code !== "42P01") {
            console.warn("legacy gallery reorder sync failed:", legacyUpdateError);
          }
        }
      }
    } else {
      if (!legacy.exists) {
        return NextResponse.json(
          { error: "정렬 가능한 사진 목록이 유효하지 않습니다" },
          { status: 400 },
        );
      }
      if (!ids.every((id) => legacyById.has(id))) {
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

        if (assets.exists) {
          const legacyRow = legacyById.get(update.id);
          if (!legacyRow) continue;
          const { error: assetUpdateError } = await supabase
            .from(IMAGE_ASSET_TABLE)
            .update({
              sort_order: update.sort_order,
              caption: update.caption ?? null,
              updated_at: new Date().toISOString(),
            })
            .eq("property_id", propertyId)
            .eq("kind", "gallery")
            .eq("image_url", legacyRow.image_url)
            .eq("is_active", true);
          if (assetUpdateError) {
            return NextResponse.json(
              { error: "이미지 자산 정렬 저장에 실패했습니다" },
              { status: 500 },
            );
          }
        }
      }
    }

    const images = await listGalleryResponseRows(supabase, propertyId);
    return NextResponse.json({ images });
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

    const [assets, legacy] = await Promise.all([
      fetchGalleryAssets(supabase, propertyId),
      fetchLegacyGalleryRows(supabase, propertyId),
    ]);
    const assetTarget = assets.rows.find((row) => row.id === imageId) ?? null;
    const legacyTarget = legacy.rows.find((row) => row.id === imageId) ?? null;

    let targetImageUrl: string | null = null;
    let targetStoragePath: string | null = null;

    if (assetTarget) {
      const { error: assetDeactivateError } = await supabase
        .from(IMAGE_ASSET_TABLE)
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", imageId)
        .eq("property_id", propertyId)
        .eq("kind", "gallery")
        .eq("is_active", true);
      if (assetDeactivateError) {
        return NextResponse.json(
          { error: "이미지 자산 삭제 동기화에 실패했습니다" },
          { status: 500 },
        );
      }

      targetImageUrl = assetTarget.image_url;
      targetStoragePath = assetTarget.storage_path;

      if (legacy.exists) {
        const { error: legacyDeleteError } = await supabase
          .from(TABLE_NAME)
          .delete()
          .eq("property_id", propertyId)
          .eq("image_url", assetTarget.image_url);
        if (legacyDeleteError && legacyDeleteError.code !== "42P01") {
          console.warn("legacy gallery delete sync failed:", legacyDeleteError);
        }
      }
    } else if (legacyTarget) {
      const { error: deleteError } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq("id", imageId)
        .eq("property_id", propertyId);

      if (deleteError) {
        return NextResponse.json({ error: "사진 삭제에 실패했습니다" }, { status: 500 });
      }

      targetImageUrl = legacyTarget.image_url;
      targetStoragePath = legacyTarget.storage_path;

      if (assets.exists) {
        const { error: assetDeactivateError } = await supabase
          .from(IMAGE_ASSET_TABLE)
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("property_id", propertyId)
          .eq("kind", "gallery")
          .eq("image_url", legacyTarget.image_url)
          .eq("is_active", true);
        if (assetDeactivateError) {
          return NextResponse.json(
            { error: "이미지 자산 삭제 동기화에 실패했습니다" },
            { status: 500 },
          );
        }
      }
    } else {
      return NextResponse.json({ error: "사진을 찾을 수 없습니다" }, { status: 404 });
    }

    const key = resolveStorageKey(targetStoragePath, targetImageUrl);
    if (key) {
      try {
        await r2.send(
          new DeleteObjectsCommand({
            Bucket: R2_BUCKET_NAME,
            Delete: { Objects: [{ Key: key }] },
          }),
        );
      } catch (r2Error) {
        console.error("R2 파일 삭제 오류:", r2Error);
      }
    }

    const images = await listGalleryResponseRows(supabase, propertyId);
    return NextResponse.json({ images });
  } catch (error) {
    console.error("DELETE /api/property/gallery 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}
