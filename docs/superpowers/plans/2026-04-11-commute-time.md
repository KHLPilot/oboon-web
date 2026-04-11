# 출퇴근 시간 기능 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 현장 비교 교통·입지 탭에서 CBD 거리를 제거하고, 사용자가 근무지(역/구)를 선택하면 직선거리 기반 출퇴근 시간 추정치를 즉시 보여주고, 클릭 시 Naver Directions API로 실제 시간을 조회하는 기능을 추가한다.

**Architecture:** 직선거리 추정은 클라이언트에서 Haversine 공식으로 즉시 계산하고, 실제 경로는 `/api/commute-time` 서버 API(Naver Directions 5)를 on-demand로 호출한다. 근무지는 localStorage(비로그인) + profiles 테이블(로그인)에 저장하며, `useWorkplace` hook이 상태를 통합 관리한다.

**Tech Stack:** Next.js App Router, TypeScript, Supabase, Naver Cloud Platform Directions 5 API, Haversine 공식

---

## 파일 맵

| 작업 | 경로 | 내용 |
|------|------|------|
| 신규 | `supabase/migrations/106_profiles_add_workplace.sql` | profiles에 workplace 컬럼 추가 |
| 수정 | `features/offerings/domain/offering.types.ts` | distanceToCbd 제거, commuteEstimate 추가 |
| 신규 | `lib/commute/workplaces.ts` | 주요 업무지구/역 좌표 데이터 |
| 신규 | `lib/commute/haversine.ts` | Haversine 거리 계산 + 출퇴근 시간 추정 |
| 신규 | `app/api/commute-time/route.ts` | Naver Directions 서버 API + 인메모리 캐시 |
| 수정 | `features/offerings/services/offering.compare.ts` | distanceToCbd → commuteEstimate |
| 신규 | `features/offerings/hooks/useWorkplace.ts` | 근무지 상태 관리 (localStorage + 프로필) |
| 신규 | `features/offerings/components/detail/WorkplaceSelector.client.tsx` | 근무지 선택 UI |
| 수정 | `features/offerings/components/detail/OfferingInlineCompare.client.tsx` | 교통·입지 탭 UI 교체 |
| 수정 | `.env.example` | Naver Directions API 키 항목 추가 |

---

## Task 1: DB 마이그레이션 — profiles에 workplace 컬럼 추가

**Files:**
- Create: `supabase/migrations/106_profiles_add_workplace.sql`

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
-- supabase/migrations/106_profiles_add_workplace.sql
alter table public.profiles
  add column if not exists workplace_type  text check (workplace_type in ('station', 'district')),
  add column if not exists workplace_code  text,
  add column if not exists workplace_label text,
  add column if not exists workplace_lat   double precision,
  add column if not exists workplace_lng   double precision;
```

- [ ] **Step 2: 테스트 DB에 마이그레이션 적용**

```bash
npx supabase db push --db-url "$SUPABASE_TEST_URL"
```

Expected: `Applied 1 migration` 출력

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/106_profiles_add_workplace.sql
git commit -m "feat: add workplace columns to profiles"
```

---

## Task 2: 타입 변경 — OfferingCompareItem

**Files:**
- Modify: `features/offerings/domain/offering.types.ts:64-66`

- [ ] **Step 1: distanceToCbd 제거, commuteEstimate 추가**

`features/offerings/domain/offering.types.ts`의 `OfferingCompareItem` 인터페이스에서:

```typescript
// 제거
distanceToCbd: string;

// 추가 (nearestStation 아래에)
commuteEstimate: { transitMin: number; carMin: number } | null;
```

변경 후 전체 인터페이스:

