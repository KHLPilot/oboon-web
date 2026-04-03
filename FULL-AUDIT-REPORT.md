# OBOON (oboon.co.kr) — 전체 SEO 감사 보고서

**감사일**: 2026-04-04  
**대상 URL**: https://oboon.co.kr  
**기준**: 2026-04-04 라이브 배포본 수동 재점검 + 현재 작업트리 로컬 코드 재확인

---

## SEO 종합 점수

### **라이브 기준 SEO 종합 점수: 49 / 100** ⚠️ 개선 필요

이 점수는 **2026-04-04 라이브 배포본 기준**입니다.  
현재 작업트리에는 일부 핵심 SEO 수정이 이미 반영되어 있으므로, 아래 내용은 반드시 두 층위로 읽어야 합니다.

- `라이브 확인 문제`: 실제 배포본에서 관측된 문제
- `로컬 반영 완료`: 현재 코드에는 반영되어 있으나 아직 라이브 반영은 확인되지 않은 상태
- `배포 후 검증 필요`: 로컬 반영 항목이 실제 배포본 head/sitemap/share preview에 정상 노출되는지 확인이 필요한 상태
- `미완료`: 현재 코드 기준으로도 아직 남아 있는 작업

---

## 재점검 핵심 요약

### 확인된 사실

- `/support`, `/community`, `/recommendations` 는 라이브에서 모두 **HTTP 200** 응답
- `robots.txt` 는 정상
- `sitemap.xml` 은 정상 제공
- `/offerings/51` 같은 개별 현장 상세는 라이브 기준 **개별 canonical + Product 스키마 + 실제 현장 이미지 OGP** 확인

### 라이브 확인 문제

- `/support`, `/community`, `/recommendations`, `/briefing/general`, 브리핑 샘플 아티클이 라이브 기준 홈 메타데이터를 상속
- `/support` 라이브 타이틀이 `고객센터 | OBOON | OBOON` 으로 중복
- `/offerings` 라이브 메타에 `오분` 표기와 `logo.svg` 기반 OGP 사용
- `sitemap.xml` 에 라이브 기준 `/support/faq` 포함
- 브리핑 아티클 및 일부 상세 페이지에서 라이브 기준 `Article` / `BreadcrumbList` 구조화 데이터 부족

### 로컬 반영 완료

- `/support`, `/community`, `/recommendations` 에 개별 canonical / Open Graph / Twitter 메타 정의 추가
- `/support` 타이틀 중복 제거
- `/briefing`, `/briefing/oboon-original` 허브 메타데이터 추가
- `/briefing/general/[slug]`, `/briefing/oboon-original/[categoryKey]/[slug]` 에 고유 메타 + `Article` + `BreadcrumbList` 추가
- `/offerings` 의 `오분` 표기 제거 및 기본 OGP를 `/opengraph-image` 기반으로 전환
- `/offerings/[id]` 에 `BreadcrumbList` 추가
- `sitemap.xml` 생성 로직에서 `/support/faq` 제거
- 공통 OGP 기본값을 `logo.svg` 에서 동적 OGP 이미지 경로로 전환

### 미완료

- `/briefing/general` 목록 페이지는 현재도 전용 `metadata` 정의가 없음
- 브리핑 허브 메타 설명은 분리되었지만, 실제 검색의도 기준 문구 정밀화는 추가 개선 여지 있음
- 기본 OGP가 새 경로로 바뀌었어도 실제 카카오톡/소셜 미리보기 품질은 배포 후 재검증 필요

---

## 상태별 상세 정리

