# SEO Indexing Policy

## 목적
- 검색엔진에 노출할 페이지와 노출하지 않을 페이지를 명확히 구분한다.
- 신규 라우트 추가 시 인덱싱 정책 누락을 방지한다.

## 인덱싱 원칙
- 공개 유입이 필요한 페이지만 `index,follow`를 유지한다.
- 로그인/개인정보/운영도구/내부 API는 기본적으로 `noindex,nofollow` 또는 `robots disallow` 처리한다.
- `sitemap.xml`에는 공개 URL만 포함한다.

## 현재 공개(인덱싱) 대상
- `/`
- `/offerings`
- `/offerings/[id]`
- `/briefing/*` (현재 정책 기준)
- `/map`
- `/community`
- `/support`
- `/support/faq`
- `/support/qna`

## 현재 비공개(비인덱싱) 대상
- `/admin/*`
- `/agent/*`
- `/auth/*`
- `/briefing/admin/*`
- `/chat/*`
- `/company/*`
- `/community/profile`
- `/profile`
- `/api/*`

## 구현 위치
- `robots` 크롤링 제어: `/Users/songzo/oboon-web/app/robots.ts`
- `sitemap` 공개 URL 제어: `/Users/songzo/oboon-web/app/sitemap.ts`
- 라우트 단위 `noindex`:
  - `/Users/songzo/oboon-web/app/admin/layout.tsx`
  - `/Users/songzo/oboon-web/app/agent/layout.tsx`
  - `/Users/songzo/oboon-web/app/auth/layout.tsx`
  - `/Users/songzo/oboon-web/app/chat/layout.tsx`
  - `/Users/songzo/oboon-web/app/company/properties/layout.tsx`
  - `/Users/songzo/oboon-web/app/briefing/admin/layout.tsx`
  - `/Users/songzo/oboon-web/app/profile/page.tsx`
  - `/Users/songzo/oboon-web/app/community/profile/page.tsx`

## 신규 라우트 추가 체크리스트
1. 이 페이지가 검색 노출 대상인지 먼저 결정한다.
2. 비공개 페이지면:
   - 해당 레이아웃/페이지에 `robots: { index: false, follow: false }` 추가
   - 필요 시 `app/robots.ts`에 `disallow` 경로 추가
3. 공개 페이지면:
   - `metadata`(`title`, `description`, `canonical`) 추가
   - `app/sitemap.ts`에 포함 규칙 반영
4. 배포 후 `/robots.txt`, `/sitemap.xml` 확인