```typescript
export interface OfferingCompareItem {
  id: string;
  name: string;
  location: string;
  imageUrl: string | null;
  priceRange: string;
  pricePerPyeong: string;
  totalUnits: number;
  unitTypes: string;
  floors: string;
  parking: string;
  status: "OPEN" | "READY" | "CLOSED";
  announcementDate: string | null;
  applicationStart: string | null;
  applicationEnd: string | null;
  winnerAnnounce: string | null;
  contractStart: string | null;
  contractEnd: string | null;
  moveInDate: string | null;
  moveInText: string | null;
  nearestStation: string;
  commuteEstimate: { transitMin: number; carMin: number } | null;
  schoolGrade: "우수" | "보통" | "미흡";
  conditionResult: FinalGrade5 | null;
  conditionCategories: OfferingCompareConditionCategories | null;
}
```

- [ ] **Step 2: 타입 체크 (에러 위치 파악용)**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck 2>&1 | head -40
```

Expected: `distanceToCbd`를 참조하는 파일들에서 에러 — Task 5, 9에서 수정 예정

- [ ] **Step 3: Commit**

```bash
git add features/offerings/domain/offering.types.ts
git commit -m "feat: replace distanceToCbd with commuteEstimate in OfferingCompareItem"
```

---

## Task 3: 업무지구 데이터 + Haversine 유틸

**Files:**
- Create: `lib/commute/workplaces.ts`
- Create: `lib/commute/haversine.ts`

- [ ] **Step 1: 주요 업무지구/역 데이터 파일 작성**

```typescript
// lib/commute/workplaces.ts

export type WorkplacePreset = {
  code: string;           // 고유 식별자 (검색/저장 키)
  label: string;          // 표시 이름
  type: "station" | "district";
  lat: number;
  lng: number;
};

export const WORKPLACE_PRESETS: WorkplacePreset[] = [
  // 주요 업무지구 (구 단위)
  { code: "gangnam-gu",   label: "강남구",   type: "district", lat: 37.5172, lng: 127.0473 },
  { code: "yeouido",      label: "여의도",   type: "district", lat: 37.5219, lng: 126.9245 },
  { code: "gwanghwamun", label: "광화문",   type: "district", lat: 37.5744, lng: 126.9764 },
  { code: "pangyo",       label: "판교",     type: "district", lat: 37.3946, lng: 127.1112 },
  { code: "euljiro",      label: "을지로",   type: "district", lat: 37.5664, lng: 126.9997 },
  { code: "jamsil",       label: "잠실",     type: "district", lat: 37.5133, lng: 127.1006 },
  { code: "mapo",         label: "마포",     type: "district", lat: 37.5567, lng: 126.9012 },
  { code: "seocho",       label: "서초",     type: "district", lat: 37.4836, lng: 127.0327 },
  // 주요 역
  { code: "station-gangnam",    label: "강남역",    type: "station", lat: 37.4979, lng: 127.0276 },
  { code: "station-gto",        label: "고속터미널역", type: "station", lat: 37.5047, lng: 127.0047 },
  { code: "station-jamsil",     label: "잠실역",    type: "station", lat: 37.5133, lng: 127.1000 },
  { code: "station-hongik",     label: "홍대입구역", type: "station", lat: 37.5574, lng: 126.9247 },
  { code: "station-yeouido",    label: "여의도역",  type: "station", lat: 37.5217, lng: 126.9243 },
  { code: "station-sindorim",   label: "신도림역",  type: "station", lat: 37.5088, lng: 126.8913 },
  { code: "station-pangyo",     label: "판교역",    type: "station", lat: 37.3950, lng: 127.1111 },
  { code: "station-suseo",      label: "수서역",    type: "station", lat: 37.4877, lng: 127.1014 },
  { code: "station-samsung",    label: "삼성역",    type: "station", lat: 37.5088, lng: 127.0630 },
  { code: "station-gwanghwamun",label: "광화문역",  type: "station", lat: 37.5715, lng: 126.9768 },
];
```

- [ ] **Step 2: Haversine 거리 계산 + 출퇴근 추정 함수 작성**

```typescript
// lib/commute/haversine.ts

const EARTH_RADIUS_KM = 6371;