| 항목 | 라이브 확인 문제 | 로컬 반영 완료 | 배포 후 검증 필요 | 미완료 |
|------|------------------|----------------|-------------------|--------|
| 공개 페이지 canonical 분리 | `/support`, `/community`, `/recommendations`, `/briefing/general`, 샘플 브리핑 아티클이 홈 canonical 상속 | `/support`, `/community`, `/recommendations`, 브리핑 아티클 상세는 코드 반영 | 해당 경로의 실제 `<link rel="canonical">` 재확인 필요 | `/briefing/general` 목록 페이지는 별도 metadata 필요 |
| `/support` 타이틀 중복 | `고객센터 | OBOON | OBOON` | `고객센터` / `고객센터 | OBOON` 조합으로 정리됨 | 라이브 `<title>` 재확인 필요 | 없음 |
| 브리핑 고유 메타 | 목록/아티클이 홈 title, canonical, og:image 상속 | 허브(`/briefing`, `/briefing/oboon-original`) 및 아티클 상세는 반영 | 라이브 head 반영 여부 확인 필요 | `/briefing/general` 목록 메타 미정의 |
| 브리핑 Article JSON-LD | 라이브 샘플 기준 없음 | 아티클 상세 2종에 추가됨 | 구조화 데이터 노출 재검증 필요 | 없음 |
| BreadcrumbList | 라이브 기준 `/offerings/[id]`, 브리핑 아티클에 부족 | `/offerings/[id]`, 브리핑 아티클에 추가됨 | Rich Results/Test 재확인 필요 | 없음 |
| `/offerings` 메타 품질 | `오분` 표기, `logo.svg` 기반 OGP | 브랜드 표기 `OBOON` 으로 수정, 기본 OGP 경로 교체 | 라이브 공유 미리보기 확인 필요 | 실제 카드 카피/비주얼 고도화 여지 |
| sitemap 품질 | `/support/faq` 포함 | 생성 로직에서 제거 | 라이브 `sitemap.xml` 재확인 필요 | 없음 |
| 기본 OGP 품질 | 로고 SVG 기반이라 공유 품질 저하 가능 | `/opengraph-image` 경로 도입 | 실제 렌더 이미지/미리보기 확인 필요 | 카드 문구/브랜딩 품질 개선 여지 |

---

## 🔴 Critical

### 1. `/briefing/general` 목록 페이지 메타데이터 미정의

**상태**: `미완료`

현재 코드 기준으로 `/briefing/general` 목록 페이지에는 전용 `metadata` 또는 `generateMetadata()`가 없습니다.  
이 경로는 라이브 재점검에서도 홈 메타를 상속한 대표 사례였고, 현재도 코드상 보완이 필요한 유일한 핵심 메타 갭입니다.

**영향**

- 일반 브리핑 허브의 독립 인덱싱 약화
- SERP 타이틀/설명 품질 저하 가능성
- 브리핑 상세는 보강됐지만 목록 허브는 여전히 홈 메타 상속 가능성 존재

**필수 조치**

- `title`
- `description`
- `alternates.canonical`
- `openGraph`
- `twitter`

---

## 🟠 High

### 2. 로컬 반영 항목의 라이브 배포 검증 필요

**상태**: `배포 후 검증 필요`

현재 작업트리 기준으로 다음 항목은 코드 반영이 확인됩니다.

- `/support`, `/community`, `/recommendations` canonical 분리
- `/support` 타이틀 중복 제거
- 브리핑 상세의 고유 메타 및 구조화 데이터 추가
- `/offerings` 브랜드 표기 정리
- `/offerings/[id]` BreadcrumbList 추가
- sitemap에서 `/support/faq` 제거

다만 이번 문서는 **배포 검증 문서가 아니라 정합성 보정 문서**이므로, 실제 라이브 반영 여부는 별도로 다시 확인해야 합니다.

**배포 후 확인 포인트**

- `<title>`
- `<meta name="description">`
- `<link rel="canonical">`
- `og:title`
- `og:image`
- `application/ld+json`
- `sitemap.xml`

---

### 3. 기본 OGP는 개선됐지만 실제 공유 품질은 아직 미확정

**상태**: `배포 후 검증 필요`

기본 OGP 경로는 더 이상 `/logo.svg` 직접 참조가 아니라 `/opengraph-image` 기반으로 바뀌었습니다.  
즉, 이전 문서의 "기본 og:image가 여전히 로고 SVG"라는 표현은 현재 코드 기준으로는 더 이상 정확하지 않습니다.

다만 다음은 아직 확인되지 않았습니다.

- 이미지가 실제로 1200x630 비율로 정상 렌더되는지
- 카카오톡/슬랙/기타 메신저에서 잘리는지 여부
- 문구와 비주얼이 브랜드/전환 목적에 맞는지

---

## 🟡 Medium

### 4. 브리핑 허브 메타 설명 정밀화 여지

**상태**: `미완료`

