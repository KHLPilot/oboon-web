# CODING CONVENTION

본 문서는 OBOON 저장소의 실제 코드 패턴을 기준으로 정리한 팀 코딩 컨벤션이다.
목표는 "일관된 코드 작성"이 아니라, "현재 팀 스타일에 맞는 코드 생성과 수정"이다.

관련 문서:
- `guideline/ENGINEERING_RULES.md`
- `guideline/CONTRIBUTING.md`
- `guideline/Guideline.md`

---

## 1. 우선순위

코드를 작성할 때의 우선순위는 아래 순서를 따른다.

1. 기존 동작을 깨지 않는다.
2. 이미 존재하는 구조와 네이밍을 따른다.
3. 도메인 책임을 섞지 않는다.
4. 타입을 명시하고, 입력값은 검증한다.
5. UI는 토큰과 기존 컴포넌트 중심으로 조합한다.

새 규칙을 만들기보다, 같은 목적의 기존 코드를 먼저 찾아 그 패턴을 복제하는 쪽을 기본값으로 삼는다.

---

## 2. 폴더 배치 규칙

### `app/`

- Next.js 라우트, layout, page, route handler만 둔다.
- `page.tsx`는 화면 조합과 섹션 배치에 집중한다.
- `app/api/**/route.ts`는 요청 검증, 인증 확인, 서비스 호출, 응답 반환만 담당한다.
- `app` 레이어에서 DB 쿼리 세부 구현을 직접 늘리지 않는다.

### `features/<domain>/`

도메인 로직은 기본적으로 `features` 아래에 둔다.

- `components/`: 도메인 UI
- `services/`: DB 조회, 저장, 외부 연동
- `domain/`: 타입, 상수, 정책, 규칙, 순수 계산
- `mappers/`: row/raw data -> UI/domain shape 변환
- `hooks/`: 화면 단위 상태 조합

### `components/`

- 여러 도메인에서 재사용되는 범용 UI만 둔다.
- 도메인 의미를 아는 컴포넌트는 `components/`가 아니라 `features/<domain>/components/`에 둔다.

### `lib/`

- 프레임워크/외부 SDK 연동, 범용 유틸, 런타임 공용 도구를 둔다.
- 특정 도메인 규칙은 `lib/`가 아니라 각 `features/<domain>/domain`에 둔다.

---

## 3. 파일명과 네이밍

### 파일명

- React 컴포넌트: `PascalCase.tsx`
- Hook: `useSomething.ts`
- Service: `domain.action.ts`, `domain.query.ts`, `domain.server.ts`처럼 역할이 보이게 작성
- Route handler: Next.js 기본 규칙에 따라 `route.ts`
- Client Component는 필요할 때만 `.client.tsx` 접미사를 사용한다.

### 식별자

- 컴포넌트, 타입, enum 성격 상수: `PascalCase`
- 변수, 함수, 훅: `camelCase`
- 라우트 상수: `ROUTES`처럼 대문자 상수 사용 가능
- DB 컬럼/row shape는 원본 스키마를 따라 `snake_case`를 유지해도 된다.
- 앱 내부에서 새로 만든 타입/객체 필드는 가능하면 `camelCase`로 정규화한다.

예시:
- DB 입력/출력: `available_cash`, `property_id`
- 앱 내부 타입: `availableCash`, `propertyId`

---

## 4. import 규칙

- 절대 경로 alias `@/`를 기본으로 사용한다.
- 같은 feature 내부 상대 경로는 허용되지만, 깊은 상대 경로보다 `@/`를 우선한다.
- 타입 전용 import는 `import type`을 사용한다.
- import 순서는 대체로 다음 흐름을 따른다.
  1. React/Next
  2. 외부 라이브러리
  3. `@/` 내부 공용 모듈
  4. 같은 feature 내부 모듈

---

## 5. 타입 작성 규칙

- TypeScript `strict` 기준을 전제로 작성한다.
- `any`는 피하고, 불가피하면 경계를 좁힌 뒤 빠르게 구체 타입으로 바꾼다.
- 외부 입력, API body, query param은 바로 신뢰하지 않는다.
- raw row 타입과 UI/domain 타입을 분리한다.

권장 패턴:

1. DB row/raw 응답 타입 정의
2. mapper에서 정규화
3. 화면은 정규화된 타입만 사용

### 타입 선택 기준

