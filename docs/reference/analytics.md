# GA 커스텀 이벤트 추가 방법

이미 `lib/analytics.ts`에 `trackEvent` 유틸 함수가 만들어져 있습니다.
추적하고 싶은 버튼에 아래처럼 한 줄만 추가하면 됩니다.

## 사용법

1. import 추가

```ts
import { trackEvent } from "@/lib/analytics";
```

2. 버튼의 onClick에 trackEvent 호출 추가

```tsx
<button
  onClick={() => {
    trackEvent("reservation_click", { property_id: "123" });
    // 기존 로직 그대로 유지
  }}
>
  예약하기
</button>
```

## trackEvent 파라미터

- 첫 번째: 이벤트 이름 (영문 snake_case, 예: "reservation_click")
- 두 번째: 추가 데이터 (선택, 예: { property_id: "123", agent_id: "abc" })

## 이벤트 이름 컨벤션 (예시)

- reservation_click — 예약 버튼 클릭
- consultation_request — 상담 신청
- property_view — 분양 상세 조회
- login_click — 로그인 버튼 클릭
- signup_complete — 회원가입 완료

## 확인 방법

1. 브라우저 DevTools(F12) → Network 탭 → "collect" 필터
2. 버튼 클릭 시 collect?v=2 요청이 나가면 성공
3. GA 대시보드 → 실시간 → 이벤트 탭에서 이벤트명 확인

## 참고

- 페이지 조회는 `app/layout.tsx`에서 자동 수집되므로 별도 작업 불필요
- Clarity(히트맵/세션녹화)도 `app/layout.tsx`에 이미 적용됨
- `trackEvent`는 클라이언트 컴포넌트(`"use client"`)에서만 동작
