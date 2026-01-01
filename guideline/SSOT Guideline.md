# ✅ Codex 실행 프롬프트: Offerings 구조/규격화(SSOT + services + mappers + imports)

## 목표

1. `offerings` 도메인에서 **status/region 값·라벨·가드·매핑을 단일 SSOT**로 고정한다.
2. Supabase query와 row→view 변환을 `services/`, `mappers/`로 분리한다.
3. `app/page.tsx`, `app/offerings/page.tsx`, `features/offerings/*`에서 **직접 문자열/직접 캐스팅**을 제거한다.
4. `tsc --noEmit` 기준 오류 0.

---

## 0) 작업 전: 프로젝트에서 다음 파일/경로를 검색

* `features/offerings/constants/offeringBadges` 또는 `OfferingBadges.tsx`
* `OfferingStatus`, `OfferingStatusValue`, `OfferingRegion` 정의 위치(`types/index.ts` 포함)
* `FilterBar.tsx`, `OfferingCard.tsx`, `app/page.tsx`, `app/offerings/page.tsx`
* `confirmed_comment`, `estimated_comment`, `pending_comment` 사용하는 코드가 있는지

---

## 1) 새 폴더/파일 생성(필수)

### 1.1 폴더 생성

* `features/offerings/domain`
* `features/offerings/services`
* `features/offerings/mappers`

### 1.2 파일 생성: `features/offerings/domain/offering.types.ts`

다음 내용을 작성:

```ts
// features/offerings/domain/offering.types.ts

export const OFFERING_STATUS_VALUES = ["READY", "OPEN", "CLOSED"] as const;
export type OfferingStatusValue = (typeof OFFERING_STATUS_VALUES)[number];

export type OfferingStatusLabel = "모집 예정" | "모집 중" | "모집 종료" | "확인 중";

// 지역 탭은 프로젝트 정책에 맞게 확장 가능
export const OFFERING_REGION_TABS = [
  "전체",
  "서울",
  "경기",
  "인천",
  "충청",
  "강원",
  "경상",
  "전라",
  "제주",
] as const;

export type OfferingRegionTab = (typeof OFFERING_REGION_TABS)[number];
```

### 1.3 파일 생성: `features/offerings/domain/offering.constants.ts`

다음 내용을 작성:

```ts
// features/offerings/domain/offering.constants.ts
import type { OfferingStatusLabel, OfferingStatusValue, OfferingRegionTab } from "./offering.types";
import { OFFERING_STATUS_VALUES, OFFERING_REGION_TABS } from "./offering.types";

export const OFFERING_STATUS_LABEL: Record<OfferingStatusValue, OfferingStatusLabel> = {
  READY: "모집 예정",
  OPEN: "모집 중",
  CLOSED: "모집 종료",
};

export function isOfferingStatusValue(v: string): v is OfferingStatusValue {
  return (OFFERING_STATUS_VALUES as readonly string[]).includes(v);
}

// DB status -> statusValue 정규화(ONGOING -> OPEN 포함)
export function normalizeOfferingStatusValue(status: string | null | undefined): OfferingStatusValue | null {
  if (!status) return null;
  const s = status.trim().toUpperCase();
  if (s === "ONGOING") return "OPEN";
  return isOfferingStatusValue(s) ? (s as OfferingStatusValue) : null;
}

export function statusLabelOf(v: OfferingStatusValue | null | undefined): OfferingStatusLabel {
  if (!v) return "확인 중";
  return OFFERING_STATUS_LABEL[v];
}

// region_1depth가 "서울특별시"여도 "서울"로 정규화
export function normalizeRegionTab(region1Depth: string | null | undefined): OfferingRegionTab {
  const t = (region1Depth ?? "").trim();
  if (!t) return "전체";
  const hit = OFFERING_REGION_TABS.find((r) => r !== "전체" && t.startsWith(r));
  return (hit ?? "전체") as OfferingRegionTab;
}

export { OFFERING_REGION_TABS, OFFERING_STATUS_VALUES };
```

---