/** 두 좌표 사이의 직선 거리 (km) */
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.asin(Math.sqrt(a));
}

/**
 * 직선거리 기반 출퇴근 시간 추정 (분)
 * 서울 평균 속도 기준:
 *   - 대중교통: 24km/h (0.4km/min)
 *   - 자가용: 36km/h (0.6km/min)
 */
export function estimateCommuteMin(
  fromLat: number, fromLng: number,
  toLat: number, toLng: number,
): { transitMin: number; carMin: number } {
  const km = haversineKm(fromLat, fromLng, toLat, toLng);
  return {
    transitMin: Math.round(km / 0.4),
    carMin: Math.round(km / 0.6),
  };
}
```

- [ ] **Step 3: 타입 체크**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck 2>&1 | grep "lib/commute"
```

Expected: 에러 없음

- [ ] **Step 4: Commit**

```bash
git add lib/commute/workplaces.ts lib/commute/haversine.ts
git commit -m "feat: add workplace presets and haversine commute estimator"
```

---

## Task 4: 서버 API — /api/commute-time

**Files:**
- Create: `app/api/commute-time/route.ts`
- Modify: `.env.example`

Naver Directions 5 API: `https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving` (자가용), `https://naveropenapi.apigw.ntruss.com/map-direction/v1/transit` (대중교통)  
헤더: `X-NCP-APIGW-API-KEY-ID`, `X-NCP-APIGW-API-KEY`

- [ ] **Step 1: .env.example에 Naver Directions 키 항목 추가**

```env
# 기존 # External APIs 섹션 아래에 추가
NAVER_DIRECTIONS_API_KEY_ID=
NAVER_DIRECTIONS_API_KEY=
```

- [ ] **Step 2: 서버 API 라우트 작성**

