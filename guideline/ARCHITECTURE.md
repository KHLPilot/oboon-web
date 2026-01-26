# ARCHITECTURE

이 문서는 oboon-web 레포지토리의 **최상위 헌법**이다.  
모든 코드, 리팩터링, 자동화(AI 포함)는 본 문서를 최우선으로 따른다.

---

## 1. 목적 (Purpose)

- 대규모 Next.js(App Router) + TypeScript 프로젝트를
  **예측 가능하고, 안전하며, 확장 가능한 구조**로 유지한다.
- 인간과 AI가 함께 작업하더라도 **의도와 구조가 붕괴되지 않도록** 한다.

---

## 2. 최우선 원칙 (Core Principles)

### 2.1 Correctness First

우선순위는 다음과 같다.

1. Correctness (정확성)
2. Safety (안전성)
3. Maintainability (유지보수성)
4. Speed (속도)

속도를 이유로 구조, 규칙, 타입 안정성을 훼손하지 않는다.

---

### 2.2 Single Source of Truth (SSOT)

- 도메인 개념, 타입, 상태 정의는 **단 하나의 출처**만 가진다.
- 중복 정의는 기술 부채로 간주한다.
- SSOT는 보통 `features/*/domain` 또는 명시된 constants 파일에 위치한다.

---

## 3. 아키텍처 레이어와 의존성 방향

### 3.1 레이어 정의

```text
app/                → UI 라우트 조합 계층
features/           → 도메인별 기능 모듈
  ├─ domain/         → SSOT (최하위)
  ├─ services/       → DB / 외부 API 접근
  ├─ mappers/        → row → view model 변환
  └─ components/     → 도메인 전용 UI
components/         → 전역 공용 UI (비도메인)
lib/                → 공용 유틸리티
```

---

### 3.2 의존성 규칙 (단방향)

- 상위 → 하위 방향만 허용
- domain 은 어떤 레이어에도 의존하지 않는다.
- app 은 features 내부 구현을 직접 참조하지 않는다.

#### 허용

```
app → features/index.ts → components
features/components → domain | services | mappers
services → domain
mappers → domain
```

#### 금지

```
app → features/services 직접 import ❌
app → features/mappers 직접 import ❌
features/domain → 다른 레이어 ❌
```

---

## 4. AI 사용 원칙

### 4.1 역할 선언

- AI는 의사결정자(decision maker)가 아니다.
- 아키텍처 판단, 경계 설정, 규칙 정의는 인간의 책임이다.
- AI는 명시된 규칙을 집행하는 도구로 사용한다.

---

### 4.2 추측 금지 원칙

- 코드, 타입, 의도가 명확하지 않으면 절대 추측하지 않는다.
- 정보가 부족하면 작업을 중단하고 질문한다.
- “보통 이런 경우…” 와 같은 일반론은 허용되지 않는다.

---

## 5. 문자 인코딩 / 한글 보호 규칙

- 모든 소스 파일은 UTF-8 (BOM 없음) 을 사용한다.
- 한글 문자열을 ASCII로 대체하거나 깨진 상태로 두지 않는다.
- 깨진 문자열이 발견되면 의미를 복원하여 수정한다.

---

## 6. 변경 원칙 요약

- 구조 변경 ≠ 로직 변경 ≠ 타입 변경
  → 한 작업에서 하나만 수행한다.
- 규칙을 어기는 빠른 해결은 허용되지 않는다.

---

본 문서는 모든 하위 규칙의 근거가 된다.
