> ⚠️ This file is a mirror of guideline/ARCHITECTURE.md  
> ⚠️ Do NOT edit here. Update the original only.

# ARCHITECTURE.md

본 문서는 OBOON 프론트엔드 코드베이스의 **구조 헌법**이다.  
디렉터리 구조, 레이어 책임, 의존성 방향, 점진적 리팩터링 원칙을 정의한다.

이 문서의 규칙은 다른 모든 가이드(CONTRIBUTING, ENGINEERING_RULES 등)보다
**항상 우선**한다.

---

## 0. 최상위 원칙

1. **라우팅은 `app/`만 담당한다**
2. **도메인 로직의 SSOT는 `features/<domain>/`이다**
3. **공용 UI는 `components/ui`, `components/shared`에만 둔다**
4. **도메인 전용 UI는 `features/<domain>/components`에 둔다**
5. **의존성은 단방향만 허용한다**
6. **구조 변경 시 이 문서를 먼저 수정한다**

---

## 1. 디렉터리 책임 정의

### 1.1 `app/` — Routing & Composition

#### 책임

- Next.js App Router 전용 디렉터리
- `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`
- Route Handlers: `app/api/**`
- 화면 **조합(Composition)** 만 담당

#### 금지

- Supabase/DB 직접 접근
- row → view model 변환
- 도메인 정책, 라벨, normalize 로직 정의

#### 허용 import

- `features/<domain>`의 **공개 API(index.ts)**
- `components/ui`, `components/shared`
- `lib/*` (route handler 한정)

---

### 1.2 `features/<domain>/` — 도메인 SSOT

도메인 단위 기능의 **단일 소유권(Single Source of Truth)** 을 가진다.

#### 하위 구조

##### `domain/`

- 타입, 상수, 라벨, 정책, guard
- **어떤 레이어에도 의존하지 않음**
- React, Supabase import 금지

##### `services/`

- DB / API 접근
- Supabase, fetch, server action 호출
- React import 금지

##### `mappers/`

- row → view model 변환
- 포맷, 계산, 표시용 가공
- React import 금지
- 순수 util 사용은 허용

##### `components/`

- 도메인 전용 UI
- 화면/섹션/카드 조합
- 해당 도메인 타입/서비스/매퍼 사용 가능

---

### 1.3 `components/` — 공용 UI & 레거시

#### 구성

- `components/ui`
  - Button, Card, Modal, Input 등 디자인 시스템 프리미티브
- `components/shared`
  - Header, Footer, PageContainer 등 전역 레이아웃
- `components/<domain>`
  - 레거시/예외 영역
  - 신규 도메인 UI 추가 **지양**

#### 신규 코드 규칙

- 신규 도메인 UI는 반드시 `features/<domain>/components`에 작성한다.
- 공용화는 **아래 조건을 만족할 때만** 허용한다.

#### 공용 승격 조건

다음 조건을 **모두 만족**해야 `components/ui` 또는 `components/shared`로 이동 가능:

1. 도메인 타입/서비스/매퍼 import 없음
2. 다른 도메인에서도 의미가 동일
3. props 구조가 범용적임

---

### 1.4 `lib/`

#### 책임

- 도메인 무관 유틸리티
- Supabase client/server 생성
- auth helper, validator

#### 금지

- 도메인 정책/라벨 정의

---

### 1.5 `shared/` vs `types/`

- `types/`
  - 전역 공통 타입
- `shared/`
  - 전역 상수, 문구, 메시지

도메인 타입/정책은 반드시  
`features/<domain>/domain` 이 소유한다.

---

## 2. 의존성 방향 (절대 규칙)

```
app
↓
features/<domain>/components
↓
services / mappers
↓
domain
```

- 역방향 의존성 금지
- 동일 레이어 간 순환 의존성 금지
- 타 도메인의 내부 파일 직접 import 금지

---

## 3. app/components 규칙

`app/components`는 **라우트 전용 보조 컴포넌트**만 허용한다.

- 해당 라우트에서만 사용
- 도메인 로직 없음
- 필요 시 `features/<domain>/components`로 승격

장기적으로는 제거 또는 최소화 대상이다.

---

## 4. 점진적 이행 정책

1. **신규 개발은 features-first**
2. 레거시(`components/<domain>`)는 수정 시 이관 검토
3. 공용화는 조건 충족 시에만 수행
4. 대규모 구조 변경은 PR에서 명시적으로 설명

---

## 5. 문자 인코딩 및 한글 안전 규칙 (필수)

본 프로젝트는 **한글(UTF-8) 안전성을 구조적 품질 요소**로 간주한다.  
한글 깨짐은 버그이며, 빌드/리뷰 차원에서 차단 대상이다.

### 1. 파일 인코딩 규칙

- 모든 소스 파일(`.ts`, `.tsx`, `.js`, `.md`, `.json`)은
  **UTF-8 (BOM 없음)** 인코딩을 사용한다.
- 다른 인코딩(EUC-KR 등)은 절대 허용하지 않는다.

### 2. 한글 문자열 작성 규칙

- UI에 노출되는 한글 문자열은 원칙적으로:
  - `features/<domain>/domain` 또는
  - `shared/` (전역 문구)
    에서 **SSOT로 정의**한다.
- 컴포넌트 내부에 한글 문자열을 직접 작성하는 것을 지양한다
  (임시/프로토타입 제외).

### 3. 서버 ↔ 클라이언트 경계 규칙

- API(Route Handler, Server Action) 응답에 한글이 포함될 경우:
  - JSON 직렬화 가능한 UTF-8 문자열만 사용한다.
- Buffer, binary, base64 처리 중 한글을 직접 다루지 않는다.

### 4. 파일 이동/리팩터링 시 규칙

- 파일 이동, rename, re-export 작업 시:
  - **한글 문자열이 손상되지 않았는지 반드시 확인**한다.
- 자동화 도구(Codex 포함)는
  - 한글 문자열을 escape/변형/치환해서는 안 된다.

### 5. 금지 사항

- 한글 문자열을 `encodeURIComponent`로 미리 인코딩하여 저장 ❌
- 한글을 숫자 코드(`\uXXXX`)로 수동 치환 ❌
- 깨짐을 숨기기 위한 임의 캐스팅/replace ❌

### 6. 위반 판단 기준

다음 중 하나라도 발생하면 구조 위반이다.

- UI에서 �(replacement character)가 보임
- 동일 문구가 위치/환경에 따라 다르게 표시됨
- 파일 이동 후 한글이 깨짐
- 인코딩 변경이 PR에 명시되지 않음

---

## 6. 위반 판단 기준 (리뷰 체크)

- domain에서 React/Supabase를 import했는가?
- services/mappers에서 UI를 import했는가?
- app에서 세부 UI/로직을 직접 import했는가?
- 도메인 규칙이 lib/shared에 흩어져 있는가?

하나라도 해당하면 구조 위반이다.

---

## 7. 이 문서의 위치

- 본 문서는 **구조 헌법**이며,
- 디렉터리/레이어 규칙에 대한 **유일한 기준 문서**다.
- 다른 문서는 본 문서를 참조하거나 보조 설명만 제공한다.

---
