"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabaseClient";

/* --------------------------------------------------
   타입 (관계 테이블 nullable까지 고려)
-------------------------------------------------- */
type RelationRow = { id: number };

type PropertyRow = {
  id: number;
  name: string;

  property_locations?: RelationRow[] | null;
  property_facilities?: RelationRow[] | null;
  property_specs?: RelationRow[] | null;
  property_timeline?: RelationRow[] | null;
  property_unit_types?: RelationRow[] | null;
};

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
      className={`
    px-2 py-0.5 rounded text-xs font-semibold
    ${
      completed
        ? "bg-green-100 text-green-800 dark:bg-green-500 dark:text-black"
        : "bg-red-100 text-red-800 dark:bg-red-500 dark:text-black"
    }
  `}
    >
      {label} · {completed ? "완료" : "미입력"}
    </span>
  );
}

/* --------------------------------------------------
   페이지
-------------------------------------------------- */
export default function PropertyListPage() {
  const supabase = createSupabaseClient();

  const [rows, setRows] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(true);

  /* ---------- 데이터 로드 ---------- */
  useEffect(() => {
    async function load() {
      setLoading(true);

      const { data, error } = await supabase
        .from("properties")
        .select(
          `
          id,
          name,
          property_locations(id),
          property_facilities(id),
          property_specs(id),
          property_timeline(id),
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
  }, [supabase]);

  /* ---------- 렌더 ---------- */
  if (loading) {
    return <div className="p-6 text-gray-400">불러오는 중...</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-6">
        {/* 왼쪽: 홈 + 제목 */}
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-gray-400 hover:text-white">
            ← 홈으로
          </Link>

          <h1 className="text-xl font-bold">현장 목록</h1>
        </div>

        {/* 오른쪽: 새 현장 */}
        <Link href="/company/properties/new" className="btn-primary">
          + 새 현장 등록
        </Link>
      </div>

      {/* 목록 없음 */}
      {rows.length === 0 && (
        <div className="text-gray-400">등록된 현장이 없습니다.</div>
      )}

      {/* 목록 */}
      <div className="space-y-4">
        {rows.map((row) => {
          const siteLocationDone =
            Array.isArray(row.property_locations) &&
            row.property_locations.length > 0;

          const facilityDone =
            Array.isArray(row.property_facilities) &&
            row.property_facilities.length > 0;

          const specsDone = !!row.property_specs;

          const timelineDone =
            Array.isArray(row.property_timeline) &&
            row.property_timeline.length > 0;

          const unitDone =
            Array.isArray(row.property_unit_types) &&
            row.property_unit_types.length > 0;

          const allCompleted =
            siteLocationDone &&
            facilityDone &&
            specsDone &&
            timelineDone &&
            unitDone;

          return (
            <div
              key={row.id}
              className="
    border border-gray-200 dark:border-gray-700
    rounded p-4
    bg-white dark:bg-black
    text-gray-900 dark:text-white
    space-y-3
    hover:border-gray-400 dark:hover:border-gray-500
    transition
  "
            >
              {/* 상단 */}
              <div className="flex justify-between items-start">
                <h2 className="font-semibold text-lg">{row.name}</h2>

                <Link
                  href={`/company/properties/${row.id}`}
                  className={`px-3 py-1 rounded text-sm font-semibold
                    ${
                      allCompleted
                        ? "bg-green-600 text-black"
                        : "bg-yellow-400 text-black"
                    }
                  `}
                >
                  {allCompleted ? "상세 보기" : "추가 입력 필요"}
                </Link>
              </div>

              {/* 상태 뱃지 */}
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
