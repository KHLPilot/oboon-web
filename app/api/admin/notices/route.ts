import { NextResponse } from "next/server";
import { adminSupabase, requireAdminRoute } from "@/lib/api/admin-route";
import { handleSupabaseError } from "@/lib/api/route-error";
import {
  adminNoticeCreateSchema,
  adminNoticeDeleteQuerySchema,
  adminNoticeUpdateSchema,
} from "../_schemas";

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

  const parsed = adminNoticeCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "필수 항목이 누락되었습니다." }, { status: 400 });
  }
  const body = parsed.data;

  const slug = await generateNextNumericSlug();

  const { data, error } = await adminSupabase
    .from("notices")
    .insert({
      slug,
      title: body.title,
      summary: body.summary,
      content: body.content,
      category: body.category,
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

  const parsed = adminNoticeUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "필수 항목이 누락되었습니다." }, { status: 400 });
  }
  const body = parsed.data;

  const { data, error } = await adminSupabase
    .from("notices")
    .update({
      title: body.title,
      summary: body.summary,
      content: body.content,
      category: body.category,
      is_pinned: body.isPinned === true,
      is_maintenance: body.isMaintenance === true,
      is_published: body.isPublished !== false,
      published_at: body.publishedAt ? toIsoOrNow(body.publishedAt) : null,
      updated_by: auth.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.id)
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
  const parsed = adminNoticeDeleteQuerySchema.safeParse({
    id: searchParams.get("id") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "공지 ID가 필요합니다." }, { status: 400 });
  }

  const { error } = await adminSupabase.from("notices").delete().eq("id", parsed.data.id);
  if (error) {
    return handleSupabaseError("admin/notices 삭제", error, {
      defaultMessage: "공지 삭제에 실패했습니다.",
    });
  }

  return NextResponse.json({ success: true });
}
