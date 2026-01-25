# Guideline.md

## OBOON의 목적

OBOON은 분양을 추천하지 않는다.  
**판단 기준을 제공하는 플랫폼**이다.

---

## UI 철학

- 광고처럼 보이지 않기
- 데이터 중심
- 카드 기반 정보 구조
- 초보자도 이해 가능

---

## 디자인 시스템

- Tailwind CSS v4
- CSS Variables 기반 토큰
- 라이트/다크 완전 대응

### 금지

- 하드코딩 색상
- Tailwind v4 외 문법
- 토큰 외 색상 사용

---

## Button / Badge / Card

- Button: ob-btn 규격만 사용
- Badge: 의미 기반 variant만 허용
- Card: 도메인별 feature에서 관리

---

## 레이아웃

- Sticky Footer 패턴
- globals.css는 Root layout에서만 import
- 하위 layout에서 html/body 금지

---
