"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabaseClient";
import type { UnitDraft, UnitRow } from "./types";

const SELECT_COLUMNS = `
  id, created_at, properties_id,
  type_name, exclusive_area, supply_area, rooms, bathrooms,
  building_layout, orientation,
  price_min, price_max, unit_count,
  floor_plan_url, image_url
`;

export function useUnitTypes(propertyId: number | null) {
  const supabase = createSupabaseClient();

  const [units, setUnits] = useState<UnitRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!propertyId) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase
        .from("property_unit_types")
        .select(SELECT_COLUMNS)
        .eq("properties_id", propertyId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      setUnits((data ?? []) as UnitRow[]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "평면 타입을 불러오지 못했어요.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, [propertyId, supabase]);

  useEffect(() => {
    if (!propertyId) {
      setUnits([]);
      setLoading(false);
      setErrorMsg(null);
      return;
    }
    reload();
  }, [propertyId, reload]);

  const createUnit = useCallback(
    async (draft: UnitDraft) => {
      if (!propertyId) {
        setErrorMsg("properties_id가 올바르지 않아요.");
        return { ok: false as const, error: "invalid_property_id" };
      }

      setErrorMsg(null);
      try {
        const payload: UnitDraft = {
          ...draft,
          properties_id: propertyId,
          type_name: (draft.type_name ?? "").trim() || null,
          building_layout: (draft.building_layout ?? "").trim() || null,
          orientation: (draft.orientation ?? "").trim() || null,
          floor_plan_url: (draft.floor_plan_url ?? "").trim() || null,
          image_url: (draft.image_url ?? "").trim() || null,
        };

        const { data, error } = await supabase
          .from("property_unit_types")
          .insert(payload)
          .select(SELECT_COLUMNS)
          .single();

        if (error) throw error;

        setUnits((prev) => [...prev, data as UnitRow]);
        return { ok: true as const, data: data as UnitRow };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "저장에 실패했어요.";
        setErrorMsg(msg);
        return { ok: false as const, error: msg };
      }
    },
    [propertyId, supabase]
  );

  const updateUnit = useCallback(
    async (id: number, draft: UnitDraft) => {
      setErrorMsg(null);
      try {
        const payload: Partial<UnitRow> = {
          type_name: (draft.type_name ?? "").trim() || null,
          exclusive_area: draft.exclusive_area,
          supply_area: draft.supply_area,
          rooms: draft.rooms,
          bathrooms: draft.bathrooms,
          building_layout: (draft.building_layout ?? "").trim() || null,
          orientation: (draft.orientation ?? "").trim() || null,
          price_min: draft.price_min,
          price_max: draft.price_max,
          unit_count: draft.unit_count,
          floor_plan_url: (draft.floor_plan_url ?? "").trim() || null,
          image_url: (draft.image_url ?? "").trim() || null,
        };

        const { data, error } = await supabase
          .from("property_unit_types")
          .update(payload)
          .eq("id", id)
          .select(SELECT_COLUMNS)
          .single();

        if (error) throw error;

        const updated = data as UnitRow;
        setUnits((prev) => prev.map((x) => (x.id === id ? updated : x)));
        return { ok: true as const, data: updated };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "수정 저장에 실패했어요.";
        setErrorMsg(msg);
        return { ok: false as const, error: msg };
      }
    },
    [supabase]
  );

  const deleteUnit = useCallback(
    async (id: number) => {
      setErrorMsg(null);
      try {
        const { error } = await supabase
          .from("property_unit_types")
          .delete()
          .eq("id", id);
        if (error) throw error;

        setUnits((prev) => prev.filter((x) => x.id !== id));
        return { ok: true as const };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "삭제에 실패했어요.";
        setErrorMsg(msg);
        return { ok: false as const, error: msg };
      }
    },
    [supabase]
  );

  return {
    units,
    loading,
    errorMsg,

    reload,
    createUnit,
    updateUnit,
    deleteUnit,

    // 필요 시 페이지에서 에러를 초기화할 수 있게
    clearError: () => setErrorMsg(null),
  };
}
