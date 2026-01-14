# /components/ui SSOT 준수 감사 리포트 (OBOON)

## 범위
- 대상: `components/ui/*`
- 기준: `app/globals.css` SSOT 타이포/컬러 토큰

## 요약
- A(타이포 우회): 7건
- B(컬러 우회/인라인 스타일): 24건
- C(레거시 클래스): 없음

---

## A) Typography bypass

| file path | category | matched line (exact snippet) | SSOT 대체 권장안 |
| --- | --- | --- | --- |
| `components/ui/Label.tsx:12` | A | `"text-sm font-medium text-(--oboon-text-title)"` | `ob-typo-caption` + `text-(--oboon-text-title)` |
| `components/ui/Label.tsx:13` | A | `"leading-none"` | 제거하고 `ob-typo-*` line-height 사용 |
| `components/ui/Input.tsx:13` | A | `"... px-4 py-3 text-sm ..."` | `ob-typo-body` |
| `components/ui/DropdownMenu.tsx:245` | A | `"w-full px-3 py-2 text-left text-sm"` | `ob-typo-body` 또는 `ob-typo-nav` |
| `components/ui/Badge.tsx:37` | A | `"text-[12px] font-medium"` | `ob-typo-caption` (필요 시 `ob-typo-body2`) |
| `components/ui/Toast.tsx:143` | A | `className="text-[13px] font-semibold"` | `ob-typo-body2` (제목 용도) |
| `components/ui/Toast.tsx:149` | A | `className="mt-0.5 text-[13px]"` | `ob-typo-body` 또는 `ob-typo-caption` |
| `components/ui/Toast.tsx:157` | A | `className="... text-[12px] ..."` | `ob-typo-caption` |

---

## B) Color/token bypass

| file path | category | matched line (exact snippet) | SSOT 대체 권장안 |
| --- | --- | --- | --- |
| `components/ui/Button.tsx:22` | B | `"bg-[var(--oboon-accent,#2563eb)]"` | `bg-(--oboon-primary)` 또는 `bg-(--oboon-accent)` (토큰 정립) |
| `components/ui/Button.tsx:23` | B | `"text-[var(--oboon-on-accent,#ffffff)]"` | `text-(--oboon-on-primary)` 등 온컬러 토큰 사용 |
| `components/ui/Button.tsx:25` | B | `"border border-[var(--oboon-accent,#2563eb)]"` | `border-(--oboon-primary)` 또는 `border-(--oboon-accent)` |
| `components/ui/Button.tsx:40` | B | `"bg-[var(--oboon-danger)] text-white"` | `bg-(--oboon-danger)` + `text-(--oboon-on-danger)` |
| `components/ui/Button.tsx:41` | B | `"hover:bg-[var(--oboon-danger-hover)]"` | `hover:bg-(--oboon-danger-hover)` |
| `components/ui/Button.tsx:42` | B | `"border border-[var(--oboon-danger)]"` | `border-(--oboon-danger)` |
| `components/ui/Button.tsx:47` | B | `"bg-[var(--oboon-warning-bg)]"` | `bg-(--oboon-warning-bg)` |
| `components/ui/Button.tsx:48` | B | `"text-[var(--oboon-warning-text)]"` | `text-(--oboon-warning-text)` |
| `components/ui/Button.tsx:49` | B | `"border border-[var(--oboon-warning-border)]"` | `border-(--oboon-warning-border)` |
| `components/ui/Button.tsx:50` | B | `"hover:bg-[var(--oboon-warning-bg-subtle)]"` | `hover:bg-(--oboon-warning-bg-subtle)` |
| `components/ui/Button.tsx:135` | B | `"border-2 border-white/30 border-t-white/80"` | 스피너 컬러 토큰화 (`--oboon-spinner-ring`, `--oboon-spinner-head` 등) |
| `components/ui/DropdownMenu.tsx:247` | B | `? "text-red-300 hover:bg-red-500/10"` | `text-(--oboon-danger)` + `hover:bg-(--oboon-danger-bg)` |
| `components/ui/Modal.tsx:54` | B | `className="... bg-black/60 ..."` | 오버레이 토큰(예: `bg-(--oboon-overlay)`) |
| `components/ui/Toast.tsx:128` | B | `backgroundColor: s.bg` | 인라인 제거 → variant별 토큰 클래스 사용 |
| `components/ui/Toast.tsx:136` | B | `style={{ backgroundColor: s.dot }}` | 인라인 제거 → variant별 토큰 클래스 사용 |
| `components/ui/Toast.tsx:144` | B | `style={{ color: s.title }}` | 인라인 제거 → `text-(--oboon-text-title)` 기반 클래스 |
| `components/ui/Toast.tsx:149` | B | `style={{ color: s.body }}` | 인라인 제거 → `text-(--oboon-text-body)` |
| `components/ui/Toast.tsx:158` | B | `style={{ color: "var(--oboon-text-muted)" }}` | `text-(--oboon-text-muted)` 클래스 |
| `components/ui/DatePicker.tsx:295` | B | `color: var(--oboon-text-body);` | CSS를 전역/모듈로 이동 후 토큰 클래스화 |
| `components/ui/DatePicker.tsx:305` | B | `color: var(--oboon-text-title);` | 동일 |
| `components/ui/DatePicker.tsx:314` | B | `color: var(--oboon-text-body);` | 동일 |
| `components/ui/DatePicker.tsx:334` | B | `color: var(--oboon-on-primary, #fff);` | 온컬러 토큰 클래스 사용 |
| `components/ui/DatePicker.tsx:346` | B | `border-color: var(--oboon-text-muted);` | 토큰 클래스 사용 |
| `components/ui/DatePicker.tsx:351` | B | `border-color: var(--oboon-text-title);` | 토큰 클래스 사용 |

---

## C) Legacy classes
- 없음

---

## Fix Plan (우선순위 Top 5)
1) `components/ui/Button.tsx` — 색상 토큰 표준화 + 스피너 컬러 토큰화
2) `components/ui/Input.tsx` — `text-sm` 제거, `ob-typo-body` 적용
3) `components/ui/Label.tsx` — `text-sm/leading-none` 제거, `ob-typo-caption` 적용
4) `components/ui/DropdownMenu.tsx` — 메뉴 텍스트 `ob-typo-body`, destructive 컬러 토큰화
5) `components/ui/Toast.tsx` — 인라인 색상 제거, variant별 토큰 클래스화

추가 고려(다음 단계): `components/ui/DatePicker.tsx`, `components/ui/Modal.tsx`
