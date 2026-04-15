"use client";

import { useCallback, useEffect, useState } from "react";

import type { WorkplacePreset } from "@/lib/commute/workplaces";

export type WorkplaceState = WorkplacePreset | null;

const STORAGE_KEY = "oboon_workplace";

function readWorkplace(): WorkplaceState {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WorkplacePreset;
  } catch {
    return null;
  }
}

function writeWorkplace(workplace: WorkplaceState) {
  if (typeof window === "undefined") return;

  try {
    if (!workplace) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workplace));
  } catch {
    // Ignore storage failures.
  }
}

export function useWorkplace() {
  const [workplace, setWorkplaceState] = useState<WorkplaceState>(null);

  useEffect(() => {
    setWorkplaceState(readWorkplace());
  }, []);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return;
      setWorkplaceState(readWorkplace());
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const setWorkplace = useCallback((next: WorkplaceState) => {
    setWorkplaceState(next);
    writeWorkplace(next);
  }, []);

  return { workplace, setWorkplace };
}