```typescript
// app/api/commute-time/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/api/route-security";
import { checkRateLimit, createRateLimiter } from "@/lib/rateLimit";

const querySchema = z.object({
  propertyId: z.string().min(1).max(20),
  workplaceLat: z.coerce.number().min(33).max(40),
  workplaceLng: z.coerce.number().min(124).max(132),
  workplaceCode: z.string().min(1).max(60),
});

// 인메모리 캐시: `propertyId:workplaceCode` → { transit, car, cachedAt }
type CacheEntry = { transit: number; car: number; cachedAt: number };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function getCached(key: string): CacheEntry | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry;
}

async function fetchNaverDirections(
  fromLat: number, fromLng: number,
  toLat: number, toLng: number,
  mode: "driving" | "transit",
): Promise<number | null> {
  const keyId = process.env.NAVER_DIRECTIONS_API_KEY_ID;
  const key = process.env.NAVER_DIRECTIONS_API_KEY;
  if (!keyId || !key) return null;

  const base = mode === "driving"
    ? "https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving"
    : "https://naveropenapi.apigw.ntruss.com/map-direction/v1/transit";

  const url = `${base}?start=${fromLng},${fromLat}&goal=${toLng},${toLat}`;

  const res = await fetch(url, {
    headers: {
      "X-NCP-APIGW-API-KEY-ID": keyId,
      "X-NCP-APIGW-API-KEY": key,
    },
  });

  if (!res.ok) return null;

  const json = await res.json() as {
    route?: { traoptimal?: { summary?: { duration?: number } }[] };
    metaData?: { plan?: { itineraries?: { totalTime?: number }[] } };
  };

  if (mode === "driving") {
    const durationMs = json.route?.traoptimal?.[0]?.summary?.duration;
    return durationMs != null ? Math.round(durationMs / 60000) : null;
  } else {
    const durationSec = json.metaData?.plan?.itineraries?.[0]?.totalTime;
    return durationSec != null ? Math.round(durationSec / 60) : null;
  }
}

const commuteLimiter = createRateLimiter({ requests: 20, windowSeconds: 60 });

export async function GET(req: NextRequest) {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth.response;

  const rateLimitResponse = await checkRateLimit(commuteLimiter, auth.user.id, {
    windowMs: 60 * 1000,
    message: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
  });
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({
    propertyId: searchParams.get("propertyId"),
    workplaceLat: searchParams.get("workplaceLat"),
    workplaceLng: searchParams.get("workplaceLng"),
    workplaceCode: searchParams.get("workplaceCode"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { propertyId, workplaceLat, workplaceLng, workplaceCode } = parsed.data;
  const cacheKey = `${propertyId}:${workplaceCode}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json({ transit: cached.transit, car: cached.car, unit: "분" });
  }

  // 현장 좌표 조회
  const { createSupabaseServer } = await import("@/lib/supabaseServer");
  const supabase = await createSupabaseServer();
  const { data: snap } = await supabase
    .from("property_public_snapshots")
    .select("snapshot")
    .eq("property_id", Number(propertyId))
    .maybeSingle();

  if (!snap?.snapshot) {
    return NextResponse.json({ error: "현장 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  const snapshot = snap.snapshot as { property_locations?: { lat?: number; lng?: number }[] | { lat?: number; lng?: number } | null };
  const locArr = Array.isArray(snapshot.property_locations)
    ? snapshot.property_locations
    : snapshot.property_locations ? [snapshot.property_locations] : [];
  const loc = locArr[0];

  if (!loc?.lat || !loc?.lng) {
    return NextResponse.json({ error: "현장 좌표가 없습니다." }, { status: 404 });
  }

  const [transitResult, carResult] = await Promise.allSettled([
    fetchNaverDirections(loc.lat, loc.lng, workplaceLat, workplaceLng, "transit"),
    fetchNaverDirections(loc.lat, loc.lng, workplaceLat, workplaceLng, "driving"),
  ]);

  const transit = transitResult.status === "fulfilled" ? transitResult.value : null;
  const car = carResult.status === "fulfilled" ? carResult.value : null;

  if (transit === null && car === null) {
    return NextResponse.json({ error: "경로를 계산할 수 없습니다." }, { status: 502 });
  }

  const entry: CacheEntry = {
    transit: transit ?? 0,
    car: car ?? 0,
    cachedAt: Date.now(),
  };
  if (cache.size > 500) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(cacheKey, entry);

  return NextResponse.json({ transit: entry.transit, car: entry.car, unit: "분" });
}
```

**주의:** `createRateLimiter`가 `lib/rateLimit.ts`에 이미 export되어 있는지 확인 필요. 없으면 아래 step에서 추가.

- [ ] **Step 3: rateLimit.ts에 createRateLimiter export 확인/추가**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" grep -n "createRateLimiter\|geoAddressLimiter" lib/rateLimit.ts
```

`geoAddressLimiter` 같은 패턴으로 limiter가 파일 안에서 생성되어 있다면, `commute-time` 라우트의 import를 동일한 방식으로 조정한다. 예를 들어 `lib/rateLimit.ts`에 이미 정의된 limiter 생성 함수가 없다면, 다음과 같이 API 파일 안에서 직접 limiter를 생성한다:

```typescript
// lib/rateLimit.ts의 패턴을 따라, app/api/commute-time/route.ts 상단에서
// 직접 Ratelimit 인스턴스를 생성 (geoAddressLimiter와 동일한 방식)
```

`geoAddressLimiter`가 어떻게 생성되어 있는지 확인 후, 동일한 패턴으로 `commuteLimiter`를 구성한다.

- [ ] **Step 4: 타입 체크**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck 2>&1 | grep "commute-time"
```

Expected: 에러 없음

- [ ] **Step 5: Commit**

```bash
git add app/api/commute-time/route.ts .env.example
git commit -m "feat: add /api/commute-time server route with Naver Directions + cache"
```

---

## Task 5: offering.compare.ts 수정 — distanceToCbd → commuteEstimate

**Files:**
- Modify: `features/offerings/services/offering.compare.ts:261-270` (distanceToCbd 계산 제거, commuteEstimate 추가)

- [ ] **Step 1: distanceToCbd 계산 코드 제거, commuteEstimate 계산 추가**

`features/offerings/services/offering.compare.ts`에서 `mapToCompareItem` 함수를 수정한다.

import 추가 (파일 상단):
```typescript
import { estimateCommuteMin } from "@/lib/commute/haversine";
```

`mapToCompareItem` 함수 내에서:

```typescript
// 제거할 코드 (약 266-270번째 줄)
// Distance to CBD (via nearest subway as proxy)
const distanceToCbd =
  subwayPoi?.distance_m != null
    ? `${(Number(subwayPoi.distance_m) / 1000).toFixed(1)}km`
    : "정보 없음";

// 추가할 코드
const locForCommute = pickFirst(row.property_locations);
const commuteEstimate =
  locForCommute?.lat != null && locForCommute?.lng != null
    ? null  // 근무지 미선택 시 null — 실제 추정은 클라이언트에서 workplace 선택 후 계산
    : null;
```

return 객체에서:
```typescript
// 제거
distanceToCbd,

// 추가
commuteEstimate,
```

**Note:** `commuteEstimate`를 서버에서 계산하지 않는 이유: 근무지를 모르기 때문. 클라이언트에서 `WorkplaceSelector`로 근무지 선택 후 `estimateCommuteMin`을 직접 호출한다. 서버 타입 만족을 위해 `null`로 채운다.

- [ ] **Step 2: 타입 체크**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck 2>&1 | grep "offering.compare"
```

Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add features/offerings/services/offering.compare.ts
git commit -m "refactor: replace distanceToCbd with commuteEstimate in compare mapper"
```

---

## Task 6: useWorkplace hook — 근무지 상태 관리

**Files:**
- Create: `features/offerings/hooks/useWorkplace.ts`

- [ ] **Step 1: hook 작성**

```typescript
// features/offerings/hooks/useWorkplace.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import type { WorkplacePreset } from "@/lib/commute/workplaces";

export type WorkplaceState = WorkplacePreset | null;

const STORAGE_KEY = "oboon_workplace";

function loadFromStorage(): WorkplaceState {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WorkplacePreset;
  } catch {
    return null;
  }
}

function saveToStorage(wp: WorkplacePreset) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wp));
  } catch {
    // 무시
  }
}

