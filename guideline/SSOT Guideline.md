# SSOT_Guideline.md

본 문서는 **SSOT(Single Source of Truth)** 규칙만을 다룬다.

---

## 1. SSOT의 정의

SSOT란:

- 타입
- 상태 값
- 라벨
- 정책

이 **단 하나의 위치**에서만 정의되는 것을 의미한다.

---

## 2. 위치 규칙

- 도메인 SSOT → features/<domain>/domain
- 전역 타입 → types/
- 전역 문구 → shared/

---

## 3. 절대 금지

- 문자열 직접 사용 ("OPEN", "모집중")
- enum/union 직접 재정의
- `as SomeType` 캐스팅

---

## 4. 반드시 할 것

- guard 기반 분기
- normalize 함수 사용
- domain import 후 사용

---

## 5. 체크리스트

- [ ] 이 값은 domain에 정의되어 있는가?
- [ ] 다른 파일에서 복제하지 않았는가?
- [ ] 문자열을 직접 쓰지 않았는가?

---
