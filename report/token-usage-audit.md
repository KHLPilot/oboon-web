## 🔍 Token Usage Audit Report

### Summary
- Total tokens defined: 101 (CSS 변수 66 + 유틸리티 클래스 35)
- Actively used: 69
- Unused (safe to remove): 0 (미사용 32개는 REVIEW로 분류)
- Self-referential only (candidate for review): 0

### 1️⃣ Unused CSS Variables
- `--briefing-bg-surface` — `app/globals.css:175`, `app/globals.css:257` — Suggested action: REVIEW (Briefing 전용 토큰으로 보이나 사용처 미탐지)
- `--briefing-text-title` — `app/globals.css:176`, `app/globals.css:258` — Suggested action: REVIEW (Briefing 전용 토큰으로 보이나 사용처 미탐지)
- `--briefing-text-body` — `app/globals.css:177`, `app/globals.css:259` — Suggested action: REVIEW (Briefing 전용 토큰으로 보이나 사용처 미탐지)
- `--briefing-text-muted` — `app/globals.css:178`, `app/globals.css:260` — Suggested action: REVIEW (Briefing 전용 토큰으로 보이나 사용처 미탐지)
- `--briefing-border` — `app/globals.css:179`, `app/globals.css:261` — Suggested action: REVIEW (Briefing 전용 토큰으로 보이나 사용처 미탐지)
- `--briefing-shadow` — `app/globals.css:180`, `app/globals.css:262` — Suggested action: REVIEW (Briefing 전용 토큰으로 보이나 사용처 미탐지)
- `--briefing-highlight-bg` — `app/globals.css:181`, `app/globals.css:263` — Suggested action: REVIEW (Briefing 전용 토큰으로 보이나 사용처 미탐지)
- `--card-bg-surface` — `app/globals.css:158`, `app/globals.css:242` — Suggested action: REVIEW (Card 전용 토큰으로 보이나 사용처 미탐지)
- `--card-bg-gradient-from` — `app/globals.css:159`, `app/globals.css:243` — Suggested action: REVIEW (Card 전용 토큰으로 보이나 사용처 미탐지)
- `--card-bg-gradient-to` — `app/globals.css:160`, `app/globals.css:244` — Suggested action: REVIEW (Card 전용 토큰으로 보이나 사용처 미탐지)
- `--card-text-title` — `app/globals.css:162`, `app/globals.css:246` — Suggested action: REVIEW (Card 전용 토큰으로 보이나 사용처 미탐지)
- `--card-text-body` — `app/globals.css:163`, `app/globals.css:247` — Suggested action: REVIEW (Card 전용 토큰으로 보이나 사용처 미탐지)
- `--card-text-muted` — `app/globals.css:164`, `app/globals.css:248` — Suggested action: REVIEW (Card 전용 토큰으로 보이나 사용처 미탐지)
- `--oboon-badge-selected-bg` — `app/globals.css:211`, `app/globals.css:298` — Suggested action: REVIEW (선택 상태 배지 토큰으로 보이나 사용처 미탐지)
- `--oboon-badge-selected-border` — `app/globals.css:216`, `app/globals.css:303` — Suggested action: REVIEW (선택 상태 배지 토큰으로 보이나 사용처 미탐지)
- `--oboon-map-shadow-default` — `app/globals.css:208`, `app/globals.css:295` — Suggested action: REVIEW (지도 전용 토큰으로 보이나 사용처 미탐지)
- `--oboon-map-shadow-strong` — `app/globals.css:209`, `app/globals.css:296` — Suggested action: REVIEW (지도 전용 토큰으로 보이나 사용처 미탐지)
- `--oboon-marker-stroke` — `app/globals.css:204`, `app/globals.css:287` — Suggested action: REVIEW (마커 시스템 파생 토큰, 동적 사용 가능성)
- `--oboon-warning-hover` — `app/globals.css:193`, `app/globals.css:273` — Suggested action: REVIEW (Warning 파생 토큰, 사용처 미탐지)

### 2️⃣ Unused Utility Classes
- `.btn-primary` — `app/globals.css:441`, `app/globals.css:446` — Suggested action: REVIEW (레거시 버튼 스타일, 사용처 미탐지)
- `.btn-secondary` — `app/globals.css:469`, `app/globals.css:475` — Suggested action: REVIEW (레거시 버튼 스타일, 사용처 미탐지)
- `.btn-submit` — `app/globals.css:450`, `app/globals.css:455` — Suggested action: REVIEW (레거시 버튼 스타일, 사용처 미탐지)
- `.btn-danger` — `app/globals.css:459`, `app/globals.css:465` — Suggested action: REVIEW (레거시 버튼 스타일, 사용처 미탐지)
- `.btn-save` — `app/globals.css:479`, `app/globals.css:484` — Suggested action: REVIEW (레거시 버튼 스타일, 사용처 미탐지)
- `.input-label` — `app/globals.css:435` — Suggested action: REVIEW (폼 라벨 유틸, 사용처 미탐지)
- `.input-readonly` — `app/globals.css:428` — Suggested action: REVIEW (폼 유틸, 사용처 미탐지)
- `.ob-alert-warning` — `app/globals.css:93` — Suggested action: REVIEW (경고 알림 변형, 사용처 미탐지)
- `.ob-typo-body2` — `app/globals.css:360` — Suggested action: REVIEW (타이포 유틸, 사용처 미탐지)
- `.ob-typo-nav` — `app/globals.css:375` — Suggested action: REVIEW (타이포 유틸, 사용처 미탐지)
- `.ob-typo-button` — `app/globals.css:382` — Suggested action: REVIEW (타이포 유틸, 사용처 미탐지)
- `.select-basic` — `app/globals.css:488` — Suggested action: REVIEW (폼 유틸, 사용처 미탐지)
- `.textarea-basic` — `app/globals.css:495` — Suggested action: REVIEW (폼 유틸, 사용처 미탐지)

### 3️⃣ Self-referential Tokens
- 없음

### 4️⃣ High-Risk Removals (Do NOT auto-delete)
- `--oboon-marker-stroke` — `app/components/NaverMap.tsx:354`에서 `var(--oboon-marker-${type})` 동적 참조; 타입 확장 시 바로 사용될 가능성 있음
- `--briefing-*` — Briefing 기능 영역이 존재하여 향후/외부 콘텐츠(예: CMS)에서 사용될 가능성
- `--card-*` — 카드 UI 계층 토큰으로 보이며, `--card-shadow`는 이미 사용 중; 나머지도 추후 테마링에 쓰일 수 있음
- `--oboon-badge-selected-*` — 선택 상태 배지 토큰은 상태 추가 시 바로 쓰일 수 있음
- 레거시/폼/타이포 유틸리티 클래스(`.btn-*`, `.input-*`, `.select-basic`, `.textarea-basic`, `.ob-typo-nav`, `.ob-typo-button`, `.ob-typo-body2`) — 동적 className 조합 또는 외부 문서/툴에서 사용할 위험

### 5️⃣ Cleanup Recommendations
- Safe-to-delete tokens (batch): 없음 (보수적으로 모두 REVIEW)
- Tokens to consolidate or rename: 레거시 `.btn-*` 세트를 `ob-btn` 시스템으로 정리/통합 고려
- Tokens that should be moved to a different layer: `--briefing-*`, `--card-*`, `--oboon-map-shadow-*`는 기능/컴포넌트 전용 레이어로 분리 검토
