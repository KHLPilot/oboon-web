# Condition Wizard — Design Spec
**Date**: 2026-04-03
**Status**: Approved
**Scope**: 조건 입력 UX 전면 개선 (맞춤현장 필터바 + 신용 모달 + 현장 상세 조건 카드)

---

## 1. 배경 및 목표

### 문제
- `ConditionBar`에 동시에 노출되는 필드가 10개 이상으로 사용자 이탈 유발
- 신용 상태 입력을 위해 별도 `LtvDsrModal`을 열어야 하는 마찰
- 모바일/데스크톱 모두에서 시각적 밀도가 높음

### 목표
- 입력 흐름을 3단계 wizard로 재구성해 한 번에 보이는 필드를 3~4개로 제한
- `LtvDsrModal`을 Step 2에 흡수하여 모달 진입 마찰 제거
- 세 곳(맞춤현장 필터바, LtvDsrModal, 현장 상세 조건 카드) 동시 개선

---

## 2. 변경 범위

### 변경되는 파일
| 파일 | 변경 내용 |
|---|---|
| `features/condition-validation/components/ConditionWizard.tsx` | 신규 — `ConditionBar` 대체 |
| `features/condition-validation/components/ConditionWizardStep1.tsx` | 신규 — 재무 입력 |
| `features/condition-validation/components/ConditionWizardStep2.tsx` | 신규 — 신용/대출 입력 (LtvDsrModal 흡수) |
| `features/condition-validation/components/ConditionWizardStep3.tsx` | 신규 — 라이프스타일 입력 |
| `features/recommendations/components/ConditionBar.tsx` | `ConditionWizard`로 교체 |
| `features/offerings/components/detail/ConditionValidationCard.tsx` | wizard 인라인/bottom sheet 연결 |
| `features/condition-validation/components/LtvDsrModal.tsx` | deprecated (Step 2로 대체) |

### 변경 없는 파일
- `features/condition-validation/domain/ltvDsrCalculator.ts`
- `features/condition-validation/domain/evaluator.ts`
- `features/condition-validation/domain/types.ts`
- `features/condition-validation/lib/sessionCondition.ts`
- `features/condition-validation/lib/grade5Labels.ts`
- `features/condition-validation/lib/grade5Theme.ts`
- `features/recommendations/hooks/useRecommendations.ts`
- `app/api/condition-validation/**`

---

## 3. 3단계 Wizard 구성

### Step 1 — 재무
| 필드 | 타입 | 비고 |
|---|---|---|
| 직업 | Select | `employmentType` — Step 2 LTV 계산에 자동 연동 |
| 보유 주택 | Select | `houseOwnership` — Step 2 LTV 계산에 자동 연동 |
| 가용 현금 | NumberField | `availableCash` |
| 월 소득 | NumberField | `monthlyIncome` |
| 월 지출 | NumberField | `monthlyExpenses` |

### Step 2 — 신용/대출
| 필드 | 타입 | 비고 |
|---|---|---|
| 보유 주택 | Select (disabled) | `houseOwnership` — Step 1 이전 입력값 자동 연동 표시 |
| 직업 형태 | Select (disabled) | `employmentType` — 자동 연동 |
| 현재 대출 | Select | `existingLoan` |
| 최근 1년 연체 | Select | `recentDelinquency` — 대출 있을 때만 노출 |
| 카드론/현금서비스 | Select | `cardLoanUsage` |
| 대출 심사 거절 | Select | `loanRejection` — 대출 있을 때만 노출 |
| 월 평균 세후 소득 | Select | `monthlyIncomeRange` |
| 월 대출 상환액 | Select | `existingMonthlyRepayment` |

**LTV·DSR 인라인 프리뷰**: 스텝 하단 고정. 필드 변경 시 `calculateLtvDsrPreview()` 실시간 호출.
모든 필드 입력 전: "현재 대출과 소득을 선택하면 결과가 표시됩니다" 문구.

### Step 3 — 라이프스타일
| 필드 | 타입 | 비고 |
|---|---|---|
| 분양 목적 | Select | `purchasePurposeV2` |
| 분양 시점 | Select | `purchaseTiming` |
| 희망 입주 | Select | `moveinTiming` |
| 지역 | MultiSelect | `regions` — 빈 배열 = 전체 |

---

## 4. 레이아웃

### 모바일
- 스텝 하나가 전체 영역 점유
- 상단: 스텝 인디케이터 (● ○ ○)
- 하단 고정 푸터: [이전] [다음 →] 버튼
- 스텝 전환: 좌↔우 슬라이드 애니메이션
- Step 2는 조건부 필드로 최대 8개 → 스크롤 허용

### 데스크톱
- 상단 탭 형태 스텝 인디케이터
- 완료된 스텝: ✓ 표시, 클릭으로 자유 이동 가능
- 현재 스텝 패널만 표시
- Step 1: 2열 그리드, Step 2~3: 1~2열 혼용

### ConditionValidationCard (현장 상세)
- 기본 상태: 결과 요약만 표시
- "조건 수정" 클릭 → 데스크톱: 카드 하단 인라인 확장, 모바일: bottom sheet

---

## 5. 비로그인 처리

- Step 1, Step 3: 비로그인도 입력 가능
- Step 2 진입 시 soft gate 노출:
  - [로그인하고 계속] — 로그인 후 Step 2 전체 접근
  - [건너뛰기] — `creditGrade` 3단계 Select만 노출 (기존 `guestCreditGradeToScore` 재사용)

---

## 6. 저장 & 평가 버튼 (Step 3 완료 후)

| 상태 | 버튼 |
|---|---|
| 비로그인 | "로그인하고 조건 저장" 1개 |
| 로그인 + 저장 없음 | "조건 저장" + "평가하기" |
| 로그인 + 저장 있음 + 변경됨 | "조건 업데이트" + "평가하기" |
| 로그인 + 저장 있음 + 변경 없음 | "평가하기"만 |

`ConditionWizard` prop 인터페이스는 기존 `ConditionBar`와 동일:
- `onSave`, `onEvaluate`, `onLoginAndSave`, `isLoading`, `isSaving` 등

---

## 7. 데이터 흐름

```
useRecommendations (상태 관리, 변경 없음)
  └─ ConditionWizard (신규, ConditionBar 대체)
       ├─ ConditionWizardStep1 (재무)
       ├─ ConditionWizardStep2 (신용 — ltvDsrCalculator 직접 호출)
       └─ ConditionWizardStep3 (라이프스타일)
```

세션 저장: `sessionCondition.ts` 그대로 사용. wizard 각 스텝 완료 시점마다 `saveConditionSession()` 호출해 중간 저장.

---

## 8. 완료 기준

- [ ] 맞춤현장 페이지에서 3단계 wizard로 조건 입력 가능
- [ ] Step 2에서 LTV·DSR 프리뷰가 실시간으로 갱신됨
- [ ] LtvDsrModal 없이도 신용 상태 평가 완료 가능
- [ ] 비로그인 사용자가 Step 2를 건너뛰고 평가 가능
- [ ] 현장 상세 ConditionValidationCard에서 wizard로 조건 수정 가능
- [ ] 모바일/데스크톱 모두 정상 동작
- [ ] `pnpm lint` + `pnpm build` 통과
