# CONTRIBUTING.md

이 문서는 팀원, AI 도구, 미래의 나 모두가
**같은 기준으로 작업**하기 위한 실무 가이드다.

---

## 1. 작업 시작 전 체크리스트

- [ ] 작업 도메인이 명확한가?
- [ ] 해당 도메인의 `features/<domain>/domain`을 확인했는가?
- [ ] 유사한 패턴이 이미 존재하는가?

---

## 2. 파일 위치 판단 기준

| 질문                  | YES           | NO         |
| --------------------- | ------------- | ---------- |
| 도메인 의미를 아는가? | features      | components |
| DB 접근인가?          | services      | ❌         |
| row → 가공인가?       | mappers       | ❌         |
| 정책/라벨/상수인가?   | domain        | ❌         |
| 순수 UI 조각인가?     | components/ui | ❌         |

---

## 3. page.tsx 작성 규칙

### 허용

- 섹션 구성
- 상태 조합
- 결과 렌더링

### 금지

- Supabase 직접 호출
- normalize/guard 로직
- row 가공

---

## 4. 새 도메인 추가 절차

1. `features/<domain>/` 생성
2. `domain/services/mappers/components` 생성
3. offerings/community 구조 참고
4. index.ts 배럴 export 추가

---

## 5. Codex 사용 규칙

- 구조 변경 시 **자동화 프롬프트 필수**
- 임의 파일 이동 금지
- domain 외부에 정책 추가 금지

---

## 6. PR 완료 기준

- [ ] pnpm build 통과
- [ ] pnpm typecheck 통과
- [ ] SSOT 외 문자열 사용 없음
- [ ] 동일 패턴 중복 생성 없음

---
