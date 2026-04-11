# OBOON SEO 실행 계획

**기준일**: 2026-04-11  
**기준 문서**: [`FULL-AUDIT-REPORT.md`](./FULL-AUDIT-REPORT.md)

## P0

### 1. sitemap에 공개 허브 추가

**대상**

- `/recommendations`
- `/briefing/about`
- `/briefing/general`
- `/offerings/compare`

**목표**

- 검색엔진이 중요한 공개 페이지를 빠르게 발견하도록 만든다.

**완료 기준**

- `sitemap.xml`에 위 URL이 포함된다.
- `lastmod`, `changefreq`, `priority`가 적절히 배치된다.

---

### 2. 홈과 `/offerings`의 핵심 목록을 SSR로 앞당기기

**대상**

- [`features/offerings/components/HomeOfferingsSection.client.tsx`](/Users/songzo/KHL_Pilot/oboon-web/features/offerings/components/HomeOfferingsSection.client.tsx)
- [`features/offerings/components/OfferingsClientBody.tsx`](/Users/songzo/KHL_Pilot/oboon-web/features/offerings/components/OfferingsClientBody.tsx)

**목표**

- 초기 HTML에 실제 분양 카드가 보이게 하여 LCP와 크롤링 효율을 개선한다.

**완료 기준**

- 홈 상단과 `/offerings` 첫 화면이 스켈레톤만으로 시작하지 않는다.
- 첫 화면의 핵심 카드 데이터가 서버 렌더링으로 노출된다.

---

## P1

### 3. 공개 허브 내부 링크 강화

**대상**

- 홈
- 브리핑
- 브리핑 소개
- 고객센터
- 추천/비교 페이지

**목표**

- 허브 간 주제 권위를 더 명확히 전달한다.

**완료 기준**

- 상단 네비게이션과 푸터에서 중요한 허브가 일관되게 연결된다.
- 브리핑 소개와 편집 원칙이 더 잘 드러난다.

---

### 4. 이미지 최적화 점검

**목표**

- 이미지로 인한 LCP 손실을 줄인다.

**완료 기준**

- 위쪽 화면 이미지 우선순위가 정리된다.
- 카드 썸네일 크기와 포맷이 통일된다.
- `alt` 누락 여부를 점검한다.

---

## P2

### 5. AI 검색 대응 고도화

**목표**

- llms.txt와 편집/출처 신호를 더 강하게 만든다.

**완료 기준**

- 브리핑 소개, 저자/편집 원칙, 출처 기준이 상호 연결된다.
- 핵심 허브 요약 문구가 검색 의도에 맞게 다듬어진다.

---

### 6. 추가 검증

**목표**

- 배포 후 실제 head와 미리보기가 코드 의도와 같은지 확인한다.

**체크리스트**

- `<title>`
- `<meta name="description">`
- `<link rel="canonical">`
- `og:image`
- `application/ld+json`
- `sitemap.xml`

