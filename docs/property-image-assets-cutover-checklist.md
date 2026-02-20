# Property Image Assets Cutover Checklist

이 문서는 `property_image_assets` 단일 소스로 완전 전환하고,
레거시 스키마(`properties.image_url`, `property_unit_types.floor_plan_url`, `property_gallery_images`)를 제거하기 전 점검용입니다.

## 1) 사전 조건

- `supabase/migrations/049_property_image_assets.sql` 적용 완료
- 신규/수정 이미지 저장 시 `property_image_assets`에 `kind`, `image_hash`, `is_active`가 정상 반영됨
- 대표 이미지/갤러리/평면도 조회가 assets-only 경로로 동작하도록 앱 배포 완료
- R2 CORS 설정 완료 (`http://localhost:3000` 포함)

### 1-1) R2 CORS 설정 (필수)

브라우저에서 R2 이미지를 `fetch()`로 읽어 해시 비교할 때, CORS 미설정이면 아래 오류가 반복됩니다.
- `Origin http://localhost:3000 is not allowed by Access-Control-Allow-Origin`

Cloudflare Dashboard -> R2 -> 해당 버킷 -> `Settings` -> `CORS policy`에 아래 예시를 적용하세요.

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://oboon.kr",
      "https://www.oboon.kr"
    ],
    "AllowedMethods": ["GET", "HEAD", "OPTIONS"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
    "MaxAgeSeconds": 86400
  }
]
```

적용 후 검증:
- 브라우저 강력 새로고침
- Network 탭에서 이미지 요청 응답 헤더에 `Access-Control-Allow-Origin` 확인
- `test-upload`의 이미지 중복 필터에서 CORS 오류 로그가 사라지는지 확인

## 2) 코드 전환 완료 확인(필수)

- 앱 코드에서 아래 레거시 직접 조회 제거
  - `properties.image_url`
  - `property_unit_types.floor_plan_url`
  - `property_gallery_images`
- API 코드에서 아래 레거시 직접 업데이트 제거
  - `properties.image_url` update
  - `property_unit_types.floor_plan_url` update
  - `property_gallery_images` insert/update/delete
- 공개 스냅샷 생성 함수가 `property_image_assets`를 사용해 생성됨

## 3) 데이터 검증(운영/스테이징)

- 임의 현장 N개 샘플링 후 검증
  - main: 현장당 active 1건
  - floor_plan: (property_id, unit_type_id)당 active 1건 이하
  - gallery: sort_order 정상, 중복 hash 정책 정상
- UI 검증
  - 상세/목록/비교/저장 플로우에서 이미지 누락 없음
  - 재추출 시 동일 이미지 필터 정상

## 4) 롤백 준비

- 컷오버 직전 DB 백업
- 컷오버 SQL 실행 전 maintenance window 확보
- 문제 시 즉시 롤백 가능하도록 배포 아티팩트 보관

## 5) 최종 제거

- `supabase/migrations/050_finalize_property_image_assets_cutover.sql` 실행
- 실행 후 smoke test
  - 현장 생성/수정
  - 대표/갤러리/평면도 업로드/삭제/정렬
  - 공개 스냅샷 API

## 6) 코드 점검 결과 (2026-02-20)

- 완료
  - `test-upload` 비교 로드 시 주택형 평면도 URL을 `property_image_assets(kind='floor_plan')` 기준으로 우선 매핑
    - `/Users/songzo/oboon-web/app/test-upload/page.tsx`
  - 주택형 관리 서비스에서 `image_asset`를 floor plan의 메인 소스로 사용
    - 조회: `property_image_assets` 우선으로 `floor_plan_url`/`image_url` 패치
    - 생성/수정: floor plan URL 변경 시 `property_image_assets` 동기화(activate/deactivate)
    - 컷오버 대비: `property_unit_types.floor_plan_url` 컬럼 제거(42703) fallback 처리
    - `/Users/songzo/oboon-web/features/company/services/unitTypes.service.ts`
  - 갤러리 API를 `property_image_assets` 우선 경로로 전환
    - 조회/생성/정렬/삭제 모두 assets를 메인 소스로 처리
    - 레거시 `property_gallery_images`가 남아있는 환경에서는 fallback + best-effort dual-write 유지
    - 컷오버 후 `property_gallery_images` 제거(42P01)에도 동작하도록 처리
    - `/Users/songzo/oboon-web/app/api/property/gallery/route.ts`

- 남은 작업
  - 컷오버 실행 전 운영 데이터 검증(SQL) 수행 및 샘플 UI smoke test
  - 컷오버 시점에 `050_finalize_property_image_assets_cutover.sql` 실행
  - 실행 후 레거시 fallback 코드 정리(완전 assets-only 코드로 단순화)

## 7) 운영 검증 SQL (권장)

```sql
-- 1) main active 1건 보장 확인
SELECT property_id, COUNT(*) AS active_main_count
FROM public.property_image_assets
WHERE kind = 'main' AND is_active = true
GROUP BY property_id
HAVING COUNT(*) <> 1;

