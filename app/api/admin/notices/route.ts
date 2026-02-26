import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

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

async function ensureAdmin() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
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
            // ignore
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, status: 401, error: "로그인이 필요합니다." };
  }

  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    return { ok: false as const, status: 403, error: "관리자 권한이 필요합니다." };
  }

  return { ok: true as const, userId: user.id };
}

function toIsoOrNow(value?: string) {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

export async function GET() {
  const auth = await ensureAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await adminSupabase
    .from("notices")
    .select(
      "id, slug, title, summary, content, category, is_pinned, is_maintenance, is_published, published_at, created_at, updated_at",
    )
    .order("is_pinned", { ascending: false })
    .order("published_at", { ascending: false });

  if (error) {
    console.error("GET /api/admin/notices DB 오류:", error);
    return NextResponse.json(
      { error: `공지 목록 조회에 실패했습니다. (${error.message})` },
      { status: 500 },
    );
  }

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await ensureAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
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
      created_by: auth.userId,
      updated_by: auth.userId,
    })
    .select(
      "id, slug, title, summary, content, category, is_pinned, is_maintenance, is_published, published_at, created_at, updated_at",
    )
    .single();

  if (error) {
    console.error("POST /api/admin/notices DB 오류:", error);
    return NextResponse.json(
      { error: `공지 등록에 실패했습니다. (${error.message})` },
      { status: 500 },
    );
  }

  return NextResponse.json({ item: data });
}

export async function PUT(request: Request) {
  const auth = await ensureAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
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
      updated_by: auth.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(
      "id, slug, title, summary, content, category, is_pinned, is_maintenance, is_published, published_at, created_at, updated_at",
    )
    .single();

  if (error) {
    console.error("PUT /api/admin/notices DB 오류:", error);
    return NextResponse.json(
      { error: `공지 수정에 실패했습니다. (${error.message})` },
      { status: 500 },
    );
  }

  return NextResponse.json({ item: data });
}

export async function DELETE(request: Request) {
  const auth = await ensureAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "공지 ID가 필요합니다." }, { status: 400 });
  }

  const { error } = await adminSupabase.from("notices").delete().eq("id", id);
  if (error) {
    console.error("DELETE /api/admin/notices DB 오류:", error);
    return NextResponse.json(
      { error: `공지 삭제에 실패했습니다. (${error.message})` },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
