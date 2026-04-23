# HANDOFF — 2026-04-23

## 현재 목표
페이지 로딩 성능 최적화 1차 완료. 사용자 피드백("페이지 진입이 멈춘 느낌", "스켈레톤 전환 지연") 대응.

## 완료된 작업 (2026-04-23)

### Middleware 경량화
- `middleware.ts`: 공용 경로(`/`, `/offerings`, `/briefing`, `/notice`, `/support`, `/visit`, `/map`, `/auth`) Supabase 호출 스킵 → CSP만 적용
- `profiles.deleted_at` 쿼리 완전 제거 (매 요청 네트워크 왕복 제거)
- `auth.getUser()`는 보호 경로에서만 유지 (SSR 세션 갱신 목적)
- 삭제 헬퍼: `isAuthBypassPath`, `buildDeletedAccountResponse`

### 로그인 플로우 soft-delete 처리 이관
- `features/auth/components/LoginPage.client.tsx`: 이메일 로그인 성공 후 `profiles.deleted_at` 확인 → 있으면 signOut + `/auth/login?error=deleted` redirect
- `?error=deleted` 쿼리 파라미터 처리 추가
- Google OAuth callback(`app/api/auth/google/callback/route.ts`)은 이미 deleted_at + banned 체크 완비되어 있음 (별도 작업 불필요)

### Header 최적화
- `components/shared/Header.tsx`: sessionStorage 기반 profile 캐싱 (`HEADER_PROFILE_CACHE_KEY`)
- 첫 페인트 직후 캐시된 avatar/name 즉시 표시, 백그라운드로 fresh fetch
- 다른 유저 캐시 잔재 방지 로직 포함

### Offerings 페이지 서버 fetch 전환
- `app/offerings/page.tsx`: `property_public_snapshots`에서 24개 서버 fetch + `revalidate = 60` ISR
- Suspense fallback을 `OfferingsPageSkeleton`으로 교체
- `OfferingsClient` / `OfferingsClientBody`에 `initialOfferings` prop 추가, 첫 마운트 fetch skip

### 홈 페이지 서버 fetch 전환
- `app/page.tsx`: async 서버 컴포넌트로 전환, `fetchPropertiesForOfferings(limit: 120)` 서버 수행 + `revalidate = 60` ISR
- `HomeOfferingsSectionDeferred.client.tsx`: `initialRows` prop forward (ssr:false는 유지 — 번들/hydration 보존)
- `HomeOfferingsSection.client.tsx` (2840줄): 시그니처/초기 state/첫 마운트 fetch skip 3지점만 수정

### Briefing 페이지 fetch 병렬화
- `app/briefing/page.tsx`: `fetchBriefingHomeData()` + `fetchOboonOriginalPageData()` 직렬 → `Promise.all` 병렬

### Root Layout dynamic 해제
- `app/layout.tsx`: `await headers()` 제거, async 해제
- `app/_csp-scripts.tsx` 신규 server component로 분리 (nonce 의존 Script 격리)
- `ScrollToTopOnRouteChange`의 `useSearchParams()`는 Suspense로 감쌈

### 이미지 최적화 활성화
- `next.config.js`: `images.unoptimized: true` → `false`
- Vercel Image Optimization 활성. Hobby 1000장/월, Pro 5000장/월 무료. 현재 이미지 규모에서 비용 리스크 낮음
- **운영 중 Vercel 대시보드 사용량 모니터링 필요**

## 성능 개선 요약

| 지점 | 개선 |
|------|------|
| 전 페이지 TTFB | Middleware Supabase 2회 → 0~1회 (공용 경로 0회) |
| 홈 진입 | 스켈레톤 → JS → fetch 3단계 → 스켈레톤 → JS → 즉시 렌더 2단계 |
| `/offerings` 진입 | 빈 fallback → 클라 fetch → SSR HTML 포함 첫 페인트 |
| `/briefing` 서버 시간 | 직렬 fetch → 병렬 (느린 쪽만큼만 대기) |
| Header 깜빡임 | profile 쿼리 대기 → sessionStorage 즉시 표시 |
| 이미지 | 원본 전달 → WebP/AVIF on-demand 변환 |

## 미완료 / 잔여 사항

| 항목 | 내용 | 우선도 |
|------|------|--------|
| HeroSection SSR 전환 | `features/home/components/HeroSection.tsx` (상담사 preview + 조건 패널). 복잡도 높아 hydration 이슈 우려로 보류 | Low |
| `consultablePropertyIds` 보조 fetch | 홈 섹션에서 목록 렌더 후 부가 정보용 추가 네트워크 1회. 첫 페인트 영향 없음 | Low |
| `/community`, `/chat` 최적화 | 실시간/로그인 전용이라 조사 대비 이득 불명. 필요시 별건 조사 | Low |
| Vercel 이미지 사용량 모니터링 | 활성화 후 1~2주 대시보드 확인. Hobby 한도 임박 시 `unoptimized: true`로 롤백 가능 | Monitor |
| `delete-account` auth.users 비활성화 | 이전 HANDOFF의 미완료 항목. 로그인 플로우 체크는 완료했으나 기존 세션 차단은 미구현 | Medium |
| `gallery` 매직바이트 | profile gallery 업로드 매직바이트 미적용 (MIME + 크기는 완료) | Low |

## 주의사항
- `PUBLIC_PATHS`에 포함된 경로는 middleware에서 Supabase getUser()를 스킵함. 새 공용 경로 추가 시 리스트 갱신 필요
- Header sessionStorage 캐시 키 `oboon.header.profile.v1`. profile 스키마 변경 시 `.v2`로 bump
- `/offerings`, `/` ISR 60초 설정. 신규 분양 반영 지연 감수 (필요시 `revalidate-tag` 또는 간격 조정)
- `app/_csp-scripts.tsx`는 server component. `"use client"` 붙이지 말 것

## 다음 세션 시작 시
1. HANDOFF.md 읽기
2. Vercel 대시보드에서 이미지 최적화 사용량 확인 (활성화 이후 경과 시간 고려)
3. 필요 시 HeroSection SSR 전환 또는 `delete-account` 기존 세션 차단 구현