- 객체 shape가 확장될 가능성이 크고 도메인 모델인 경우 `interface`
- 조합 타입, 유니언, 임시 row shape, 함수 입력은 `type`

### Nullable 처리

- DB 응답은 `null` 가능성을 먼저 반영한다.
- 화면 진입 전 mapper/service에서 최대한 정리한다.
- `undefined`와 `null`을 혼용하지 말고, 기존 패턴에 맞춘다.

---

## 6. 함수 작성 규칙

- 한 함수는 하나의 책임만 가진다.
- 조건 분기가 길어지면 작은 순수 함수로 분리한다.
- 반복되는 문자열 가공, 점수 계산, 상태 판정은 인라인으로 늘이지 말고 helper로 뺀다.
- 함수명은 동사로 시작한다.

예시:
- `normalizeCustomerInput`
- `resolvePriceVisibility`
- `mapPropertyRowToOffering`
- `validateUnitDraft`

---

## 7. React 컴포넌트 규칙

### 기본 원칙

- 컴포넌트는 렌더링 책임을 우선하고, 무거운 데이터 가공은 mapper/domain/helper로 뺀다.
- props 타입은 인라인으로 짧게 쓰거나, 재사용되면 별도 타입으로 분리한다.
- 파생값은 렌더 중 계산 가능하면 그대로 두고, 비용이 크거나 의도가 중요한 경우에만 `useMemo`를 사용한다.
- 이벤트 핸들러는 `handleX`, 로딩 함수는 `load/fetchX` 네이밍을 따른다.

### Client / Server 구분

- 브라우저 API, state, effect, 이벤트가 필요할 때만 `"use client"`를 추가한다.
- 서버에서 가능한 데이터 준비는 서버 레이어에서 끝내고, client 컴포넌트는 상호작용에 집중한다.

### JSX 스타일

- 단순 조건 렌더링은 삼항 또는 `? : null` 패턴을 사용한다.
- 복잡한 class 조합은 배열 + `join(" ")` 또는 `cn()`을 사용한다.
- 의미 없는 wrapper div 추가를 피한다.

---

## 8. Hook 규칙

- 훅은 "화면 단위 상태 조합"에 사용한다.
- API 호출, 사용자 권한, 파생 상태, 액션 핸들러를 한 화면 맥락으로 묶을 때 적합하다.
- 순수 계산은 hook이 아니라 `domain/` 또는 util 함수에 둔다.
- effect 내부에서 바로 큰 로직을 늘이기보다 `load` 같은 별도 함수로 분리한다.

---

## 9. Service 규칙

- 서비스는 데이터 접근과 저장을 담당한다.
- Supabase 접근은 서비스로 모은다.
- 서비스는 가능한 한 얇게 유지한다.
- 서비스에서 UI 문맥을 과하게 알지 않도록 한다.

권장:
- 조회/수정 함수를 명확히 분리
- Supabase 결과를 그대로 반환하거나, 최소 가공만 수행
- 실패 시 호출부가 처리할 수 있는 형태 유지

지양:
- 서비스 내부에 화면별 alert/confirm 로직 넣기
- 서비스에서 여러 UI 정책까지 함께 결정하기

---

## 10. Mapper / Domain 규칙

### Mapper

- raw data를 화면 친화적인 shape로 바꾸는 곳이다.
- 숫자 변환, 문자열 trim, fallback 선택, 대표 이미지 선택 같은 정규화를 담당한다.
- mapper 이름은 `mapXToY` 형태를 기본으로 한다.

### Domain

- 점수 계산, 상태 판정, 라벨 정책, 상수 테이블처럼 "순수 규칙"을 둔다.
- React 의존성을 넣지 않는다.
- 테스트 가치가 높은 로직은 domain에 모으는 쪽을 우선한다.

---

## 11. API Route 규칙

- 요청 body/query는 `zod`로 검증한다.
- 인증/권한 확인, 입력 정규화, domain/service 호출, `NextResponse` 반환 순서를 유지한다.
- route handler 내부에서 긴 계산 로직을 직접 쓰지 않는다.
- 로그는 `console.error`, `console.warn` 중심으로 제한한다.

권장 순서:

1. schema 정의
2. 요청 파싱
3. 인증/권한 확인
4. 입력 정규화
5. service/domain 호출
6. 응답 반환

---

## 12. 스타일링 규칙

