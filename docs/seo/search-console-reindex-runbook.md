# Search Console Reindex Runbook

## 목적
- 배포 후 주요 페이지가 빠르게 재수집/재색인되도록 운영 루틴을 표준화한다.

## 사전 조건
- Search Console에 `oboon.co.kr` 속성이 등록되어 있어야 한다.
- 사이트맵 URL: `https://oboon.co.kr/sitemap.xml`

## 배포 당일 루틴
1. 배포 완료 확인
- 프로덕션 배포 성공 여부 확인
- `https://oboon.co.kr/robots.txt` 정상 응답 확인
- `https://oboon.co.kr/sitemap.xml` 정상 응답 확인

2. 사이트맵 제출/재제출
- Search Console > Sitemaps
- `https://oboon.co.kr/sitemap.xml` 제출(또는 재제출)

3. 핵심 URL 검사 및 색인 요청
- Search Console > URL Inspection에서 아래 URL 우선 검사
  - `/`
  - `/offerings`
  - 최신 `/offerings/[id]` 2~3개
  - 운영 중인 공개 허브 페이지(예: `/briefing`, `/support`)
- "Request indexing" 실행

4. 공유 미리보기 점검
- 주요 랜딩/상세 URL의 OG 제목/설명/이미지 노출 확인

## 24~72시간 후 점검
1. Indexing > Pages
- "Crawled - currently not indexed"
- "Discovered - currently not indexed"
- "Excluded by ‘noindex’ tag"
- "Blocked by robots.txt"

2. 문제가 발견되면
- 의도된 비공개 페이지인지 먼저 확인
- 의도되지 않은 공개 페이지면:
  - `robots/noindex/sitemap/canonical` 설정 재검토
  - 수정 배포 후 URL Inspection에서 재요청

## 월간 점검(권장)
1. 상위 유입 URL 20개 인덱싱 상태 샘플 점검
2. 사이트맵의 404/리다이렉트 URL 포함 여부 점검
3. 신규 공개 페이지 메타데이터/OG/JSON-LD 누락 점검