## 2) offerings 배지 파일 정리(SSOT로 흡수)

### 2.1 기존 `features/offerings/constants/offeringBadges` 또는 `OfferingBadges.tsx`에서

* status 라벨 매핑(READY/OPEN/CLOSED → 한글)
* status 가드
* region 탭 목록
  이런 정의가 있으면 **전부 삭제하고**, 새 SSOT 파일 import로 교체하라.

### 2.2 `features/offerings/OfferingBadges.tsx` 수정 규칙

* `value`가 status일 때는 **`OfferingStatusValue`만 받게**(라벨 문자열 금지)
* 표시 텍스트는 `statusLabelOf(value)`로 렌더링
* region은 “라벨 문자열 그대로 받는” 방식 유지 가능(현재 구현에 따라)

---

## 3) `FilterBar.tsx` 타입 오류 0으로 만들기(강제 규칙)

### 3.1 `features/offerings/FilterBar.tsx`에서

* `OfferingStatus`(라벨 타입) 사용 금지
* 상태 필터는 `OfferingStatusValue | "전체"`만 사용

다음 패턴으로 수정:

```ts
import type { OfferingStatusValue } from "@/features/offerings/domain/offering.types";
import { isOfferingStatusValue, OFFERING_STATUS_LABEL } from "@/features/offerings/domain/offering.constants";

const STATUSES: Array<OfferingStatusValue | "전체"> = ["전체", "OPEN", "READY", "CLOSED"];

const rawStatus = sp.get("status");
const status: OfferingStatusValue | "전체" =
  rawStatus && isOfferingStatusValue(rawStatus) ? rawStatus : "전체";

// 렌더링 텍스트:
const label = s === "전체" ? "전체" : OFFERING_STATUS_LABEL[s];
```

> 캐스팅(as OfferingStatusValue) 금지. 반드시 가드로만.

---

## 4) DB Query + Mapper 분리(홈 + offerings 페이지 공용)

### 4.1 파일 생성: `features/offerings/services/offering.query.ts`

Supabase client를 인자로 받아 쿼리 수행:

```ts
// features/offerings/services/offering.query.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export async function fetchPropertiesForOfferings(
  supabase: SupabaseClient,
  opts?: { limit?: number }
) {
  const limit = opts?.limit ?? 24;

  return await supabase
    .from("properties")
    .select(`
      id,
      created_at,
      name,
      status,
      property_type,
      image_url,
      confirmed_comment,
      estimated_comment,
      pending_comment,
      property_locations (
        road_address,
        jibun_address,
        region_1depth,
        region_2depth,
        region_3depth
      ),
      property_unit_types (
        price_min,
        price_max
      )
    `)
    .order("created_at", { ascending: false })
    .limit(limit);
}
```

### 4.2 파일 생성: `features/offerings/mappers/offering.mapper.ts`

* row 타입 선언(필요 최소)
* row -> OfferingCard에 필요한 형태로 변환
* 감평사 한줄평 존재 여부 판정 함수 포함

