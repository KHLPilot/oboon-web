import { NextResponse } from "next/server";
import { adminSupabase, requireAdminRoute } from "@/lib/api/admin-route";
import { handleSupabaseError } from "@/lib/api/route-error";

type NoticePayload = {
  id?: number;
  title?: string;
  summary?: string;
  content?: string;
  category?: "update" | "service" | "event" | "maintenance";
  isPinned?: boolean;
  isMaintenance?: boolean;
  isPublished?: boolean;
  publishedAt?: string;
};

async function generateNextNumericSlug() {
  const { data } = await adminSupabase
    .from("notices")
    .select("slug");

  let max = 0;
  for (const row of data ?? []) {
    const n = Number(row.slug);
    if (Number.isInteger(n) && n > max) {
      max = n;
    }
  }
  return String(max + 1);
}

function toIsoOrNow(value?: string) {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

export async function GET() {
  const auth = await requireAdminRoute();
  if (!auth.ok) {
    return auth.response;
  }

  const { data, error } = await adminSupabase
    .from("notices")
    .select(
      "id, slug, title, summary, content, category, is_pinned, is_maintenance, is_published, published_at, created_at, updated_at",
    )
    .order("is_pinned", { ascending: false })
    .order("published_at", { ascending: false });

  if (error) {
    return handleSupabaseError("admin/notices 목록 조회", error, {
      defaultMessage: "공지 목록 조회에 실패했습니다.",
    });
  }

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAdminRoute();
  if (!auth.ok) {
    return auth.response;
  }

  const body = (await request.json()) as NoticePayload;
  const title = String(body.title ?? "").trim();
  const content = String(body.content ?? "").trim();
  const category = body.category;

  if (!title || !content || !category) {
    return NextResponse.json({ error: "필수 항목이 누락되었습니다." }, { status: 400 });
  }

  const slug = await generateNextNumericSlug();

  const { data, error } = await adminSupabase
    .from("notices")
    .insert({
      slug,
      title,
      summary: String(body.summary ?? "").trim(),
      content,
      category,
      is_pinned: body.isPinned === true,
      is_maintenance: body.isMaintenance === true,
      is_published: body.isPublished !== false,
      published_at: toIsoOrNow(body.publishedAt),
      created_by: auth.user.id,
      updated_by: auth.user.id,
    })
    .select(
      "id, slug, title, summary, content, category, is_pinned, is_maintenance, is_published, published_at, created_at, updated_at",
    )
    .single();

  if (error) {
    return handleSupabaseError("admin/notices 등록", error, {
      defaultMessage: "공지 등록에 실패했습니다.",
    });
  }

  return NextResponse.json({ item: data });
}

export async function PUT(request: Request) {
  const auth = await requireAdminRoute();
  if (!auth.ok) {
    return auth.response;
  }

  const body = (await request.json()) as NoticePayload;
  const id = Number(body.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "공지 ID가 필요합니다." }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  const content = String(body.content ?? "").trim();
  const category = body.category;
  if (!title || !content || !category) {
    return NextResponse.json({ error: "필수 항목이 누락되었습니다." }, { status: 400 });
  }

  const { data, error } = await adminSupabase
    .from("notices")
    .update({
      title,
      summary: String(body.summary ?? "").trim(),
      content,
      category,
      is_pinned: body.isPinned === true,
      is_maintenance: body.isMaintenance === true,
      is_published: body.isPublished !== false,
      published_at: body.publishedAt ? toIsoOrNow(body.publishedAt) : null,
      updated_by: auth.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(
      "id, slug, title, summary, content, category, is_pinned, is_maintenance, is_published, published_at, created_at, updated_at",
    )
    .single();

  if (error) {
    return handleSupabaseError("admin/notices 수정", error, {
      defaultMessage: "공지 수정에 실패했습니다.",
    });
  }

  return NextResponse.json({ item: data });
}

export async function DELETE(request: Request) {
  const auth = await requireAdminRoute();
  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "공지 ID가 필요합니다." }, { status: 400 });
  }

  const { error } = await adminSupabase.from("notices").delete().eq("id", id);
  if (error) {
    return handleSupabaseError("admin/notices 삭제", error, {
      defaultMessage: "공지 삭제에 실패했습니다.",
    });
  }

  return NextResponse.json({ success: true });
}
