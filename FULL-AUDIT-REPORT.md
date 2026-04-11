# OBOON (oboon.co.kr) 전체 SEO 감사 보고서

**감사일**: 2026-04-11  
**대상**: [https://oboon.co.kr](https://oboon.co.kr)  
**기준**: 라이브 사이트 실측 + 현재 작업트리 코드 재확인  
**언어**: 한국어

## 한 줄 결론

OBOON은 기본 SEO 인프라(robots, sitemap, canonical, OG, JSON-LD, llms.txt)를 꽤 잘 갖춘 상태입니다.  
다만 핵심 목록 페이지가 클라이언트 렌더링에 많이 의존하고, sitemap이 중요한 공개 허브 일부를 누락하고 있어 “기초는 좋지만 수익형 랜딩의 검색 친화도”는 더 올릴 수 있습니다.

## SEO 종합 점수

**82 / 100**

이 점수는 Lighthouse 같은 실험실 수치가 아니라, 이번 감사에서 확인한 구조/메타/색인 가능성/렌더링 방식/정보구조를 바탕으로 한 정성 점수입니다.

### 점수 요약

| 영역 | 점수 | 코멘트 |
|---|---:|---|
| Technical SEO | 86 | robots, sitemap, canonical, 보안 헤더, HTTPS는 양호 |
| Content Quality | 80 | 브리핑/상세 콘텐츠는 좋지만 홈/리스트는 다소 얇음 |
| On-Page SEO | 84 | title/description/OG 정리 상태가 좋음 |
| Schema / Structured Data | 88 | Product, Article, BreadcrumbList, WebSite, SearchAction 보유 |
| Performance (CWV) | 72 | 주요 목록이 클라이언트 데이터 로딩 중심 |
| AI Search Readiness | 85 | llms.txt와 브리핑 구조가 강점 |
| Images | 76 | 기본 구조는 괜찮지만 사이트 전반의 이미지 최적화는 추가 점검 필요 |

---

## Executive Summary

### 강점

1. `robots.txt`가 정상 동작하고, 민감 경로를 명확히 차단합니다.
2. `sitemap.xml`이 자동 생성되고, 실제 공개 URL과 상세 URL을 포함합니다.
3. 홈/상세/브리핑 페이지에 canonical, Open Graph, Twitter metadata가 잘 들어가 있습니다.
4. 상세 페이지에는 구조화 데이터가 실제 HTML에 노출됩니다.
5. [llms.txt](https://oboon.co.kr/llms.txt)가 있고, AI 검색용 가이드가 명확합니다.
6. `lang="ko"`와 한국어 콘텐츠 구조가 일관적입니다.

### 가장 큰 리스크

1. 홈과 분양 리스트가 핵심 데이터 일부를 클라이언트에서 늦게 불러옵니다.
2. sitemap이 일부 공개 허브를 누락합니다.
3. 목록/추천 페이지의 초기 HTML이 스켈레톤 중심이라 크롤링 효율과 LCP에 불리합니다.

### 빠른 개선 포인트

1. 공개 허브를 sitemap에 추가합니다.
2. 홈과 `/offerings`의 핵심 카드 데이터를 서버 렌더링으로 앞당깁니다.
3. `/briefing/about` 같은 권위 페이지를 더 적극적으로 내부 링크합니다.
4. 상단 이미지와 카드 이미지를 우선순위 로딩 대상으로 재정리합니다.

---

## 검증한 URL

- [홈](https://oboon.co.kr/)
- [robots.txt](https://oboon.co.kr/robots.txt)
- [sitemap.xml](https://oboon.co.kr/sitemap.xml)
- [llms.txt](https://oboon.co.kr/llms.txt)
- [분양 리스트](https://oboon.co.kr/offerings)
- [분양 상세 예시](https://oboon.co.kr/offerings/51)
- [브리핑](https://oboon.co.kr/briefing)
- [일반 브리핑 허브](https://oboon.co.kr/briefing/general)
- [일반 브리핑 예시](https://oboon.co.kr/briefing/general/general-general-000001)
- [오리지널 브리핑 허브](https://oboon.co.kr/briefing/oboon-original)
- [브리핑 소개](https://oboon.co.kr/briefing/about)
- [커뮤니티](https://oboon.co.kr/community)
- [고객센터](https://oboon.co.kr/support)
- [공지사항](https://oboon.co.kr/notice)

---

## Technical SEO

### 확인 결과

- HTTPS 정상
- HSTS 적용
- CSP 적용
- `robots.txt` 정상
- `sitemap.xml` 정상
- canonical 정상
- `noindex`가 필요한 내부/인증 경로는 차단됨

### 세부 근거

- 라이브 홈은 `index, follow`로 노출됩니다.
- `robots.txt`는 `/admin`, `/agent`, `/auth`, `/chat`, `/api` 등 민감 경로를 차단합니다.
- `sitemap.xml`은 공개 URL을 자동으로 생성합니다.

### 개선 여지

1. sitemap에 포함되어야 할 공개 허브가 몇 개 빠져 있습니다.
2. 공용 페이지 일부는 클라이언트 렌더링 의존도가 높아 크롤링 효율이 떨어질 수 있습니다.

---

## Content Quality

### 강점

1. 홈의 핵심 메시지가 명확합니다.
2. 브리핑 허브는 편집 원칙, 오리지널 해설, 일반 브리핑으로 계층이 나뉘어 있습니다.
3. `/briefing/about`는 저자 표기와 출처 기준을 설명해 E-E-A-T에 도움이 됩니다.

### 약점

1. 홈과 리스트는 콘텐츠 자체보다 서비스 탐색용 성격이 강해, 검색 쿼리 대응 문장량이 충분하진 않습니다.
2. 공개 허브가 sitemap에 빠져 있으면 새 콘텐츠 발견 속도가 느려집니다.

---

## On-Page SEO

### 확인 결과

- 홈, 분양 리스트, 커뮤니티, 고객센터, 공지사항, 브리핑 주요 허브에 title/description/canonical이 있습니다.
- 상세 페이지는 제목이 구체적입니다.
- 브리핑 상세는 title과 description이 본문 요약을 반영합니다.

### 예시

- 홈: `OBOON 분양 플랫폼`
- `/offerings`: `분양 리스트 | OBOON`
- `/briefing`: `브리핑 | OBOON`
- `/support`: `고객센터 | OBOON`
- 상세 분양: `대전 하늘채 루시에르 분양 정보 | OBOON`

### 개선 여지

1. `/offerings`, `/recommendations` 같은 상업적 허브는 검색 의도를 더 강하게 반영해도 좋습니다.
2. 허브 간 내부 링크 밀도를 더 높이면 토픽 권위가 더 명확해집니다.

---

## Schema / Structured Data

### 실제 확인된 스키마

- 홈: `Organization`, `WebSite`, `SearchAction`
- 분양 상세: `Product`, `AggregateOffer`, `BreadcrumbList`
- 브리핑 상세: `Article`, `BreadcrumbList`

### 평가

구조화 데이터는 꽤 성숙한 편입니다. 특히 상세 페이지에서 검색엔진이 이해하기 쉬운 형태로 잘 내려갑니다.

### 개선 여지

1. FAQ가 많은 고객센터에는 `FAQPage` 검토 여지가 있습니다.
2. 브리핑 소개/편집 원칙 페이지는 권위 신호를 더 강화할 수 있습니다.

---

## Performance

### 관찰 결과

1. 홈과 분양 리스트는 초기 HTML이 스켈레톤 중심이고, 핵심 데이터는 클라이언트에서 다시 가져옵니다.
2. 홈 섹션과 리스트 섹션 모두 `fetchPropertiesForOfferings(...)`를 `useEffect`에서 호출합니다.
3. 이 패턴은 검색엔진 렌더링에는 버틸 수 있어도, LCP와 체감 로딩에 불리합니다.

### 코드 근거

- [`HomeOfferingsSection.client.tsx`](./features/offerings/components/HomeOfferingsSection.client.tsx): 728-980 근처
- [`OfferingsClientBody.tsx`](./features/offerings/components/OfferingsClientBody.tsx): 429-500 근처

### 권장 조치

1. 홈의 상단 3개 카드 정도는 서버 렌더링으로 내립니다.
2. `/offerings`의 필터 가능한 기본 목록도 최초 HTML에 일부 포함되게 바꿉니다.
3. 이미지와 카드 렌더링에 우선순위를 줘 LCP를 줄입니다.

---

## Images

### 확인 결과

- 상세 페이지에서 대표 이미지를 OG 이미지로 활용합니다.
- 브리핑 상세는 커버 이미지가 있으면 이를 우선 사용합니다.
- 히어로/카드 이미지가 많아 이미지 최적화 여지가 있습니다.

### 개선 포인트

1. 위쪽 화면의 이미지 우선순위를 더 세밀하게 관리합니다.
2. `alt` 텍스트를 사이트 전반에서 일관되게 점검합니다.
3. 카드 썸네일은 적절한 크기와 포맷으로만 공급합니다.

---

## AI Search Readiness

### 좋은 점

1. [llms.txt](https://oboon.co.kr/llms.txt)가 있습니다.
2. 브리핑 구조가 콘텐츠 허브로서 명확합니다.
3. Article schema와 about/guide 성격 페이지가 AI 인용에 유리합니다.

### 더 할 수 있는 것

1. 편집 원칙, 출처 정책, 저자 소개를 더 명시적으로 연결합니다.
2. 브리핑 허브와 상세 간 내부 링크를 더 촘촘히 구성합니다.
3. 핵심 페이지마다 질문형 헤드라인과 요약 문단을 강화합니다.

---

## 핵심 문제

### 1) 공개 허브가 sitemap에서 누락됨

**중요도**: 높음  
**근거**: [`app/sitemap.ts`](/Users/songzo/KHL_Pilot/oboon-web/app/sitemap.ts) `publicPaths`에 `/recommendations`, `/briefing/about`, `/briefing/general`, `/offerings/compare`가 없습니다.

**영향**

- 새 공개 페이지의 발견 속도 저하
- 우선 색인 대상 누락
- 허브 간 권위 전달 약화

**권장 조치**

- 공개 상업 허브와 편집 허브를 sitemap에 추가
- 변경 빈도와 우선순위를 다시 정리

### 2) 핵심 목록 페이지가 클라이언트 렌더링 의존적

**중요도**: 높음  
**근거**: [`HomeOfferingsSection.client.tsx`](/Users/songzo/KHL_Pilot/oboon-web/features/offerings/components/HomeOfferingsSection.client.tsx) 940행 부근, [`OfferingsClientBody.tsx`](/Users/songzo/KHL_Pilot/oboon-web/features/offerings/components/OfferingsClientBody.tsx) 440행 부근에서 목록 데이터를 `useEffect`로 불러옵니다.

**영향**

- 초기 HTML이 스켈레톤 위주
- LCP 악화 가능성
- SEO 관점에서 핵심 목록 콘텐츠의 즉시 가시성 저하

**권장 조치**

- 홈의 상단 카드와 `/offerings`의 기본 목록을 서버 렌더링으로 전환
- 클라이언트는 인터랙션/필터 보강에 집중

### 3) 공개 허브 내부링크가 더 필요함

**중요도**: 중간  
**근거**: 현재 네비게이션은 잘 잡혀 있지만, 권위 페이지와 검색 허브 간 연결이 더 촘촘해질 여지가 있습니다.

**영향**

- 토픽 권위 분산
- 허브 간 페이지랭크 전달 약화

**권장 조치**

- 홈, 브리핑, 브리핑 소개, 고객센터를 서로 더 명시적으로 연결
- `/recommendations`, `/offerings/compare`를 상업 허브로 더 노출

### 4) 이미지 최적화 추가 점검 필요

**중요도**: 중간  
**영향**

- LCP와 시각 안정성 개선 여지
- 카드/히어로 이미지 용량 최적화 필요

**권장 조치**

- 대표 이미지 사이즈 표준화
- 우선순위 이미지에 대한 프리로드/priority 설정 점검

---

## 빠른 우선순위

1. `sitemap.xml`에 공개 허브 누락분 추가
2. 홈과 `/offerings`의 핵심 데이터 서버 렌더링 전환
3. `/recommendations`와 `/briefing/about`의 내부 링크 강화
4. 이미지 용량과 우선 로딩 순서 점검
5. 브리핑/상업 허브의 검색 의도 문구 정밀화

---

## 소스

### 라이브 확인

- [홈](https://oboon.co.kr/)
- [robots.txt](https://oboon.co.kr/robots.txt)
- [sitemap.xml](https://oboon.co.kr/sitemap.xml)
- [llms.txt](https://oboon.co.kr/llms.txt)
- [분양 리스트](https://oboon.co.kr/offerings)
- [분양 상세 예시](https://oboon.co.kr/offerings/51)
- [브리핑](https://oboon.co.kr/briefing)
- [일반 브리핑](https://oboon.co.kr/briefing/general)
- [일반 브리핑 예시](https://oboon.co.kr/briefing/general/general-general-000001)
- [오리지널 브리핑](https://oboon.co.kr/briefing/oboon-original)
- [브리핑 소개](https://oboon.co.kr/briefing/about)

### 코드 확인

- [`app/layout.tsx`](/Users/songzo/KHL_Pilot/oboon-web/app/layout.tsx)
- [`app/page.tsx`](/Users/songzo/KHL_Pilot/oboon-web/app/page.tsx)
- [`app/robots.ts`](/Users/songzo/KHL_Pilot/oboon-web/app/robots.ts)
- [`app/sitemap.ts`](/Users/songzo/KHL_Pilot/oboon-web/app/sitemap.ts)
- [`features/offerings/components/HomeOfferingsSection.client.tsx`](/Users/songzo/KHL_Pilot/oboon-web/features/offerings/components/HomeOfferingsSection.client.tsx)
- [`features/offerings/components/OfferingsClientBody.tsx`](/Users/songzo/KHL_Pilot/oboon-web/features/offerings/components/OfferingsClientBody.tsx)
- [`app/offerings/[id]/page.tsx`](/Users/songzo/KHL_Pilot/oboon-web/app/offerings/[id]/page.tsx)
- [`app/briefing/general/[slug]/page.tsx`](/Users/songzo/KHL_Pilot/oboon-web/app/briefing/general/[slug]/page.tsx)
- [`app/briefing/oboon-original/[categoryKey]/[slug]/page.tsx`](/Users/songzo/KHL_Pilot/oboon-web/app/briefing/oboon-original/[categoryKey]/[slug]/page.tsx)

