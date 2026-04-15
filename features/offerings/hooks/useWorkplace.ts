"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  WorkplaceChoice,
} from "@/lib/commute/workplaces";

export type WorkplaceState = WorkplaceChoice | null;

const STORAGE_KEY = "oboon_workplace";
const RECENT_STORAGE_KEY = "oboon_workplace_recent";
const MAX_RECENT_WORKPLACES = 5;

function readWorkplace(): WorkplaceState {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WorkplaceChoice;
  } catch {
    return null;
  }
}

function readRecentWorkplaces(): WorkplaceChoice[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(RECENT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WorkplaceChoice[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is WorkplaceChoice =>
        Boolean(item)
        && typeof item.code === "string"
        && typeof item.label === "string"
        && (item.type === "station" || item.type === "district" || item.type === "address"),
    );
  } catch {
    return [];
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

function writeRecentWorkplaces(workplaces: WorkplaceChoice[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(workplaces));
  } catch {
    // Ignore storage failures.
  }
}

function upsertRecentWorkplace(
  workplaces: WorkplaceChoice[],
  workplace: WorkplaceChoice,
) {
  const withoutCurrent = workplaces.filter((item) => item.code !== workplace.code);
  return [workplace, ...withoutCurrent].slice(0, MAX_RECENT_WORKPLACES);
}

export function useWorkplace() {
  const [workplace, setWorkplaceState] = useState<WorkplaceState>(null);
  const [recentWorkplaces, setRecentWorkplaces] = useState<WorkplaceChoice[]>([]);

  useEffect(() => {
    setWorkplaceState(readWorkplace());
    setRecentWorkplaces(readRecentWorkplaces());
  }, []);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY) {
        setWorkplaceState(readWorkplace());
      }
      if (event.key === RECENT_STORAGE_KEY) {
        setRecentWorkplaces(readRecentWorkplaces());
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const setWorkplace = useCallback((next: WorkplaceState) => {
    setWorkplaceState(next);
    writeWorkplace(next);

    if (!next) return;

    const nextRecent = upsertRecentWorkplace(
      readRecentWorkplaces(),
      next,
    );
    setRecentWorkplaces(nextRecent);
    writeRecentWorkplaces(nextRecent);
  }, []);

  const addRecentWorkplace = useCallback((next: WorkplaceChoice) => {
    const nextRecent = upsertRecentWorkplace(readRecentWorkplaces(), next);
    setRecentWorkplaces(nextRecent);
    writeRecentWorkplaces(nextRecent);
  }, []);

  return { workplace, setWorkplace, recentWorkplaces, addRecentWorkplace };
}
