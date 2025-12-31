"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

const ALLOWED_ROLES = ["builder", "developer", "admin"];

/* --------------------------------------------------
   타입
-------------------------------------------------- */
type RelationRow = { id: number } | { id: number }[] | null;

type ProfileRow = {
  id: string;
  name: string;
  role: string;
};

type PropertyRow = {
  id: number;
  name: string;
  created_by: string;
  profiles?: ProfileRow | ProfileRow[] | null;
  property_locations?: RelationRow;
  property_facilities?: RelationRow;
  property_specs?: RelationRow;
  property_timeline?: RelationRow;
  property_unit_types?: RelationRow;
};

/* --------------------------------------------------
   Role 한글 변환
-------------------------------------------------- */
function getRoleLabel(role: string): string {
  const roleMap: Record<string, string> = {
    admin: "오분",
    developer: "시행사",
    builder: "시공사",
  };
  return roleMap[role] || role;
}

/* --------------------------------------------------
   상태 뱃지
-------------------------------------------------- */
function StatusBadge({
  label,
  completed,
}: {
  label: string;
  completed: boolean;
}) {
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-semibold ${completed
          ? "bg-green-100 text-green-800 dark:bg-green-500 dark:text-black"
          : "bg-red-100 text-red-800 dark:bg-red-500 dark:text-black"
        }`}
    >
      {label} · {completed ? "완료" : "미입력"}
    </span>
  );
}

export default function PropertyListPage() {
  const router = useRouter();
  const [rows, setRows] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseClient();

    async function load() {
      // 1️⃣ 로그인 체크
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/");
        return;
      }

      setCurrentUserId(user.id);

      // 2️⃣ 권한 체크
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
        router.replace("/");
        return;
      }

      setCurrentUserRole(profile.role);

      // 3️⃣ 데이터 로드
      const { data, error } = await supabase
        .from("properties")
        .select(
          `
          id,
          name,
          created_by,
          profiles (id, name, role),
          property_locations(id),
          property_facilities(id),
          property_specs!properties_id(id),
          property_timeline!properties_id(id),
          property_unit_types(id)
        `
        )
        .order("id", { ascending: false });

      if (error) {
        console.error("현장 목록 로드 실패:", error);
        setRows([]);
      } else {
        setRows((data ?? []) as PropertyRow[]);
      }
      setLoading(false);
    }

    load();
  }, [router]);

  if (loading) {
    return <div className="p-6 text-gray-400">불러오는 중...</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-gray-400 hover:text-white">
            ← 홈으로
          </Link>
          <h1 className="text-xl font-bold">현장 목록</h1>
        </div>
        <Link href="/company/properties/new" className="btn-primary">
          + 새 현장 등록
        </Link>
      </div>

      {rows.length === 0 && (
        <div className="text-gray-400">등록된 현장이 없습니다.</div>
      )}

      <div className="space-y-4">
        {rows.map((row) => {
          const hasData = (v: any) => {
            if (!v) return false;
            if (Array.isArray(v)) return v.length > 0;
            if (typeof v === "object") return v.id !== undefined;
            return false;
          };

          const siteLocationDone = hasData(row.property_locations);
          const facilityDone = hasData(row.property_facilities);
          const specsDone = hasData(row.property_specs);
          const timelineDone = hasData(row.property_timeline);
          const unitDone = hasData(row.property_unit_types);

          const allCompleted =
            siteLocationDone &&
            facilityDone &&
            specsDone &&
            timelineDone &&
            unitDone;

          // profiles가 배열일 수도 있으니 처리
          const profile = row.profiles
            ? Array.isArray(row.profiles)
              ? row.profiles[0]
              : row.profiles
            : null;

          // 권한 체크: admin은 모든 현장 수정 가능, 나머지는 본인 것만
          const canEdit =
            currentUserRole === "admin" || row.created_by === currentUserId;

          return (
            <div
              key={row.id}
              className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-black text-gray-900 dark:text-white space-y-3 hover:border-gray-400 dark:hover:border-gray-500 transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="font-semibold text-lg">{row.name}</h2>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    작성자:{" "}
                    <span className="font-medium">
                      {profile?.name ?? "알 수 없음"}
                    </span>
                    {profile?.role && ` · ${getRoleLabel(profile.role)}`}
                  </div>
                </div>
                <Link
                  href={canEdit ? `/company/properties/${row.id}` : "#"}
                  className={`px-3 py-1 rounded text-sm font-semibold ${canEdit
                      ? allCompleted
                        ? "bg-green-600 text-black"
                        : "bg-yellow-400 text-black"
                      : "bg-gray-400 text-white cursor-not-allowed"
                    }`}
                  onClick={(e) => {
                    if (!canEdit) {
                      e.preventDefault();
                      alert("본인이 작성한 현장만 조회 및 수정할 수 있습니다.");
                    }
                  }}
                >
                  {canEdit
                    ? allCompleted
                      ? "상세 보기"
                      : "추가 입력 필요"
                    : "수정 불가"}
                </Link>
              </div>

              <div className="flex gap-2 flex-wrap">
                <StatusBadge label="현장 위치" completed={siteLocationDone} />
                <StatusBadge label="홍보시설" completed={facilityDone} />
                <StatusBadge label="건물 스펙" completed={specsDone} />
                <StatusBadge label="일정" completed={timelineDone} />
                <StatusBadge label="평면 타입" completed={unitDone} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}