-- 2) floor_plan (property_id, unit_type_id) active 중복 확인
SELECT property_id, unit_type_id, COUNT(*) AS active_floor_plan_count
FROM public.property_image_assets
WHERE kind = 'floor_plan' AND is_active = true
GROUP BY property_id, unit_type_id
HAVING COUNT(*) > 1;

-- 3) floor_plan인데 unit_type_id가 비어있는 데이터 확인
SELECT id, property_id, unit_type_id, image_url
FROM public.property_image_assets
WHERE kind = 'floor_plan' AND unit_type_id IS NULL;

-- 4) gallery sort_order 충돌 확인
SELECT property_id, sort_order, COUNT(*) AS dup_count
FROM public.property_image_assets
WHERE kind = 'gallery' AND is_active = true
GROUP BY property_id, sort_order
HAVING COUNT(*) > 1;
```

## 8) 컷오버 전 상세 검증 SQL (floor_plan missing/extra)

```sql
-- floor_plan_missing_in_assets / floor_plan_extra_in_assets 요약
WITH legacy AS (
  SELECT
    u.properties_id AS property_id,
    u.id AS unit_type_id,
    btrim(u.floor_plan_url) AS image_url
  FROM public.property_unit_types u
  WHERE u.floor_plan_url IS NOT NULL
    AND btrim(u.floor_plan_url) <> ''
),
asset AS (
  SELECT
    a.property_id,
    a.unit_type_id,
    btrim(a.image_url) AS image_url
  FROM public.property_image_assets a
  WHERE a.kind = 'floor_plan'
    AND a.is_active = true
)
SELECT
  'floor_plan_missing_in_assets' AS check_type,
  COUNT(*) AS cnt
FROM legacy l
LEFT JOIN asset a
  ON a.property_id = l.property_id
 AND a.unit_type_id = l.unit_type_id
 AND a.image_url = l.image_url
WHERE a.unit_type_id IS NULL

UNION ALL

SELECT
  'floor_plan_extra_in_assets' AS check_type,
  COUNT(*) AS cnt
FROM asset a
LEFT JOIN legacy l
  ON l.property_id = a.property_id
 AND l.unit_type_id = a.unit_type_id
 AND l.image_url = a.image_url
WHERE l.unit_type_id IS NULL;
```

```sql
-- floor_plan_extra_in_assets 상세 목록
WITH legacy AS (
  SELECT
    u.properties_id AS property_id,
    u.id AS unit_type_id,
    btrim(u.floor_plan_url) AS image_url
  FROM public.property_unit_types u
  WHERE u.floor_plan_url IS NOT NULL
    AND btrim(u.floor_plan_url) <> ''
),
asset AS (
  SELECT
    a.id AS asset_id,
    a.property_id,
    a.unit_type_id,
    btrim(a.image_url) AS image_url,
    a.created_at,
    a.updated_at
  FROM public.property_image_assets a
  WHERE a.kind = 'floor_plan'
    AND a.is_active = true
)
SELECT a.*
FROM asset a
LEFT JOIN legacy l
  ON l.property_id = a.property_id
 AND l.unit_type_id = a.unit_type_id
 AND l.image_url = a.image_url
WHERE l.unit_type_id IS NULL
ORDER BY a.property_id, a.unit_type_id;
```

## 9) 컷오버 후 검증 SQL

```sql
-- (A) 레거시 스키마 제거 확인: 결과 0행이어야 정상
SELECT 1
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'properties'
  AND column_name = 'image_url';

SELECT 1
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'property_unit_types'
  AND column_name = 'floor_plan_url';

SELECT 1
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'property_gallery_images';
```

```sql
-- (B) assets 무결성 확인: 결과 0행이어야 정상
-- main active 1건 보장
SELECT property_id, COUNT(*) AS active_main_count
FROM public.property_image_assets
WHERE kind = 'main' AND is_active = true
GROUP BY property_id
HAVING COUNT(*) <> 1;

-- floor_plan active 중복
SELECT property_id, unit_type_id, COUNT(*) AS active_floor_plan_count
FROM public.property_image_assets
WHERE kind = 'floor_plan' AND is_active = true
GROUP BY property_id, unit_type_id
HAVING COUNT(*) > 1;

-- floor_plan인데 unit_type_id 없음
SELECT id, property_id, image_url
FROM public.property_image_assets
WHERE kind = 'floor_plan'
  AND is_active = true
  AND unit_type_id IS NULL;
```