```ts
// features/offerings/mappers/offering.mapper.ts
import type { Offering } from "@/types/index";
import { normalizeOfferingStatusValue, statusLabelOf, normalizeRegionTab } from "@/features/offerings/domain/offering.constants";

type PropertyLocationRow = {
  road_address: string | null;
  jibun_address: string | null;
  region_1depth: string | null;
  region_2depth: string | null;
  region_3depth: string | null;
};

type PropertyUnitTypeRow = {
  price_min: number | string | null;
  price_max: number | string | null;
};

export type PropertyRow = {
  id: number;
  created_at: string;
  name: string;
  status: string | null;
  property_type: string;
  image_url: string | null;
  confirmed_comment: string | null;
  estimated_comment: string | null;
  pending_comment: string | null;
  property_locations: PropertyLocationRow[] | null;
  property_unit_types: PropertyUnitTypeRow[] | null;
};

function toNumber(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(String(v).replaceAll(",", "").trim());
  return Number.isFinite(n) ? n : null;
}

function pickFirstNonEmpty(...values: Array<string | null | undefined>) {
  for (const v of values) if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

export function hasAppraiserComment(row: PropertyRow) {
  const v = (s: string | null) => (s ?? "").trim().length > 0;
  return v(row.confirmed_comment) || v(row.estimated_comment) || v(row.pending_comment);
}

function aggregatePrice(unitTypes: PropertyUnitTypeRow[] | null | undefined) {
  let min: number | null = null;
  let max: number | null = null;

  for (const u of unitTypes ?? []) {
    const pMin = toNumber(u.price_min);
    const pMax = toNumber(u.price_max);
    if (pMin != null) min = min == null ? pMin : Math.min(min, pMin);
    if (pMax != null) max = max == null ? pMax : Math.max(max, pMax);
  }

  return { min, max };
}

export function mapPropertyRowToOffering(row: PropertyRow, fallback: { addressShort: string; regionShort: string }) {
  const loc0 = row.property_locations?.[0] ?? null;
  const addr = pickFirstNonEmpty(loc0?.road_address, loc0?.jibun_address);
  const addressShort = addr ? (addr.length > 26 ? `${addr.slice(0, 26)}…` : addr) : fallback.addressShort;

  const { min, max } = aggregatePrice(row.property_unit_types);
  const statusValue = normalizeOfferingStatusValue(row.status);
  const status = statusLabelOf(statusValue);

  const regionLabel = normalizeRegionTab(loc0?.region_1depth) || fallback.regionShort;

  const offering: any = {
    id: String(row.id),
    title: row.name,
    addressShort,
    // 타입 충돌 방지: region은 안전값, 표시/필터는 regionLabel로
    region: "전체",
    regionLabel,
    status,
    statusValue,
    imageUrl: row.image_url,
    priceMin억: min,
    priceMax억: max,
  };

  return offering as Offering;
}
```

---

## 5) app/page.tsx, app/offerings/page.tsx를 services/mappers 기반으로 교체

### 5.1 `app/page.tsx`

* 직접 쿼리 제거 → `fetchPropertiesForOfferings`
* row 타입은 mapper의 `PropertyRow` 사용
* 변환은 `mapPropertyRowToOffering`
* 감평사 섹션: `rows.filter(hasAppraiserComment)` 기반
* 지역별 인기: region 탭 state + 필터 + (감평사 섹션 중복 제거)
* grid 컬럼은 홈에서만 필요하면 `ProjectRow cols="md:grid-cols-4"` 방식 적용 가능(별도)

### 5.2 `app/offerings/page.tsx`

* 가능하면 동일 query + mapper 사용
* region/status 필터는 SSOT 가드/상수만 사용

---

## 6) 배럴 export 추가(권장)

파일 생성: `features/offerings/index.ts`

```ts
export * from "./domain/offering.types";
export * from "./domain/offering.constants";
export * from "./services/offering.query";
export * from "./mappers/offering.mapper";
```

---

## 7) 전역 타입(types/index.ts) 정리(중요)

* `OfferingStatus`, `OfferingStatusValue` 정의가 `types/index.ts`에 있다면:

  * **정의는 제거**
  * 필요한 곳은 `features/offerings/domain/*`에서 import하도록 교체
  * (임시 호환이 필요하면) `types/index.ts`에서 re-export만 남겨도 됨

---

## 8) 완료 조건(강제)

* `tsc --noEmit` 에러 0
* status 관련 문자열 직접 사용 없음(라벨은 SSOT 매핑만)
* `FilterBar.tsx`는 캐스팅 없이 가드로만 status 파싱
* 홈에서 “감평사 한줄평”은 코멘트 있을 때만 카드 노출
* 홈에서 “전체 탭인데 아무것도 안 나오는” 케이스 제거(빈 데이터면 Empty state)

---

## 9) 실행 후 보고 형식

Codex는 다음을 출력해라:

1. 생성한 파일 목록
2. 변경한 파일 목록
3. 주요 타입 오류 해결 요약(특히 status/region)
4. 남은 TODO(있다면) — 단, 빌드/tsc는 반드시 통과해야 함