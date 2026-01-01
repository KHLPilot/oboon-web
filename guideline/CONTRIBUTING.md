# CONTRIBUTING.md

## OBOON Frontend Contribution Guide

### 이 문서는

- 팀원
- Codex / AI 도구
- 미래의 나

모두가 **같은 규칙으로 작업**하기 위한 기준이다.

---

## 1. 작업 시작 전 체크리스트

- [ ] 작업 도메인이 무엇인지 명확한가?
- [ ] 기존 SSOT(domain/)를 확인했는가?
- [ ] 유사한 패턴이 이미 features에 존재하는가?

---

## 2. 파일을 어디에 두어야 하나?

### 판단 기준 표

| 질문                  | YES           | NO         |
| --------------------- | ------------- | ---------- |
| 도메인 의미를 아는가? | features      | components |
| DB를 직접 접근하는가? | services      | X          |
| row → 가공 변환인가?  | mappers       | X          |
| 값/라벨/정책인가?     | domain        | X          |
| 단순 UI 조각인가?     | components/ui | X          |

---

## 3. status / region 처리 규칙 (절대 규칙)

### 해야 할 것

- `OfferingStatusValue` 사용
- `normalizeOfferingStatusValue` 사용
- `OFFERING_REGION_TABS` 사용
- guard 기반 분기

### 하지 말 것

- `"READY" | "OPEN" | "CLOSED"` 직접 사용
- `"모집 중"` 문자열 직접 노출
- `as OfferingStatusValue` 캐스팅

---

## 4. page.tsx 작성 규칙

### 허용

- 섹션 구성
- state 조합
- 필터링 결과 렌더링

### 금지

- Supabase 직접 호출
- status/region normalize
- row 가공 로직

---

## 5. 새 도메인 추가 방법

1. `features/<domain>/` 생성
2. `domain/services/mappers/components` 폴더 생성
3. offerings 구조를 그대로 참고
4. index.ts 배럴 export 추가

---

## 6. Codex 사용 규칙

- 구조 변경 시 반드시 **자동화 프롬프트 사용**
- 임의 파일 생성/이동 금지
- domain 외부에 정책 추가 금지

---

## 7. PR / 작업 완료 기준

- [ ] `pnpm typecheck` 오류 0
- [ ] SSOT 직접 문자열 사용 없음
- [ ] domain 외부 정책 코드 없음
- [ ] 동일 패턴 중복 생성 없음

---

## 8. 이 문서를 변경할 때

- 구조 규칙 변경은 **ARCHITECTURE.md 먼저 수정**
- 합의 없이 규칙 변경 금지

---

### 마무리

> 이 프로젝트의 품질은
> “개별 구현”이 아니라
> **구조 일관성**에서 나온다.
