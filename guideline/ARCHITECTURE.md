# ARCHITECTURE.md

## OBOON Frontend Architecture

### 목적

OBOON 프론트엔드는 **도메인 중심 구조 + SSOT(Single Source of Truth)** 를 통해
타입 안정성, UI 일관성, AI(Codex) 협업 효율을 극대화하는 것을 목표로 한다.

---

## 1. 전체 구조 개요

```
app/                // 라우트 조합 계층 (Thin Layer)
features/           // 도메인 계층 (핵심)
components/         // 디자인 시스템 / 공통 UI
shared/             // 범도메인 유틸
lib/                // 외부 연동 (supabase 등)
types/              // 최소한의 전역 타입
```

---

## 2. 핵심 설계 원칙 (Must)

### 2.1 app/ 는 “조합만 한다”

- page.tsx / layout.tsx
- 상태 조합, 섹션 배치
- feature 컴포넌트 호출

금지

- 상태값/라벨 매핑
- DB row 가공
- 도메인 정책 정의

> app은 **무엇을 보여줄지**만 알고
> **무슨 의미인지는 모른다**

---

### 2.2 features/ 는 도메인의 유일한 거처

모든 도메인 지식은 features 내부에 존재해야 한다.

#### 도메인 표준 구조

```
features/<domain>/
  domain/     // SSOT (타입, 상수, 정책, guard)
  services/   // DB / API 접근
  mappers/    // row → domain/view model
  components/ // 도메인 UI
  index.ts    // public exports
```

예) offerings

```
features/offerings/
  domain/
    offering.types.ts
    offering.constants.ts
  services/
    offering.query.ts
  mappers/
    offering.mapper.ts
  components/
    OfferingCard.tsx
    FilterBar.tsx
```

---

## 3. SSOT (Single Source of Truth)

### 3.1 SSOT 정의

- status 값/라벨
- region 탭
- enum, guard, normalize 함수
- “이 값이 무슨 의미인가”에 대한 모든 규칙

### 3.2 SSOT 위치

YES : `features/*/domain/**`
NO : app/, components/, shared/

### 3.3 예시 (Offerings)

- `OfferingStatusValue`
- `normalizeOfferingStatusValue`
- `OFFERING_REGION_TABS`

---

## 4. UI 계층 규칙

### components/ui

- Button, Card, Badge, Input 등
- **도메인 타입 import 금지**

### components/shared

- Header, Footer, PageContainer
- uxCopy (문구 SSOT)

### features/\*/components

- OfferingCard
- MapOfferingCompactList
- FilterBar

> “분양/지도/현장 의미를 아는 컴포넌트”는 무조건 features

---

## 5. types/ 정책

### 허용

- 진짜 전역 타입
- Route, 공통 유틸 타입

### 금지

- 도메인 enum / status / region

> 도메인 타입은 features/domain에만 정의한다
> types/는 **얇게 유지**

---

## 6. 구조적 목표

- 타입 캐스팅 제거
- status/region 해석의 단일화
- 홈/지도/카드 간 의미 불일치 제거
- Codex 작업 시 구조 붕괴 방지
