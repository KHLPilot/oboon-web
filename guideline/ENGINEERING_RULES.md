# ENGINEERING_RULES.md

본 문서는 반드시 지켜야 할 **엔지니어링 최소 규칙**을 정의한다.

---

## Must

- Supabase 접근은 services에서만
- page.tsx에서 DB 접근 금지
- UI는 components/ui, components/shared 우선 사용
- 모든 페이지는 PageContainer 사용
- pnpm만 사용
- build / typecheck / lint 통과 필수
- 오류는 사용자에게 반드시 노출

---

## Should

- 재사용 가능한 UI는 공용화 검토
- 데이터 로드와 변환 분리
- 디자인 토큰 우선 사용
- 컴포넌트 단일 책임 유지

---

## Exceptions

- 예외는 PR에 명시 + 합의 필요

---
