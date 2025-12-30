"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabaseClient";

/* --------------------------------------------------
   타입 (안정성을 위해 RelationRow를 유연하게 정의)
-------------------------------------------------- */
type RelationRow = { id: number } | { id: number }[] | null;

type PropertyRow = {
  id: number;
  name: string;
  property_locations?: RelationRow;
  property_facilities?: RelationRow;
  property_specs?: RelationRow;
  property_timeline?: RelationRow;
  property_unit_types?: RelationRow;
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
        ${completed
          ? "bg-green-100 text-green-800 dark:bg-green-500 dark:text-black"
          : "bg-red-100 text-red-800 dark:bg-red-500 dark:text-black"
        }
      `}
    >
      {label} · {completed ? "완료" : "미입력"}
    </span>
  );
}

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
        .select(`
          id,
          name,
          property_locations(id),
          property_facilities(id),
          property_specs!properties_id(id),
          property_timeline!properties_id(id),
          property_unit_types(id)
        `)
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
          /**
           * 데이터 존재 여부를 확인하는 가장 안전한 함수
           * 1. 배열인 경우: 길이가 0보다 커야 함
           * 2. 단일 객체인 경우: id 속성이 있어야 함
           */
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

          return (
            <div
              key={row.id}
              className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-black text-gray-900 dark:text-white space-y-3 hover:border-gray-400 dark:hover:border-gray-500 transition"
            >
              <div className="flex justify-between items-start">
                <h2 className="font-semibold text-lg">{row.name}</h2>
                <Link
                  href={`/company/properties/${row.id}`}
                  className={`px-3 py-1 rounded text-sm font-semibold
                    ${allCompleted ? "bg-green-600 text-black" : "bg-yellow-400 text-black"}
                  `}
                >
                  {allCompleted ? "상세 보기" : "추가 입력 필요"}
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