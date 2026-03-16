# OBOON 브랜드 & 톤 가이드

> 이 문서는 OBOON(오늘의 분양) 서비스의 시각적 정체성과 커뮤니케이션 원칙을 정의한다.
> UI 개발, 디자인 시스템 확장, 콘텐츠 작성 시 이 문서를 기준으로 삼는다.

---

## 목차

1. [브랜드 정체성](#1-브랜드-정체성)
2. [색상 팔레트 & 토큰](#2-색상-팔레트--토큰)
3. [타이포그래피](#3-타이포그래피)
4. [컴포넌트 스타일](#4-컴포넌트-스타일)
5. [텍스트 톤 & 보이스](#5-텍스트-톤--보이스)
6. [레이아웃 & 간격](#6-레이아웃--간격)
7. [아이콘 & 이미지](#7-아이콘--이미지)
8. [다크/라이트 테마](#8-다크라이트-테마)

---

## 1. 브랜드 정체성

### 서비스 소개

**OBOON(오늘의 분양)**은 역할 기반(관리자/상담사/회사/고객) 분양 플랫폼이다.
복잡한 분양 프로세스를 누구나 쉽게 이해하고 신뢰할 수 있도록 돕는 것이 핵심 가치다.

### 핵심 가치

| 가치 | 설명 |
|------|------|
| **신뢰** | 정확한 정보, 투명한 프로세스, 검증된 조건 |
| **접근성** | 누구나 쉽게 이해할 수 있는 UI와 언어 |
| **전문성** | 분양 도메인 특화 기능과 전문적인 상담 경험 |
| **속도** | 빠른 검색, 즉각적인 피드백, 효율적인 상담 흐름 |

### 시각적 방향성

- **Dark-first**: 기본 테마는 다크. 시각적 피로를 줄이고 집중도 향상
- **신중함**: 과도한 애니메이션보다 안정적이고 예측 가능한 UI
- **데이터 중심**: 숫자·상태·조건이 명확하게 보이는 레이아웃

---

## 2. 색상 팔레트 & 토큰

모든 색상은 CSS 변수(`--oboon-*`)로 정의되며, 컴포넌트는 직접 hex값 대신 토큰을 참조한다.

### 2-1. 배경

| 토큰 | Dark | Light | 용도 |
|------|------|-------|------|
| `--oboon-bg-default` | `#0b0c10` | `#f3f5f9` | 페이지 기본 배경 |
| `--oboon-bg-surface` | `#0f1117` | `#ffffff` | 카드·모달·입력 표면 |
| `--oboon-bg-subtle` | `rgba(255,255,255,0.06)` | `rgba(15,23,42,0.06)` | 미묘한 구분, 비활성 배경 |

### 2-2. 텍스트

| 토큰 | Dark | Light | 용도 |
|------|------|-------|------|
| `--oboon-text-title` | `rgba(255,255,255,0.92)` | `#0f172a` | 제목, 강조 텍스트 |
| `--oboon-text-body` | `rgba(255,255,255,0.82)` | `#1f2937` | 본문 |
| `--oboon-text-muted` | `rgba(255,255,255,0.6)` | `#475569` | 보조 텍스트, 힌트, 플레이스홀더 |

### 2-3. 테두리

| 토큰 | Dark | Light | 용도 |
|------|------|-------|------|
| `--oboon-border-default` | `rgba(255,255,255,0.1)` | `rgba(15,23,42,0.1)` | 카드·입력 기본 테두리 |
| `--oboon-border-strong` | `rgba(255,255,255,0.2)` | `rgba(15,23,42,0.2)` | 포커스·강조 테두리 |

### 2-4. 브랜드 & 인터랙션

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--oboon-primary` | `#5b8cff` (Dark) / `#2563eb` (Light) | 주요 CTA, 강조, 링크 |
| `--oboon-primary-hover` | `#1d4fe0` | Primary 호버 상태 |

> **Primary = #5b8cff** (다크 기준)
> 블루 계열로 신뢰감·전문성을 표현한다. 과도하게 사용하지 않는다.

### 2-5. 시맨틱 (피드백)

| 의미 | 메인 색 | 배경 | 테두리 | 텍스트 |
|------|---------|------|--------|--------|
| **Safe (성공·안전)** | `#22c55e` | `rgba(34,197,94,0.12)` | `rgba(34,197,94,0.35)` | `#4ade80` |
| **Warning (주의)** | `#f59e0b` | `rgba(245,158,11,0.12)` | `rgba(245,158,11,0.35)` | `#fbbf24` |
| **Danger (위험·에러)** | `#ef4444` | `rgba(239,68,68,0.12)` | `rgba(239,68,68,0.35)` | `#f87171` |

### 2-6. 조건 평가 (분양 특화)

분양 조건 충족 여부를 3단계로 표시한다.

| 등급 | 의미 | 색상 |
|------|------|------|
| `GREEN` | 조건 충족 | Safe 계열 |
| `YELLOW` | 부분 충족·검토 필요 | Warning 계열 |
| `RED` | 조건 미충족 | Danger 계열 |

### 2-7. 그림자

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--oboon-shadow-card` | `0 10px 30px rgba(0,0,0,0.35)` (Dark) | 카드·모달 |
| `--oboon-overlay` | `rgba(0,0,0,0.6)` (Dark) | 모달 배경 오버레이 |

### 2-8. 로고

| 테마 | 색상 |
|------|------|
| Dark | `#ffffff` |
| Light | `var(--oboon-primary)` |

로고는 `<img>` 대신 CSS `mask-image` 방식으로 구현한다. 색상을 테마에 따라 동적으로 교체할 수 있다.

```css
.oboon-logo {
  width: 22px;
  height: 22px;
  mask-image: url("/logo.svg");
  mask-size: contain;
  mask-repeat: no-repeat;
  /* Dark: background-color: #ffffff */
  /* Light: background-color: var(--oboon-primary) */
}
```

- SVG를 직접 `src`로 넣으면 fill 색상을 CSS로 제어할 수 없다.
- 로고 컴포넌트는 `components/` 공용 영역에 위치한다.

---

## 3. 타이포그래피

### 3-1. 폰트 패밀리

**SUIT** (로컬 woff2, `/public/fonts/suit/`)

- 지원 굵기: 100(Thin) · 200 · 300 · 350 · 400(Regular) · 500(Medium) · 600(SemiBold) · 700(Bold) · 800 · 900(Heavy)
- CSS 변수: `--oboon-font-family-base: "SUIT"`
- 폴백: `sans-serif`

### 3-2. 사이즈 & 역할

| 클래스 | 크기 | 굵기 | Line-Height | 용도 |
|--------|------|------|-------------|------|
| `.ob-typo-display` | 70px (모바일 32px) | 700 | 1.2 | 히어로 제목 |
| `.ob-typo-h1` | 32px (모바일 24px) | 700 | 1.2 | 페이지 제목 |
| `.ob-typo-h2` | 24px (모바일 20px) | 600 | 1.2 | 섹션 제목 |
| `.ob-typo-h3` | 20px (모바일 18px) | 600 | 1.2 | 서브 제목 |
| `.ob-typo-subtitle` | 16px | 500 | 1.5 | 강조 본문, 라벨 |
| `.ob-typo-body` | 15px | 400 | 1.5 | 일반 본문 |
| `.ob-typo-body2` | 15px | 500 | 1.5 | 강조 본문 |
| `.ob-typo-caption` | 13px | 500 | 1.5 | 주석, 뱃지, 보조 라벨 |
| `.ob-typo-button` | 16px | 400 | 1.2 | 버튼 라벨 |
| `.ob-typo-nav` | 16px | 500 | 1.2 | 네비게이션 |

### 3-3. 레터 스페이싱

| 용도 | 값 |
|------|-----|
| 제목 | `-0.01em` (tight) |
| 기본 | `0em` |
| 버튼 라벨 | `0.02em` (wide) |

### 3-4. 사용 규칙

- 직접 `font-size`, `font-weight` Tailwind 클래스보다 `.ob-typo-*` 클래스를 우선 사용한다.
- 텍스트 색상은 `text-oboon-text-title` / `text-oboon-text-body` / `text-oboon-text-muted` 중 선택한다.
- 임의 색상(`text-gray-400` 등)은 사용하지 않는다.

---

## 4. 컴포넌트 스타일

모든 컴포넌트는 `components/ui/`에 위치하며, 직접 스타일 재정의 대신 variant prop으로 제어한다.

### 4-1. Button

```
위치: components/ui/Button.tsx
```

| Variant | 배경 | 텍스트 | 용도 |
|---------|------|--------|------|
| `primary` | `--oboon-primary` | 흰색 | 주요 액션 CTA |
| `secondary` | `--oboon-bg-subtle` + 테두리 | `--oboon-text-title` | 보조 액션 |
| `ghost` | 투명 | `--oboon-text-title` | 낮은 강조 액션 |
| `danger` | `--oboon-danger` | 흰색 | 위험한 액션 (삭제 등) |
| `warning` | warning 배경 | warning 텍스트 | 주의 요구 액션 |

| Size | 높이 | 패딩 |
|------|------|------|
| `sm` | 32px | px-3 |
| `md` | 40px | px-4 |
| `lg` | 44px | px-5 |

**모서리**: `rounded-xl` (기본) / `rounded-full` (pill)
**비활성**: `opacity-50 pointer-events-none`
**포커스**: `focus-visible:ring-2 focus-visible:ring-oboon-accent/30`

### 4-2. Card

```
위치: components/ui/Card.tsx
```

```
rounded-2xl (16px)
border border-oboon-border-default
bg-oboon-bg-surface
shadow: 0 10px 30px rgba(0,0,0,0.35)
```

- 호버 시: `group-hover:-translate-y-0.5` (카드 살짝 올림)
- 카드 내 이미지: `group-hover:scale-[1.03]` (미묘한 줌)
- `aspect-video` 비율로 이미지 영역 고정

### 4-3. Input & Textarea

```
높이: 44px (h-11)
모서리: rounded-xl
테두리: border border-oboon-border-default
배경: bg-oboon-bg-surface
패딩: px-3
텍스트: ob-typo-body text-oboon-text-body
포커스: focus-visible:ring-2 focus-visible:ring-oboon-accent/30
비활성: bg-oboon-bg-subtle
```

- Textarea 최소 높이: `112px (min-h-28)`, 패딩: `px-3 py-2`
- 플레이스홀더: `text-oboon-text-muted`

### 4-4. Badge

```
형태: inline-flex rounded-full px-2.5 py-1
텍스트: 12px font-medium
```

| Variant | 배경 | 테두리 | 텍스트 |
|---------|------|--------|--------|
| `default` | `--oboon-bg-surface` | `--oboon-border-default` | 기본 |
| `status` | `--oboon-bg-subtle` | `--oboon-border-default` | muted |
| `success` | `--oboon-safe` | — | 흰색 |
| `primary` | `--oboon-primary` | — | 흰색 |
| `warning` | warning 배경 | warning 테두리 | warning 텍스트 |
| `danger` | danger 배경 | danger 테두리 | danger 텍스트 |

### 4-5. Modal

```
위치: components/ui/Modal.tsx
```

| Size | 너비 |
|------|------|
| `sm` | `min(100%-2rem, 420px)` |
| `md` | `min(100%-2rem, 480px)` |
| `lg` | `min(100%-2rem, 560px)` |

```
모서리: rounded-2xl
테두리: border border-oboon-border-default
배경: bg-oboon-bg-surface
패딩: px-4 pb-4 pt-6 (sm: p-6)
최대 높이: calc(100dvh - 2rem), overflow-y-auto
배경 오버레이: bg-oboon-overlay backdrop-blur
z-index: 1000
```

- 닫기 버튼: 우상단 고정, `rounded-full`
- 헤더 구조: 제목(`ob-typo-h2`) + 닫기 버튼

### 4-6. Toast

```
위치: fixed bottom-4 right-4
너비: 320px (최대 calc(100vw - 2rem))
모서리: rounded-2xl
테두리 + 그림자 + backdrop-blur
z-index: 1100
```

| 타입 | 도트 색상 | 자동 닫힘 |
|------|---------|---------|
| `success` | Primary 파랑 | 2500ms |
| `info` | Muted 회색 | 2500ms |
| `warning` | Warning 주황 | 3000ms |
| `error` | Danger 빨강 | 3500ms |

---

## 5. 텍스트 톤 & 보이스

### 5-1. 핵심 원칙

| 원칙 | 설명 |
|------|------|
| **명확하게** | 분양 용어라도 누구나 이해할 수 있게 풀어 쓴다 |
| **간결하게** | 핵심 정보만. 불필요한 수식어를 제거한다 |
| **신뢰있게** | 과장하거나 불확실한 표현을 피한다 |
| **친근하게** | 딱딱하지 않되, 가볍지 않게 |

### 5-2. 버튼 라벨

- **Primary CTA**: 동사로 시작, 액션 중심
  - ✅ "예약하기", "상담 신청", "현장 보기", "조건 확인"
  - ❌ "클릭", "확인하십시오", "OK"
- **Secondary**: 대안·취소 액션
  - ✅ "취소", "나중에", "건너뛰기"
- **Danger**: 위험성을 명확히 전달
  - ✅ "삭제", "탈퇴", "승인 취소"
  - ❌ "진행" (위험한 액션인데 모호한 표현)

### 5-3. 안내 문구

| 상황 | 톤 | 예시 |
|------|-----|------|
| 정상 | 중립·간결 | "예약이 완료되었습니다." |
| 에러 | 공감 + 해결 방향 | "오류가 발생했습니다. 잠시 후 다시 시도해 주세요." |
| 경고 | 명확 + 이유 | "이 작업은 되돌릴 수 없습니다. 계속하시겠습니까?" |
| 빈 상태 | 친근 + 행동 유도 | "아직 예약이 없어요. 현장을 둘러볼까요?" |
| 로딩 | 현재 진행 명시 | "정보를 불러오는 중..." |

### 5-4. 피드백 메시지 패턴

```
성공: "[주체/대상]이 [완료 상태]되었습니다."
  예) "예약이 완료되었습니다."

경고: "[상황]. [해결 방법]."
  예) "입력하지 않은 항목이 있습니다. 모든 필드를 채워 주세요."

오류: "오류가 발생했습니다. [가능한 경우 이유 또는 해결 방법]."
  예) "오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
```

### 5-5. 분양 도메인 표현

| 영역 | 권장 표현 | 피할 표현 |
|------|---------|---------|
| 상담 요청 | "상담 신청", "상담하기" | "문의" (너무 광범위) |
| 방문 확인 | "방문 인증", "QR 스캔" | "체크인" (플랫폼 혼동) |
| 현장 정보 | "분양 현장", "현장" | "매물", "물건" (주택 거래 혼동) |
| 조건 충족 | "조건 충족", "조건 적합" | "합격", "통과" |
| 조건 미충족 | "조건 검토 필요", "조건 미충족" | "불합격", "탈락" |

### 5-6. 상태 표시 문구

| 상태 | 텍스트 | 색상 |
|------|--------|------|
| 진행 중 | "진행 중" | Primary |
| 완료 | "완료" | Safe |
| 취소 | "취소됨" | Muted |
| 대기 | "검토 중" | Warning |
| 거절 | "거절됨" | Danger |

---

## 6. 레이아웃 & 간격

### 6-1. 헤더

- 높이: `64px`
- 포지션: Fixed, 최상단
- Z-index: `60`
- 배경: `bg-oboon-bg-surface/90 backdrop-blur-[12px]`

### 6-2. 콘텐츠 너비

- 기본 최대 너비: `960px`
- 넓은 레이아웃: `1200px`
- 좌우 패딩: `16px` (모바일) → `32px` (데스크탑)

### 6-3. 반응형 브레이크포인트

| 포인트 | 너비 | 대상 |
|--------|------|------|
| 기본 | 0px~ | 모바일 우선 |
| `sm` | 640px~ | 소형 태블릿 |
| `md` | 768px~ | 태블릿 |
| `lg` | 1024px~ | 데스크탑 |
| `xl` | 1280px~ | 와이드 |

### 6-4. 간격 체계

| 용도 | 값 |
|------|-----|
| 아이콘 간격 | `gap-2` (8px) |
| 카드 그리드 | `gap-4` ~ `gap-6` (16~24px) |
| 섹션 내부 패딩 | `p-4` (compact) ~ `p-6` (spacious) |
| 입력 필드 사이 | `gap-3` ~ `gap-4` |

### 6-5. Z-Index 계층

| 레이어 | 값 |
|--------|-----|
| 드롭다운 | 50 |
| 헤더 | 60 |
| 모달 | 1000 |
| 토스트 | 1100 |

---

## 7. 아이콘 & 이미지

### 7-1. 아이콘 라이브러리

**lucide-react** (v0.555.0)

```tsx
import { Calendar, MapPin, ChevronDown } from "lucide-react";

// 기본 사이즈: w-4 h-4 (16px)
// 강조 사이즈: w-5 h-5 (20px)
// 큰 아이콘: w-6 h-6 (24px)
```

### 7-2. 아이콘 색상

- 기본: 부모 텍스트 색상 상속
- 보조: `text-oboon-text-muted`
- 강조: `text-oboon-primary`
- 위험: `text-oboon-danger`

### 7-3. 이미지

- 카드 썸네일: `aspect-video` 비율 고정
- 빈 이미지 영역 배경: `bg-oboon-bg-subtle`
- Next.js `<Image>` 컴포넌트 사용 필수 (최적화)
- 호버 줌: `group-hover:scale-[1.03] transition-transform`

---

## 8. 다크/라이트 테마

### 8-1. 기본값

- **기본 테마: Dark**
- localStorage key: `"oboon-theme"` / 값: `"dark"` | `"light"`
- HTML 속성: `document.documentElement.dataset.theme`

### 8-2. 전환 방식

```javascript
// 테마 적용
document.documentElement.dataset.theme = "light"; // or "dark"
localStorage.setItem("oboon-theme", "light");

// CSS에서
:root { /* Dark 기본값 */ }
:root[data-theme="light"] { /* Light 오버라이드 */ }
```

### 8-3. 주요 토큰 전환값

| 토큰 | Dark | Light |
|------|------|-------|
| `--oboon-bg-default` | `#0b0c10` | `#f3f5f9` |
| `--oboon-bg-surface` | `#0f1117` | `#ffffff` |
| `--oboon-text-title` | `rgba(255,255,255,0.92)` | `#0f172a` |
| `--oboon-text-muted` | `rgba(255,255,255,0.6)` | `#475569` |
| `--oboon-primary` | `#5b8cff` | `#2563eb` |
| `--oboon-shadow-card` | `0 10px 30px rgba(0,0,0,0.35)` | `0 10px 26px rgba(15,23,42,0.1)` |

### 8-4. 지도 테마

지도 시각화는 별도의 색상 시스템을 사용한다.

- **Dark 지도 배경**: `#1b2130`
- **Light 지도 배경**: `#edf0f9`
- 지도 컴포넌트는 반드시 현재 테마를 감지하여 색상을 교체한다.

**지도 마커 색상 토큰:**

| 토큰 | 색상 | 의미 |
|------|------|------|
| `--oboon-marker-ready` | `#22c55e` | 분양 예정 (Safe 계열) |
| `--oboon-marker-open` | `#5b8cff` | 분양 중 (Primary 계열) |
| `--oboon-marker-closed` | `#ef4444` | 분양 종료 (Danger 계열) |

```css
/* 예시: 상태에 따라 마커 색상 선택 */
color: var(--oboon-marker-open);
```

---

## 9. 컴포넌트 전용 토큰

일부 섹션은 독립적인 토큰 네임스페이스를 가진다. 해당 섹션 내부에서만 사용한다.

### 브리핑 섹션

| 토큰 | 용도 |
|------|------|
| `--briefing-bg-surface` | 브리핑 카드 배경 |
| `--briefing-text-title` | 브리핑 제목 색상 |
| `--briefing-highlight-bg` | 하이라이트 배경 |

### 카드 (offerings 등)

| 토큰 | 용도 |
|------|------|
| `--card-bg-surface` | 카드 배경 |
| `--card-bg-gradient-from` | 카드 그라디언트 시작 |
| `--card-text-title` | 카드 제목 색상 |

> 범용 `--oboon-*` 토큰이 아니라 이 섹션 토큰으로 스타일을 확장할 때는 해당 섹션에서만 사용한다. 다른 곳에 재사용하지 않는다.

---

## 10. 유틸리티 클래스

`app/globals.css`에 정의된 프로젝트 전용 유틸리티.

| 클래스 | 용도 |
|--------|------|
| `.scrollbar-none` | 스크롤바 숨김 (Webkit + Firefox + IE 크로스브라우저) |
| `.safe-area-top` | iOS 상단 notch 대응 (`padding-top: env(safe-area-inset-top)`) |
| `.safe-area-bottom` | iOS 하단 홈바 대응 (`padding-bottom: env(safe-area-inset-bottom)`) |
| `.animate-slide-in-right` | 우측에서 좌측으로 슬라이드 인 (0.3s ease) |

```tsx
// 드로어, 사이드 패널, 채팅 등에서 사용
<div className="scrollbar-none overflow-y-auto">...</div>
<div className="safe-area-bottom pb-4">...</div>
<div className="animate-slide-in-right">...</div>
```

---

## 참고 파일

| 역할 | 경로 |
|------|------|
| CSS 변수 & 타이포 클래스 | `app/globals.css` |
| 공통 UI 컴포넌트 | `components/ui/` |
| Tailwind 설정 | `tailwind.config.ts` |
| 폰트 파일 | `public/fonts/suit/*.woff2` |
| 레이아웃 | `app/layout.tsx` |