- Tailwind CSS v4와 프로젝트 토큰을 사용한다.
- 하드코딩 색상보다 `--oboon-*` 토큰을 우선한다.
- 타이포그래피는 `ob-typo-*` 클래스가 있으면 우선 사용한다.
- 클래스가 길어져도 의미 단위로 줄바꿈해 읽기 쉽게 유지한다.

### `cn()` 사용 기준

조건부 클래스 조합 시 `cn()` (`lib/utils` 경유 `clsx` + `tailwind-merge`)을 사용한다.

```tsx
// ✅ 권장
className={cn(
  "h-full overflow-hidden p-0 transition duration-200",
  isActive && "border-(--oboon-border-strong)",
  variant === "ghost" && "bg-transparent",
)}

// ❌ 지양 (tailwind-merge 없어 클래스 충돌 가능)
className={`h-full ${isActive ? "border-..." : ""}`}
```

- 정적 클래스는 앞에, 조건부 클래스는 뒤에 쓴다.
- 클래스 배열 길이가 4개 초과이면 `cn()` 사용을 기본으로 삼는다.

### 스타일링 순서 (가독성)

의미 단위로 줄을 나눈다.

```
1. 레이아웃 (flex, grid, position, overflow)
2. 크기/간격 (h-, w-, p-, m-, gap-)
3. 색/배경 (bg-, text-, border-)
4. 타이포 (ob-typo-*, font-, text-size)
5. 상태/전환 (hover:, focus:, transition, duration)
```

---

## 13. 문자열, 카피, 주석

- 사용자 노출 문구는 기존 SSOT/공용 카피가 있으면 재사용한다.
- 같은 의미의 문구를 여러 파일에 새로 만들지 않는다.
- 주석은 "왜 이런 처리가 필요한지" 설명할 때만 짧게 쓴다.
- 자명한 코드 설명 주석은 쓰지 않는다.
- 한글 문구는 의미를 바꾸지 않는 한 임의 수정하지 않는다.

---

## 14. 에러 처리와 로깅

- 예상 가능한 실패는 조용히 삼키지 말고 반환값 또는 사용자 피드백으로 연결한다.
- 사용자 액션 실패는 `showAlert`, 응답 상태 분기 등 기존 UX 패턴을 따른다.
- 개발용 `console.log`, `console.debug`, `console.info`는 남기지 않는다.
- 운영상 필요한 경우에만 `console.warn`, `console.error`를 사용한다.

---

## 15. AI 코드 생성 기본 규칙

AI가 새 코드를 만들 때는 아래를 기본값으로 삼는다.

1. 먼저 같은 도메인의 유사 파일을 찾아 구조를 복제한다.
2. 새 비즈니스 규칙은 `domain/`으로 보낸다.
3. 새 DB 접근은 `services/`에 둔다.
4. row -> view model 변환이 있으면 `mappers/`를 만든다.
5. page/route/component에서 모든 책임을 한 파일에 몰아넣지 않는다.
6. 문자열, 타입명, 상태값은 기존 네이밍을 우선 재사용한다.
7. 파일 이동이나 대규모 구조 변경은 명시적 필요가 있을 때만 한다.

---

## 16. 작업 전 체크리스트

- 이 코드가 들어갈 위치가 `app`, `features`, `components`, `lib` 중 어디인지 명확한가?
- 이미 같은 패턴의 파일이 있는가?
- DB 접근이 service 밖으로 새고 있지 않은가?
- raw 응답과 UI 타입이 분리되어 있는가?
- 입력값 검증이 필요한 경계인가?
- 사용자 문구를 중복 생성하고 있지 않은가?
- 토큰과 기존 UI 규칙을 따르고 있는가?

---

## 17. 환경 변수 규칙

Next.js의 서버/클라이언트 경계를 환경 변수에도 동일하게 적용한다.

| 접두사 | 노출 범위 | 예시 |
|--------|---------|------|
| `NEXT_PUBLIC_` | 브라우저 번들 포함 (공개) | `NEXT_PUBLIC_SUPABASE_URL` |
| 없음 | 서버 전용 (절대 클라이언트 노출 금지) | `SUPABASE_SERVICE_ROLE_KEY` |