현재 코드 기준으로 `/briefing` 와 `/briefing/oboon-original` 메타 설명은 분리되어 있습니다.  
따라서 이전 문서의 "브리핑 허브 메타 설명 분리 부족"은 그대로 단정하기보다, **분리는 시작됐고 문구 정밀화가 남아 있다**고 보는 편이 맞습니다.

**추가 개선 방향**

- `/briefing`: 분양 시장 브리핑 허브
- `/briefing/oboon-original`: OBOON 자체 인사이트/해설 아카이브
- `/briefing/general`: 일반 브리핑 아카이브

---

### 5. SSR/App Router 메타 경로는 상당 부분 보강됐으나 전체 재검증 필요

**상태**: `배포 후 검증 필요`

이번 로컬 코드 기준으로 `page.tsx`, `layout.tsx`, `generateMetadata()` 경로가 여러 군데 보강됐습니다.  
다만 App Router의 메타 병합 규칙상, 실제 최종 head 출력은 배포 후 다시 확인해야 합니다.

특히 재확인 우선순위는 아래와 같습니다.

- `/support`
- `/community`
- `/recommendations`
- `/briefing`
- `/briefing/oboon-original`
- `/briefing/general`
- `/briefing/general/general-general-000001`
- `/offerings`

---

## 🔵 Low — 백로그

### 6. `llms.txt` 없음

**상태**: `미완료`

AI 검색/인용 최적화 관점에서 보조 문서 부재.

---

### 7. 브리핑 저자/편집팀 권위 페이지 부족

**상태**: `미완료`

Article 스키마가 추가되더라도 저자 프로필, 편집 원칙, 운영 주체 설명이 부족하면 E-E-A-T 효과는 제한적입니다.

---

## 잘 되고 있는 점

- `robots.txt` 구성 정상
- `sitemap.xml` 정상 제공
- HTTPS 및 보안 헤더 양호
- 개별 현장 상세 페이지는 라이브 기준 `Product` 스키마와 실제 현장 이미지 OGP 활용
- `/support`, `/community`, `/recommendations` 는 라이브에서 404가 아님
- 현재 로컬 코드에는 메타데이터/구조화 데이터 개선 작업이 상당 부분 반영되어 있음

---

## 우선순위 정리

| 우선순위 | 작업 | 현재 상태 | 이유 |
|---------|------|-----------|------|
| 1 | `/briefing/general` 목록 메타 추가 | 미완료 | 브리핑 허브 인덱싱 회복 |
| 2 | 로컬 반영분 라이브 재검증 | 배포 후 검증 필요 | 문서와 실제 head/sitemap 일치 확인 |
| 3 | 기본 OGP 공유 품질 점검 | 배포 후 검증 필요 | 메신저/소셜 미리보기 품질 확인 |
| 4 | 브리핑 허브 설명 문구 정밀화 | 미완료 | 검색의도 및 CTR 개선 |
| 5 | `llms.txt` 추가 | 미완료 | AI 검색 대응 보강 |
| 6 | 저자/편집팀 소개 보강 | 미완료 | E-E-A-T 강화 |

---

## 점검에 사용한 라이브 URL

- https://oboon.co.kr
- https://oboon.co.kr/robots.txt
- https://oboon.co.kr/sitemap.xml
- https://oboon.co.kr/offerings
- https://oboon.co.kr/offerings/51
- https://oboon.co.kr/briefing
- https://oboon.co.kr/briefing/general
- https://oboon.co.kr/briefing/general/general-general-000001
- https://oboon.co.kr/support
- https://oboon.co.kr/support/faq
- https://oboon.co.kr/community
- https://oboon.co.kr/recommendations

---

## 결론

2026-04-04 라이브 기준으로는 OBOON이 **공개 페이지 상당수에서 홈 메타를 상속하는 상태**였고, 이는 인덱싱 분리와 SERP 품질에 직접적인 손실이었습니다.  
다만 현재 작업트리 기준으로는 이 문제의 상당 부분이 이미 수정되어 있어, 문서상 우선순위도 이제는 **"전면 수정"보다 "남은 갭 보완 + 배포 검증"** 쪽으로 옮겨가는 것이 맞습니다.

현재 가장 중요한 잔여 작업은 **`/briefing/general` 목록 페이지 metadata 보완**이고, 그 다음은 **로컬 반영분이 실제 배포본 head/sitemap/share preview에 정확히 반영되는지 검증하는 일**입니다.
