# Reco POI Pipeline

## 개요
- SSOT: `public.property_reco_pois`
- 런타임(사용자 요청): DB 조회만 수행
- 외부 API 호출: 배치(크론)에서만 수행
- 갱신 주기: 기본 주 1회 + 좌표 변경 시 큐 적재

## 스키마
- 마이그레이션:
  - `supabase/migrations/051_property_reco_pois_pipeline.sql`
- 주요 테이블:
  - `property_reco_pois`: 카테고리별 POI(이름/거리/좌표/메타/원본)
  - `property_reco_poi_jobs`: 증분 갱신 큐
- 제약:
  - `unique(property_id, category, kakao_place_id)`
  - `unique(property_id, category, rank)`
  - `index(property_id, category, distance_m)`

## 환경변수
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `KAKAO_REST_API_KEY`
- `PUBLIC_DATA_SUBWAY_ENDPOINT`
  - 예: 공공데이터 지하철 역/노선 JSON API endpoint
- `PUBLIC_DATA_SERVICE_KEY`
- `CRON_SECRET`

## 배치 실행 엔드포인트
- `POST /api/cron/reco-pois`
- 인증: `Authorization: Bearer <CRON_SECRET>`
- 쿼리 파라미터(옵션):
  - `chunk`: 기본 50
  - `topN`: 기본 3
  - `radius`: 기본 1000(m)
  - `concurrency`: 기본 3

### 예시
```bash
curl -X POST "https://<host>/api/cron/reco-pois?chunk=50&topN=3&concurrency=3" \
  -H "Authorization: Bearer <CRON_SECRET>"
```

## Supabase Cron Job 설정(주 1회)
아래 SQL은 `pg_cron + pg_net` 사용 가능한 환경 기준 예시입니다.

```sql
select cron.schedule(
  'reco-poi-weekly',
  '0 3 * * 1',
  $$
  select
    net.http_post(
      url := 'https://<host>/api/cron/reco-pois',
      headers := jsonb_build_object(
        'Authorization', 'Bearer <CRON_SECRET>',
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $$
);
```

## 증분 업데이트
- 함수: `public.enqueue_property_reco_poi_job(property_id, reason)`
- 트리거:
  - `property_locations` INSERT/UPDATE(lat/lng 변경) 시 자동 큐 적재
- 배치가 `pending` job을 우선 처리

## 지하철/학교 메타
- 지하철:
  - 카카오 역명 -> 정규화(역/공백/괄호 제거)
  - 공공데이터로 lines 집계 (`subway_lines`)
  - 실패 시 `raw_public`에 사유 기록
- 학교:
  - `category_name` 키워드 기반:
    - 초등학교/중학교/고등학교/대학교 -> `ELEMENTARY|MIDDLE|HIGH|UNIVERSITY`
    - 미매칭 -> `OTHER`
- 마트:
  - 카카오 `MT1` 결과를 tier 규칙으로 분류 저장
  - `MART`(대형마트), `DEPARTMENT_STORE`(백화점), `SHOPPING_MALL`(쇼핑몰)

## 조회 API(프론트용)
- `GET /api/reco-pois/[propertyId]`
- 응답:
  - `subway`: `{ station_name, lines[], distance_m, walk_min }[]`
  - `school_tabs`: `elementary/middle/high/university/other`
  - `mart`, `hospital`, `department_store`, `shopping_mall`: `{ name, distance_m }[]`

### 조회 SQL 예시
```sql
SELECT
  category,
  rank,
  name,
  distance_m,
  subway_lines,
  school_level,
  fetched_at
FROM public.property_reco_pois
WHERE property_id = :property_id
ORDER BY category, rank;
```

## 운영 팁
- TTL: 7일 이내 데이터는 재호출 스킵
- Rate limit:
  - `chunk`, `concurrency`, `topN`, `radius`를 작게 시작
  - 장애 시 재시도(backoff) 내장
- 장애 대응:
  - 외부 API 실패 시에도 조회는 캐시(DB)로 계속 동작
  - 실패 job은 `failed` 또는 backoff 후 `pending`으로 관리