- `SUPABASE_SERVICE_ROLE_KEY`, 외부 API Secret 키는 `app/api/**`, 서버 컴포넌트에서만 참조한다.
- 클라이언트 컴포넌트에서 서버 전용 환경 변수를 참조하면 빌드 에러 또는 `undefined`로 조용히 실패한다 — 반드시 사전에 확인한다.
- 환경 변수는 `.env.local`(로컬 개발)과 Vercel/배포 환경에서만 관리하고, 소스에 직접 하드코딩하지 않는다.

---

## 18. Supabase 클라이언트 선택 기준

| 클라이언트 | 사용 위치 | 파일 |
|-----------|---------|------|
| `createSupabaseClient()` | Client Component, hook, 브라우저 이벤트 핸들러 | `lib/supabaseClient.ts` |
| `createSupabaseServer()` | Server Component, API route | `lib/supabaseServer.ts` |
| `createClient(url, serviceRoleKey)` | RLS 우회가 필요한 서버 전용 작업 | API route 내 인라인 선언 |

**클라이언트별 동작 차이:**

- `createSupabaseClient()`: 매 호출마다 새 브라우저 클라이언트를 생성한다 (싱글톤 아님). Anon Key 사용.
- `createSupabaseServer()`: 쿠키에서 세션을 읽는다. API route·서버 컴포넌트에서 인증된 사용자 식별에 사용한다.
- Service Role Key: RLS를 우회한다. `SUPABASE_SERVICE_ROLE_KEY` 환경 변수는 서버 전용이며 클라이언트 번들에 절대 포함하지 않는다.

**주의사항:**

- Client Component에서 서버 클라이언트(`createSupabaseServer`)를 사용하면 런타임 에러가 발생한다.
- API route에서 브라우저 클라이언트(`createSupabaseClient`)를 사용하면 쿠키를 읽지 못해 `auth.uid()` = `null`이 된다. RLS가 우회되는 것이 아니라 **익명 사용자로 취급**되어 데이터 접근이 막힌다.
- `app/api/**/route.ts`와 서버 컴포넌트는 반드시 `createSupabaseServer()`를 사용한다.

---

## 19. 접근성 최소 기준

과도한 ARIA 추가보다 **시맨틱 HTML 우선**을 원칙으로 한다.

- `<img>`, `<Image>`에는 항상 `alt`를 제공한다. 장식용이면 `alt=""`로 명시한다.
- 버튼에 텍스트 라벨이 없을 때 (`아이콘 버튼`) `aria-label`을 추가한다.
- 인터랙티브 요소는 `<div onClick>` 대신 `<button>`, `<a>`처럼 의미 있는 태그를 사용한다.
- 모달, 드로어, 드롭다운에는 키보드로 닫을 수 있는 `Escape` 핸들러를 포함한다.
- 폼 필드는 `<label>` 또는 `aria-label`을 통해 입력 목적을 명시한다.

---

## 20. 성능 & 번들 고려사항

### 이미지

- 반드시 Next.js `<Image>` 컴포넌트를 사용한다. 브라우저 native `<img>` 직접 사용은 지양한다.
- 카드 썸네일: `aspect-video` + `object-cover` 고정 비율.
- 외부 이미지 도메인은 `next.config.ts`의 `images.remotePatterns`에 등록한다.

### 코드 스플리팅

- 무거운 모달, 대시보드 차트, 지도 컴포넌트는 `dynamic()`으로 lazy load한다.

```tsx
const NaverMap = dynamic(() => import("@/features/map/components/NaverMap"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});
```

- `ssr: false`는 브라우저 API에 의존하는 컴포넌트(지도, 특정 서드파티)에만 사용한다.

### Suspense & 스트리밍

- 데이터 의존 섹션은 `<Suspense fallback={<Skeleton />}>`으로 감싸 스트리밍을 활용한다.
- 페이지 전체를 하나의 큰 await로 막지 않는다.

### 불필요한 리렌더 방지

- `useCallback` / `useMemo`는 실제 비용이 있는 경우에만 사용한다. 최적화 이유 없이 기계적으로 추가하지 않는다.
- 리스트 렌더링에 안정적인 `key`를 사용한다. 인덱스를 key로 쓰는 것은 순서가 변하지 않는 정적 목록에서만 허용한다.

---

## 21. 한 줄 기준

이 저장소에서 좋은 코드는 "새로운 방식의 코드"가 아니라 "기존 도메인 구조 안에 자연스럽게 들어가는 코드"다.
