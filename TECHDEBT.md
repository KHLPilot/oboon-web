# TECHDEBT

## Summary
- as unknown as: 3 occurrences
- as any: 0 occurrences
- eslint-disable: 12 occurrences

## Inventory

| Pattern | File | Line | Reason | Removal method | Priority |
| --- | --- | --- | --- | --- | --- |
| as unknown as | components/ui/DatePicker.tsx | 50 | Cast React DatePicker to a looser component type to bypass union prop conflicts. | Add a typed wrapper that explicitly picks allowed props per mode, or overload the component types to avoid casting. | P2 |
| as unknown as | components/ui/DatePicker.tsx | 183 | Cast assembled props object to NativeDatePickerProps to satisfy strict typing. | Build a strictly-typed props object (Pick/omit), or split by feature flags and pass only allowed props. | P2 |
| as unknown as | app/offerings/[id]/page.tsx | 41 | Supabase response is cast to PropertyRow without validation. | Introduce a mapper/guard in services and return typed data, or validate with zod. | P1 |
| eslint-disable @typescript-eslint/no-require-imports | scripts/ssot-check.js | 1 | Node script uses CommonJS `require`. | Convert to ESM `import` or add an ESLint override for `scripts/*.js` / rename to `.cjs`. | P3 |
| eslint-disable @next/next/no-img-element | features/briefing/briefing.ui.tsx | 34 | Uses `<img>` for cover image. | Replace with `next/image` or a shared Image wrapper. | P3 |
| eslint-disable react-hooks/set-state-in-effect | components/ui/PercisionDateInput.tsx | 59 | Syncs precision state from value inside effect. | Derive precision from props (useMemo) or lift to caller and make it controlled. | P2 |
| eslint-disable react-hooks/refs | components/ui/DropdownMenu.tsx | 93 | `cloneElement` passes a ref for `asChild` and trips ref-in-render rule. | Refactor to `forwardRef` trigger component or adopt a slot/trigger API without ref access in render. | P2 |
| eslint-disable @next/next/no-img-element | features/offerings/detail/BookingModal.tsx | 56 | Uses `<img>` for counselor avatar. | Replace with `next/image` or a shared Image component. | P3 |
| eslint-disable react-hooks/set-state-in-effect | features/offerings/FilterBar.tsx | 96, 98, 100 | URL params sync into local state via effects. | Use derived state from URL params or initialize state from params and update through handlers only. | P2 |
| eslint-disable react-hooks/exhaustive-deps | app/components/HeaderAuth.tsx | 45 | Effect uses `loadUser` but deps suppressed to avoid re-subscribing. | Wrap `loadUser` with `useCallback` and include deps or extract to a custom hook. | P2 |
| eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps | app/company/properties/[id]/page.tsx | 275 | Load effect intentionally omits deps and sets state after fetch. | Use `useCallback` for `load`, include deps, and keep effect stable. | P2 |
| eslint-disable @next/next/no-img-element | app/company/properties/[id]/page.tsx | 547 | Uses `<img>` for property image. | Replace with `next/image` or shared Image wrapper. | P3 |
| eslint-disable react-hooks/set-state-in-effect | app/company/properties/[id]/specs/page.tsx | 65 | Data-load effect sets state after fetch. | Move to a custom hook that owns state or refactor to derived state where possible. | P2 |
