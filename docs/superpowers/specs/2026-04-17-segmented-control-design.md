# SegmentedControl 컴포넌트 신규 생성

작성일: 2026-04-17

## 목적

단일 선택 상태를 표현하는 공통 세그먼트 컨트롤을 `components/ui`에 추가한다. 기존 탭/필터 버튼보다 더 밀도 있는 pill UI로, 옵션이 짧은 선택지 그룹에서 재사용할 수 있도록 한다.

## 요구사항

- 새 파일은 `components/ui/SegmentedControl.tsx`이다.
- props는 다음과 같다.
  - `options: { value: string; label: string; icon?: React.ReactNode }[]`
  - `value: string`
  - `onChange: (value: string) => void`
- 컨테이너는 둥근 pill 형태의 배경을 가진다.
  - 배경색: `bg-(--oboon-bg-subtle)`
  - 내부 옵션은 한 줄로 나란히 배치한다.
- 선택된 옵션 아래에는 슬라이딩 indicator가 있다.
  - 배경색: `bg-(--oboon-bg-surface)`
  - 그림자: `shadow-sm`
  - 모양: `rounded-full`
  - 애니메이션: `transition-transform`
- 미선택 옵션은 `text-(--oboon-text-muted)`를 사용한다.
- 선택된 옵션은 `text-(--oboon-text-title)`와 `font-medium`을 사용한다.
- 옵션에 `icon`이 있으면 라벨 왼쪽에 표시한다.
- Tailwind CSS만 사용한다.
- TypeScript strict 기준을 통과해야 한다.

## 레이아웃 규칙

- 옵션은 자동 폭으로 렌더링한다.
- 줄바꿈은 허용하지 않는다.
- 한 줄에 다 들어가지 않는 경우에는 가로 스크롤로 처리한다.
- indicator는 선택된 버튼의 실제 위치와 너비를 기준으로 계산한다.

## 구현 방향

- 컴포넌트는 client component로 만든다.
- `useRef`로 루트와 각 옵션 버튼을 추적한다.
- `useLayoutEffect`로 선택된 옵션의 `offsetLeft`와 `offsetWidth`를 측정한다.
- `ResizeObserver` 또는 창 resize 이벤트로 재측정해서 indicator 위치를 갱신한다.
- indicator는 `absolute` 레이어로 두고 `transform: translateX(...)`로 이동시킨다.
- 옵션 버튼은 indicator 위에 표시되도록 z-index를 분리한다.

## 접근성

- 각 옵션은 `button type="button"`으로 렌더링한다.
- 선택 상태는 `aria-pressed`로 노출한다.
- 외부 라이브러리 없이 기본 포커스 동작을 유지한다.

## 테스트/검증

- TypeScript 타입 체크를 통과해야 한다.
- indicator가 선택 변경 시 이동하는지 확인한다.
- 아이콘 유무와 옵션 수 변화에도 레이아웃이 깨지지 않는지 확인한다.

## 완료 기준

- [ ] `components/ui/SegmentedControl.tsx`가 추가된다.
- [ ] 옵션은 한 줄로 표시되고 자동 폭을 따른다.
- [ ] 선택된 항목 아래 indicator가 부드럽게 이동한다.
- [ ] 아이콘 옵션이 정상 렌더링된다.
- [ ] `pnpm typecheck`를 통과한다.
