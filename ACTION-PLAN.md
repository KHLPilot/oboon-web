# OBOON SEO 실행 계획 (ACTION PLAN)

**생성일**: 2026-04-04  
**기준**: `FULL-AUDIT-REPORT.md` 하이브리드 정정판  
**상태 라벨**: `로컬 반영 완료` / `배포 후 검증 필요` / `미완료`

---

## 실행 원칙

- 이 문서는 **2026-04-04 라이브 재점검 결과**와 **현재 작업트리 코드 상태**를 함께 반영합니다.
- 이미 코드에 반영된 항목은 `로컬 반영 완료`로 옮기고, 실제 라이브 반영 확인은 `배포 후 검증 필요`로 분리합니다.
- 현재 코드 기준으로 남아 있는 작업만 `미완료`로 유지합니다.

---

## 완료(로컬)

### [D1] 공개 페이지 canonical 분리
**상태**: `로컬 반영 완료`

**반영 확인 경로**

- `/support`
- `/community`
- `/recommendations`
- `/briefing/general/[slug]`
- `/briefing/oboon-original/[categoryKey]/[slug]`

**비고**

`/briefing/general` 목록 페이지는 아직 별도 metadata가 없어 이 항목에 포함하지 않습니다.

---

### [D2] `/support` 타이틀 중복 수정
**상태**: `로컬 반영 완료`

라이브에서 보이던 `고객센터 | OBOON | OBOON` 문제는 현재 코드 기준으로 정리되었습니다.

---

### [D3] 브리핑 아티클 고유 메타 적용
**상태**: `로컬 반영 완료`

**반영 확인 경로**

- `/briefing/general/[slug]`
- `/briefing/oboon-original/[categoryKey]/[slug]`

**반영 항목**

- `title`
- `description`
- `alternates.canonical`
- `openGraph`
- `twitter`

---

### [D4] 브리핑 아티클 Article JSON-LD 추가
**상태**: `로컬 반영 완료`

**반영 확인 경로**

- `/briefing/general/[slug]`
- `/briefing/oboon-original/[categoryKey]/[slug]`

---

### [D5] BreadcrumbList 스키마 추가
**상태**: `로컬 반영 완료`

**반영 확인 경로**

- `/offerings/[id]`
- `/briefing/general/[slug]`
- `/briefing/oboon-original/[categoryKey]/[slug]`

---

### [D6] `/offerings` 브랜드 표기 및 기본 OGP 정리
**상태**: `로컬 반영 완료`

**반영 내용**

- `오분` 표기 제거
- `분양 리스트 | OBOON` 형태로 정리
- 기본 OGP를 `logo.svg` 직접 참조에서 `/opengraph-image` 기반으로 전환

---

### [D7] sitemap에서 `/support/faq` 제거
**상태**: `로컬 반영 완료`

생성 로직 기준으로 리다이렉트 경로가 sitemap에서 제거되었습니다.

---

## 배포 후 검증 필요

### [V1] 메타데이터 라이브 반영 재확인
**상태**: `배포 후 검증 필요`

로컬 수정분이 실제 배포본에 반영됐는지 재확인합니다.

**우선 확인 URL**

- `/support`
- `/community`
- `/recommendations`
- `/briefing`
- `/briefing/oboon-original`
- `/briefing/general`
- `/briefing/general/general-general-000001`
- `/offerings`

**검증 포인트**

- `<title>`
- `<meta name="description">`
- `<link rel="canonical">`
- `og:title`
- `og:image`
- `twitter:title`
- `application/ld+json`

---

### [V2] sitemap 재검증
**상태**: `배포 후 검증 필요`

**확인 항목**

- `/support/faq` 제거 여부
- 새로운 `lastmod` 반영 여부
- 리다이렉트/에러 URL 미포함 여부

---

### [V3] 기본 OGP 공유 미리보기 검증
**상태**: `배포 후 검증 필요`

기본 OGP 경로는 교체됐지만, 실제 소셜/메신저 미리보기 품질은 아직 확인되지 않았습니다.

**확인 항목**

- 1200x630 비율 정상 렌더 여부
- 카카오톡/슬랙/기타 메신저 미리보기 잘림 여부
- 문구와 비주얼의 브랜드 적합성

---

## 미완료

### [C1] `/briefing/general` 목록 페이지 metadata 추가
**상태**: `미완료`

**대상**

- `/briefing/general`

**필수 항목**

- `title`
- `description`
- `alternates.canonical`
- `openGraph`
- `twitter`

**이유**

현재 코드 기준으로도 이 경로는 전용 metadata가 없어, 브리핑 허브 메타 정리 작업의 마지막 핵심 갭입니다.

---

### [C2] 브리핑 허브 메타 설명 문구 정밀화
**상태**: `미완료`

현재 `/briefing`, `/briefing/oboon-original` 메타는 분리되어 있지만, 검색의도 기준 문구 튜닝은 추가 여지가 있습니다.

**권장 방향**

- `/briefing`: 분양 시장 브리핑 허브
- `/briefing/oboon-original`: OBOON 오리지널 인사이트 아카이브
- `/briefing/general`: 일반 브리핑 아카이브

---

## 백로그

### [M1] `llms.txt` 추가
**상태**: `미완료`

AI 검색 대응 보조 문서 추가.

---

### [M2] 브리핑 저자/편집팀 소개 페이지
**상태**: `미완료`

E-E-A-T 보강.

---

## 체크리스트

- [x] [D1] 공개 페이지 canonical 분리
- [x] [D2] `/support` 타이틀 중복 제거
- [x] [D3] 브리핑 아티클 고유 메타 적용
- [x] [D4] 브리핑 아티클 Article JSON-LD 추가
- [x] [D5] BreadcrumbList 추가
- [x] [D6] `/offerings` 브랜드 표기 및 기본 OGP 정리
- [x] [D7] sitemap에서 `/support/faq` 제거
- [ ] [V1] 배포 후 메타데이터 재검증
- [ ] [V2] 배포 후 sitemap 재검증
- [ ] [V3] 기본 OGP 공유 미리보기 검증
- [ ] [C1] `/briefing/general` 목록 metadata 추가
- [ ] [C2] 브리핑 허브 메타 설명 문구 정밀화
- [ ] [M1] `llms.txt` 추가
- [ ] [M2] 브리핑 저자/편집팀 소개 페이지