export function useWorkplace() {
  const [workplace, setWorkplaceState] = useState<WorkplaceState>(null);

  useEffect(() => {
    setWorkplaceState(loadFromStorage());
  }, []);

  const setWorkplace = useCallback((wp: WorkplacePreset) => {
    setWorkplaceState(wp);
    saveToStorage(wp);
    // TODO: 로그인 사용자라면 프로필 저장 (Task 6 확장 — 현재 세션은 localStorage만)
  }, []);

  return { workplace, setWorkplace };
}
```

**Note:** 프로필 저장(Supabase)은 이 태스크에서 구현하지 않는다 (YAGNI — localStorage로 충분히 동작, 프로필 저장은 후속 작업).

- [ ] **Step 2: 타입 체크**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck 2>&1 | grep "useWorkplace"
```

Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add features/offerings/hooks/useWorkplace.ts
git commit -m "feat: add useWorkplace hook for local workplace state"
```

---

## Task 7: WorkplaceSelector 컴포넌트

**Files:**
- Create: `features/offerings/components/detail/WorkplaceSelector.client.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
// features/offerings/components/detail/WorkplaceSelector.client.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { MapPin, ChevronDown, X } from "lucide-react";
import { WORKPLACE_PRESETS, type WorkplacePreset } from "@/lib/commute/workplaces";
import type { WorkplaceState } from "@/features/offerings/hooks/useWorkplace";

interface Props {
  workplace: WorkplaceState;
  onSelect: (wp: WorkplacePreset) => void;
}

