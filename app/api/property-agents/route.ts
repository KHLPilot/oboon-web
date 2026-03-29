import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { handleServiceError } from "@/lib/api/route-error";
import {
  fetchExistingPropertyAgent,
  fetchPropertyAgentProfileRole,
  fetchPropertyAgentProperty,
  fetchPropertyAgentsList,
  fetchPropertyMainAssets,
  insertApprovedPropertyAgentMembership,
  reactivatePropertyAgentMembership,
} from "@/features/agent/services/agent.propertyAgents";

function normalizeUrl(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

// POST - 상담사가 현장 소속 신청
export async function POST(request: NextRequest) {
  try {
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
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    // 현재 사용자 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 }
      );
    }

    // 사용자 프로필 조회
    const { data: profile, error: profileError } =
      await fetchPropertyAgentProfileRole(user.id);

    if (profileError) {
      return handleServiceError(profileError, "프로필을 찾을 수 없습니다");
    }

    if (!profile) {
      return NextResponse.json(
        { error: "프로필을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // agent 권한 확인
    if (profile.role !== "agent") {
      return NextResponse.json(
        { error: "상담사만 현장 소속을 신청할 수 있습니다" },
        { status: 403 }
      );
    }

    // 요청 본문 파싱
    const body = await request.json();
    const { property_id } = body;

    if (!property_id) {
      return NextResponse.json(
        { error: "현장 ID가 필요합니다" },
        { status: 400 }
      );
    }

    // 현장 존재 여부 확인
    const { data: property, error: propertyError } =
      await fetchPropertyAgentProperty(property_id);

    if (propertyError) {
      return handleServiceError(propertyError, "현장을 찾을 수 없습니다");
    }

    if (!property) {
      return NextResponse.json(
        { error: "현장을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 이미 신청/소속했는지 확인
    const { data: existing, error: existingError } =
      await fetchExistingPropertyAgent(property_id, user.id);

    if (existingError) {
      return handleServiceError(existingError, "신청 확인 중 오류가 발생했습니다");
    }

    if (existing?.status === "approved") {
      return NextResponse.json(
        { error: "이미 해당 현장에 소속되어 있습니다" },
        { status: 409 }
      );
    }

    const nowIso = new Date().toISOString();
    let propertyAgent: unknown = null;
    let saveError: unknown = null;

    if (existing && existing.status !== "approved") {
      // withdrawn/rejected/pending 기존 행을 재활성화해 중복 키를 피함
      const { data: updatedRow, error: updateError } =
        await reactivatePropertyAgentMembership(existing.id, user.id, nowIso);

      propertyAgent = updatedRow;
      saveError = updateError;
    } else {
      // 신규 소속 즉시 승인 생성
      const { data: insertedRow, error: insertError } =
        await insertApprovedPropertyAgentMembership(property_id, user.id, nowIso);

      propertyAgent = insertedRow;
      saveError = insertError;
    }

    if (saveError || !propertyAgent) {
      if (saveError) {
        return handleServiceError(saveError, "소속 신청에 실패했습니다");
      }
      return NextResponse.json(
        { error: "소속 신청에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      propertyAgent,
      message: "현장 소속이 등록되었습니다.",
    });
  } catch (error) {
    console.error("POST /api/property-agents 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// GET - 소속 신청 목록 조회
export async function GET(request: NextRequest) {
  try {
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
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    // 현재 사용자 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 }
      );
    }

    // 사용자 프로필 조회
    const { data: profile, error: profileError } =
      await fetchPropertyAgentProfileRole(user.id);

    if (profileError) {
      return handleServiceError(profileError, "프로필을 찾을 수 없습니다");
    }

    if (!profile) {
      return NextResponse.json(
        { error: "프로필을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role") || profile.role || "";
    const status = searchParams.get("status");

    const { data: propertyAgents, error: fetchError } =
      await fetchPropertyAgentsList({
        userId: user.id,
        role,
        status,
      });

    if (fetchError) {
      return handleServiceError(fetchError, "소속 신청 조회에 실패했습니다");
    }
    const rows = (propertyAgents ?? []) as Array<{
      properties?: { id?: number } | null;
      [key: string]: unknown;
    }>;
    const propertyIds = Array.from(
      new Set(
        rows
          .map((row) => row.properties?.id)
          .filter((id): id is number => typeof id === "number")
      )
    );
    const { data: propertyMainAssets, error: propertyMainAssetsError } =
      await fetchPropertyMainAssets(propertyIds);

    if (propertyMainAssetsError) {
      return handleServiceError(
        propertyMainAssetsError,
        "대표 이미지 조회에 실패했습니다",
      );
    }
    const propertyMainImageMap = new Map<number, string>();
    for (const row of propertyMainAssets ?? []) {
      const url = normalizeUrl(row.image_url);
      if (!url) continue;
      if (!propertyMainImageMap.has(row.property_id)) {
        propertyMainImageMap.set(row.property_id, url);
      }
    }
    const enrichedRows = rows.map((row) => {
      const propertyId = row.properties?.id;
      if (typeof propertyId !== "number") return row;
      return {
        ...row,
        properties: {
          ...row.properties,
          image_url: propertyMainImageMap.get(propertyId) ?? null,
        },
      };
    });

    return NextResponse.json({ propertyAgents: enrichedRows });
  } catch (error) {
    console.error("GET /api/property-agents 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
