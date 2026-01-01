# ✅ Codex 토큰 절감 가이드라인 (OBOON 프로젝트용)

> 목적: **불필요한 토큰 소모를 줄이고**, 한 번의 실행으로 문제를 정확히 해결한다.

---

## 0. 기본 원칙 (필수)

- **전체 파일 재출력 금지**
- **Diff / 수정 블록 중심 출력**
- **1회 요청 = 1개 목표**
- 설명은 **최소한**으로 (최대 6줄)

---

## 1. 출력 형식 규칙 (가장 중요)

### ✅ 허용되는 출력

- 변경된 **파일 경로**
- 수정 대상 **함수 / 컴포넌트 / 라인 범위**
- **변경된 코드 블록만** 출력
- 변경 이유 1~2줄

### ❌ 금지되는 출력

- 전체 파일 코드 재작성
- 장문의 배경 설명
- 동일 파일 반복 출력
- 요청하지 않은 개선 제안

---

## 2. 작업 단위 규칙

### ✅ 올바른 요청 예시

- “TS2322 타입 에러 해결”
- “ON CONFLICT 에러를 UNIQUE 제약으로 해결”
- “SectionStatus 타입 오류 수정”

### ❌ 잘못된 요청 예시

- “에러들 전부 고쳐줘”
- “UI랑 DB 같이 정리해줘”
- “리팩터링하면서 개선해줘”

---

## 3. 변경 범위 제한 규칙

### ✅ 반드시 명시할 것

- 수정 파일 경로
- 수정 범위 (함수 / 컴포넌트 / 라인)

**예시**

```

다음 파일만 수정:

* app/company/properties/[id]/specs/page.tsx

cancelSection 함수만 수정

```

### ❌ 금지

- 파일 분리
- 새 컴포넌트 생성
- 구조 리팩터링 (별도 요청에서만 허용)

---

## 4. 진단 방식 규칙 (추측 금지)

### ✅ 항상 실제 근거 확인

- DB 에러 → `information_schema.columns`로 컬럼 확인
- 타입 에러 → 실제 타입 선언 확인
- Next.js 에러 → 실제 파일 경로/임포트 확인

### ❌ 금지

- 컬럼명/테이블명 추측
- “아마 이런 구조일 것” 기반 수정

---

## 5. 응답 길이 제한 규칙

- 설명: **최대 6줄**
- 코드: **수정된 블록만**
- 체크리스트: 최소 1~2개

---

## 6. 반복 작업 최소화 규칙

### ✅ 허용

- 같은 원인 계열 에러(예: union key → never)를
  **같은 파일 내에서** 함께 해결

### ❌ 금지

- 연쇄 리팩터링
- 다른 파일로 수정 범위 확장

---

## 7. DB 작업 규칙 (Supabase)

### ✅ 고정 순서

1. 컬럼 확인

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'property_timeline';
```

2. 중복 데이터 확인
3. constraint 추가

### ✅ 해결 방식

- **A안 우선**: DB 제약으로 해결
- 코드 우회(B안) 금지 (명시 없을 시)

---

## 8. 최종 응답 템플릿 (Codex는 항상 이 형식 사용)

```
[Target]
- file: <path>
- scope: <function/component/lines>

[Change]
- <bullet 1~3>

[Patch]
- (modified code block only)

[Verify]
- pnpm typecheck
```

---

## 9. Codex 요청 프롬프트 예시 (복붙용)

### 타입 에러 해결

```
다음 파일만 수정:
- app/company/properties/[id]/specs/page.tsx

목표: TS2322 에러만 해결
출력은 수정 블록만
전체 파일 재출력 금지
```

### DB 에러 해결

```
Supabase property_timeline 저장 에러 해결
A안으로 진행: UNIQUE(properties_id) constraint 추가
코드 우회(B안) 금지
SQL만 출력
```