export default function WorkplaceSelector({ workplace, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = query.trim()
    ? WORKPLACE_PRESETS.filter((wp) => wp.label.includes(query.trim()))
    : WORKPLACE_PRESETS;

  function handleSelect(wp: WorkplacePreset) {
    onSelect(wp);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-surface) hover:bg-(--oboon-bg-subtle) transition-colors ob-typo-caption"
      >
        <MapPin className="w-3.5 h-3.5 text-(--oboon-primary) shrink-0" />
        <span className={workplace ? "text-(--oboon-text-title) font-medium" : "text-(--oboon-text-muted)"}>
          {workplace ? workplace.label : "근무지 선택"}
        </span>
        <ChevronDown className={["w-3.5 h-3.5 text-(--oboon-text-muted) transition-transform", open ? "rotate-180" : ""].join(" ")} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 w-60 border border-(--oboon-border-default) bg-(--oboon-bg-surface) rounded-xl shadow-lg overflow-hidden">
          {/* 검색 */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-(--oboon-border-default)">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="역명 또는 구명 검색"
              className="flex-1 ob-typo-caption bg-transparent outline-none text-(--oboon-text-title) placeholder:text-(--oboon-text-muted)"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")}>
                <X className="w-3.5 h-3.5 text-(--oboon-text-muted)" />
              </button>
            )}
          </div>

          {/* 목록 */}
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center ob-typo-caption text-(--oboon-text-muted)">
                검색 결과가 없습니다
              </div>
            ) : (
              filtered.map((wp) => (
                <button
                  key={wp.code}
                  type="button"
                  onClick={() => handleSelect(wp)}
                  className={[
                    "flex w-full items-center gap-2 px-3 py-2 text-left ob-typo-caption transition-colors hover:bg-(--oboon-bg-subtle)",
                    workplace?.code === wp.code ? "bg-(--oboon-bg-subtle) font-medium text-(--oboon-primary)" : "text-(--oboon-text-body)",
                  ].join(" ")}
                >
                  <span className="shrink-0 text-(--oboon-text-muted)">
                    {wp.type === "station" ? "🚇" : "🏢"}
                  </span>
                  {wp.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck 2>&1 | grep "WorkplaceSelector"
```

Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add features/offerings/components/detail/WorkplaceSelector.client.tsx
git commit -m "feat: add WorkplaceSelector component with preset search"
```

---

## Task 8: OfferingInlineCompare 수정 — 교통·입지 탭 교체

**Files:**
- Modify: `features/offerings/components/detail/OfferingInlineCompare.client.tsx`

- [ ] **Step 1: import 추가**

파일 상단에 추가:

```tsx
import { useWorkplace } from "@/features/offerings/hooks/useWorkplace";
import WorkplaceSelector from "@/features/offerings/components/detail/WorkplaceSelector.client";
import { estimateCommuteMin } from "@/lib/commute/haversine";
import type { WorkplacePreset } from "@/lib/commute/workplaces";
```

- [ ] **Step 2: TabContent의 location 탭 로직 수정**

`TabContent` 컴포넌트 시그니처와 location 탭 부분을 수정한다. `workplace`와 `onFetchAccurate` prop을 추가:

```tsx
// TabContent 컴포넌트 수정
function TabContent({
  tab, left, right, workplace, accurateCommute, onFetchAccurate,
}: {
  tab: TabId;
  left: OfferingCompareItem;
  right: OfferingCompareItem | null;
  workplace: WorkplacePreset | null;
  accurateCommute: {
    left: { transit: number; car: number } | null;
    right: { transit: number; car: number } | null;
  };
  onFetchAccurate: (side: "left" | "right") => void;
}) {
```

location 탭 분기 (`} else {` 부분)를 아래로 교체:

```tsx
  } else {
    // 교통·입지 탭 — 근무지 선택 시 출퇴근 시간 계산
    const leftLoc = left.commuteEstimate; // 항상 null (서버에서 채우지 않음)
    void leftLoc; // 타입 참조 유지
    const rightLoc = right?.commuteEstimate ?? null;
    void rightLoc;

    // workplace가 있으면 Haversine으로 즉시 추정 (현장 좌표 없으면 null)
    // 현장 좌표는 OfferingCompareItem에 없으므로, 추정은 서버 API에 위임
    // → 이 뷰에서는 "근무지 선택" → "정확히 알아보기" 버튼 흐름만 제공

    const renderCommuteCell = (
      side: "left" | "right",
      item: OfferingCompareItem | null,
    ) => {
      if (!item) return <EmptyCell label="출퇴근 시간" />;
      if (!workplace) {
        return (
          <div className="px-5 py-4">
            <div className="ob-typo-caption text-(--oboon-text-muted) mb-1">출퇴근 시간</div>
            <div className="ob-typo-caption text-(--oboon-text-muted)">근무지를 설정하면 확인할 수 있어요</div>
          </div>
        );
      }

      const accurate = side === "left" ? accurateCommute.left : accurateCommute.right;
      if (accurate) {
        return (
          <div className="px-5 py-4">
            <div className="ob-typo-caption text-(--oboon-text-muted) mb-1">출퇴근 시간</div>
            <div className="ob-typo-subtitle text-(--oboon-text-title)">
              🚇 {accurate.transit}분 · 🚗 {accurate.car}분
            </div>
          </div>
        );
      }

      return (
        <div className="px-5 py-4">
          <div className="ob-typo-caption text-(--oboon-text-muted) mb-1">출퇴근 시간</div>
          <div className="ob-typo-caption text-(--oboon-text-muted) mb-2">추정 중…</div>
          <button
            type="button"
            onClick={() => onFetchAccurate(side)}
            className="ob-typo-caption text-(--oboon-primary) underline-offset-2 hover:underline"
          >
            정확히 알아보기
          </button>
        </div>
      );
    };

    return (
      <div>
        <div className={["grid grid-cols-2", "border-t border-(--oboon-border-default)"].join(" ")}>
          <div className="border-r border-(--oboon-border-default)">
            <SpecCell label="인근 지하철" value={left.nearestStation} />
          </div>
          <div>
            {right ? <SpecCell label="인근 지하철" value={right.nearestStation} /> : <EmptyCell label="인근 지하철" />}
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-(--oboon-border-default)">
          <div className="border-r border-(--oboon-border-default)">
            {renderCommuteCell("left", left)}
          </div>
          <div>
            {renderCommuteCell("right", right)}
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-(--oboon-border-default)">
          <div className="border-r border-(--oboon-border-default)">
            <SpecCell
              label="학군"
              value={<span className={schoolCls(left.schoolGrade)}>{left.schoolGrade}</span>}
            />
          </div>
          <div>
            {right
              ? <SpecCell label="학군" value={<span className={schoolCls(right.schoolGrade)}>{right.schoolGrade}</span>} />
              : <EmptyCell label="학군" />
            }
          </div>
        </div>
      </div>
    );
  }
```

- [ ] **Step 3: 메인 컴포넌트에 workplace 상태 + accurateCommute 상태 추가**

`OfferingInlineCompare` 컴포넌트 본체에 추가:

```tsx
const { workplace, setWorkplace } = useWorkplace();
const [accurateCommute, setAccurateCommute] = useState<{
  left: { transit: number; car: number } | null;
  right: { transit: number; car: number } | null;
}>({ left: null, right: null });

// workplace 변경 시 accurate 초기화
useEffect(() => {
  setAccurateCommute({ left: null, right: null });
}, [workplace]);

const handleFetchAccurate = useCallback(async (side: "left" | "right") => {
  if (!workplace) return;
  const item = side === "left" ? currentItem : compareItem;
  if (!item) return;

  try {
    const res = await fetch(
      `/api/commute-time?propertyId=${item.id}&workplaceLat=${workplace.lat}&workplaceLng=${workplace.lng}&workplaceCode=${encodeURIComponent(workplace.code)}`,
    );
    if (!res.ok) return;
    const data = (await res.json()) as { transit: number; car: number; unit: string };
    setAccurateCommute((prev) => ({ ...prev, [side]: { transit: data.transit, car: data.car } }));
  } catch {
    // 무시
  }
}, [workplace, currentItem, compareItem]);
```

- [ ] **Step 4: 교통·입지 탭 상단 근무지 선택 UI 추가**

`TabContent` 렌더링 부분을 감싸는 구조로, `activeTab === "location"` 일 때 탭 상단에 WorkplaceSelector를 표시:

```tsx
{/* ── 탭 콘텐츠 ── */}
{loading ? (
  /* ... 기존 스켈레톤 ... */
) : (
  <div>
    {activeTab === "location" && (
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-(--oboon-border-default) bg-(--oboon-bg-subtle)/40">
        <span className="ob-typo-caption text-(--oboon-text-muted) shrink-0">근무지</span>
        <WorkplaceSelector workplace={workplace} onSelect={setWorkplace} />
      </div>
    )}
    <TabContent
      tab={activeTab}
      left={currentItem}
      right={compareItem}
      workplace={workplace}
      accurateCommute={accurateCommute}
      onFetchAccurate={handleFetchAccurate}
    />
  </div>
)}
```

- [ ] **Step 5: 기존 rows 기반 location 탭 코드 제거 확인**

`TabContent` 내 기존 `rows` 배열에 `distanceToCbd`를 참조하는 코드가 남아 있으면 삭제. Task 8 Step 2에서 이미 전체를 교체했으므로 확인만.

- [ ] **Step 6: 타입 체크**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck 2>&1 | head -30
```

Expected: 에러 없음

- [ ] **Step 7: 빌드 확인**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully`

- [ ] **Step 8: Commit**

```bash
git add features/offerings/components/detail/OfferingInlineCompare.client.tsx features/offerings/hooks/useWorkplace.ts
git commit -m "feat: add commute time to compare 교통·입지 tab with workplace selector"
```

---

## Task 9: 마무리 검증

- [ ] **Step 1: 전체 lint 확인**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm lint 2>&1 | tail -20
```

Expected: 에러 없음 (경고는 허용)

- [ ] **Step 2: 전체 빌드 확인**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully`

- [ ] **Step 3: 수동 검증 체크리스트**

로컬 개발 서버(`pnpm dev`)에서:
- [ ] 현장 상세 페이지 → "현장 비교" 섹션 → "교통·입지" 탭 클릭
- [ ] 탭 상단에 "근무지 [근무지 선택]" 버튼 표시
- [ ] 근무지 선택 드롭다운에 업무지구 + 역 목록 표시, 검색 동작
- [ ] 근무지 선택 시 출퇴근 시간 행에 "정확히 알아보기" 버튼 표시
- [ ] "정확히 알아보기" 클릭 시 `/api/commute-time` 호출 (Naver API 키 없으면 502 반환 — 정상)
- [ ] 페이지 새로고침 후에도 localStorage에서 근무지 복원
- [ ] 비교 현장 선택 후 오른쪽 컬럼도 동일하게 동작

- [ ] **Step 4: 최종 Commit**

```bash
git add .env.example
git commit -m "docs: add NAVER_DIRECTIONS_API_KEY env vars to .env.example"
```

---

## 참고: Naver Directions 5 API 설정

1. [Naver Cloud Platform Console](https://console.ncloud.com) → AI·NAVER API → Maps → Directions 5 신청
2. Application에서 Client ID / Client Secret 발급
3. `.env.local`에 추가:
   ```
   NAVER_DIRECTIONS_API_KEY_ID=발급받은_ID
   NAVER_DIRECTIONS_API_KEY=발급받은_SECRET
   ```
4. API 키 없을 때: `/api/commute-time`은 502 반환 — "정확히 알아보기" 클릭 시 조용히 실패, 추정치 표시 유지
