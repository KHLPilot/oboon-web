// app/company/properties/[id]/units/useUnitTypes.ts

"use client";

import { useCallback, useEffect, useState } from "react";
import type { UnitDraft, UnitRow } from "@/features/company/domain/unit.types";
import {
  createUnitType,
  deleteUnitType,
  fetchUnitTypes,
  updateUnitType,
} from "@/features/company/services/unitTypes.service";

export function useUnitTypes(propertyId: number | null) {
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!propertyId) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const data = await fetchUnitTypes(propertyId);
      setUnits(data ?? []);
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? (e instanceof Error ? e.message : "알 수 없는 오류") : "평면 타입을 불러오지 못했어요.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

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
        const data = await createUnitType(propertyId, draft);
        setUnits((prev) => [...prev, data]);
        return { ok: true as const, data };
      } catch (e: unknown) {
        const msg = e instanceof Error ? (e instanceof Error ? e.message : "알 수 없는 오류") : "저장에 실패했어요.";
        setErrorMsg(msg);
        return { ok: false as const, error: msg };
      }
    },
    [propertyId],
  );

  const updateUnit = useCallback(
    async (id: number, draft: UnitDraft) => {
      setErrorMsg(null);
      try {
        const updated = await updateUnitType(id, draft);
        setUnits((prev) => prev.map((x) => (x.id === id ? updated : x)));
        return { ok: true as const, data: updated };
      } catch (e: unknown) {
        const msg = e instanceof Error ? (e instanceof Error ? e.message : "알 수 없는 오류") : "수정 저장에 실패했어요.";
        setErrorMsg(msg);
        return { ok: false as const, error: msg };
      }
    },
    [],
  );

  const deleteUnit = useCallback(
    async (id: number) => {
      setErrorMsg(null);
      try {
        await deleteUnitType(id);
        setUnits((prev) => prev.filter((x) => x.id !== id));
        return { ok: true as const };
      } catch (e: unknown) {
        const msg = e instanceof Error ? (e instanceof Error ? e.message : "알 수 없는 오류") : "삭제에 실패했어요.";
        setErrorMsg(msg);
        return { ok: false as const, error: msg };
      }
    },
    [],
  );

  return {
    units,
    loading,
    errorMsg,

    reload,
    createUnit,
    updateUnit,
    deleteUnit,

    clearError: () => setErrorMsg(null),
  };
}
