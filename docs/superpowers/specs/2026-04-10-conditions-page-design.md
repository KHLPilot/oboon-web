# 맞춤 현장 조건 설정 — 페이지 전환 UX 설계

**날짜:** 2026-04-10  
**범위:** `/recommendations` 모바일 UX — 바텀 시트 → 전용 페이지 전환

---

## 배경

현재 맞춤 현장 조건 설정은 `MobileConditionSheet`(바텀 시트)로 열린다. 모바일에서 15개 이상의 필드를 바텀 시트 안에서 3단계 위저드로 처리하는 구조라 UX가 답답하다. 각 스텝을 독립 페이지로 분리하여 전체 화면을 활용하고, 뒤로가기도 자연스럽게 동작하게 한다.

---

## 결정 사항

| 항목 | 결정 |
|------|------|
| 진입점 | `/recommendations` 페이지 조건 설정 버튼 |
| 스텝 구조 | URL 기반 (`/recommendations/conditions/step/[step]`) |
| 완료 후 | 완료 화면 → `/recommendations` 자동 이동 (3초 or 버튼) |
| 게스트 | 허용 — sessionStorage 저장, 완료 화면에서 로그인 유도 |
| 데스크탑 | 기존 사이드 패널 유지 — 조건 페이지는 모바일 전용 |

---

## 라우팅 구조

```
app/recommendations/conditions/
  layout.tsx               ← 공통 레이아웃 (헤더 + 진행 표시)
  step/
    [step]/
      page.tsx             ← step=1, 2, 3
  done/
    page.tsx               ← 완료 화면
```

**진입/이탈 흐름:**

```
/recommendations
  → [조건 설정 버튼] (모바일)
/recommendations/conditions/step/1
  → [다음]
/recommendations/conditions/step/2
  → [다음]
/recommendations/conditions/step/3
  → [완료]
/recommendations/conditions/done
  → (3초 또는 버튼)
/recommendations
```

**데스크탑 보호:** `layout.tsx` 또는 각 page에서 `useMediaQuery` 또는 `redirect()`로 데스크탑 접근 시 `/recommendations`로 리다이렉트.

---

## 각 화면 설계

### 공통 레이아웃 (`layout.tsx`)

- 상단 고정 헤더: 뒤로가기 버튼 + 스텝 진행 표시 (`1 / 3`)
- 콘텐츠 영역: 스크롤 가능 (각 스텝 컴포넌트 자체에 Next/Finish 버튼 포함)

### 필드 단위 프로그레시브 디스클로저 (스텝 내부)

각 스텝 컴포넌트에 `progressive?: boolean` prop 추가. `progressive={true}` 일 때 이전 필드를 입력해야 다음 필드가 아래로 슬라이드-인 된다. `progressive={false}` (기본값)이면 기존 동작 유지 — 데스크탑 사이드 패널은 변경 없음.

**애니메이션:** `grid-rows-[0fr] → grid-rows-[1fr]` + `opacity-0 → opacity-100` (duration-300). 새 필드 등장 시 `scrollIntoView({ behavior: "smooth", block: "nearest" })` 호출.

**Step 1 필드 공개 순서:**
| 슬롯 | 필드 | 공개 조건 |
|------|------|-----------|
| 0 | 가용 현금 | 항상 |
| 1 | 월 소득 | `availableCash > 0` |
| 2 | 보유 주택 | `monthlyIncome > 0` |
| 3 | 월 지출 (로그인) | `houseOwnership !== null` |
| 4 | 직업 (로그인) | `monthlyExpenses > 0` |
| 5 | 다음 버튼 | `isStep1ReadyByAuth()` |

**Step 2 필드 공개 순서 (로그인):**
| 슬롯 | 필드 | 공개 조건 |
|------|------|-----------|
| 0 | 현재 대출 | 항상 |
| 1 | 카드론/현금서비스 | `existingLoan !== null` |
| 2 | 연체 이력 (대출 있을 때) | `cardLoanUsage !== null && hasLoan` |
| 3 | 대출거절 경험 (대출 있을 때) | `recentDelinquency !== null` |
| 4 | 월 평균 세후 소득 | `cardLoanUsage !== null && (hasLoan ? loanRejection !== null : true)` |
| 5 | 월 대출 상환액 | `monthlyIncomeRange !== null` |
| 6 | LTV/DSR 미리보기 + 다음 버튼 | `isReadyForLtvScore()` |

Step 2 게스트: 단일 필드(신용 상태) → 프로그레시브 불필요, 항상 표시.

**Step 3 필드 공개 순서:**
| 슬롯 | 필드 | 공개 조건 |
|------|------|-----------|
| 0 | 분양 목적 | 항상 |
| 1 | 분양 시점 (로그인) | `purchasePurposeV2 !== null` |
| 2 | 희망 입주 (로그인) | `purchaseTiming !== null` |
| 3 | 선호 지역 (로그인) | `moveinTiming !== null` |
| 4 | 완료/이전 버튼 | `isStep3ReadyByAuth()` |

### Step 1 — 재무 정보

기존 `ConditionWizardStep1.tsx`에 `progressive?: boolean` prop 추가. `progressive={true}` 시 위 순서대로 필드 공개.

### Step 2 — 신용/대출

기존 `ConditionWizardStep2.tsx`에 `progressive?: boolean` prop 추가.

### Step 3 — 라이프스타일

기존 `ConditionWizardStep3.tsx`에 `progressive?: boolean` prop 추가.

### 완료 화면 (`done/page.tsx`)

- 체크 아이콘 + "조건이 저장됐어요" 텍스트
- 게스트: "로그인하면 다음에도 유지돼요" 안내 문구
- "추천 결과 보기" 버튼
- 3초 후 `/recommendations` 자동 이동 (버튼 누르면 즉시)
- 이 화면에서 `/api/condition-validation/profiles/upsert` API 호출 (로그인 사용자)

---

## 상태 관리

- **저장소:** 기존 `sessionStorage` (`oboon:condition-session`) 그대로 유지
- **각 스텝 완료 시:** `saveConditionSession()` 호출로 점진적 저장
- **완료 화면:** `useRecommendations` hook의 저장 로직 호출
- **스텝 유효성:** 현재 스텝 필수 필드가 채워져야 "다음" 버튼 활성화

---

## 기존 코드 재사용 범위

| 파일 | 처리 방식 |
|------|-----------|
| `ConditionWizardStep1/2/3.tsx` | `progressive?: boolean` prop 추가, 기존 비-프로그레시브 동작 유지 |
| `MobileConditionSheet.tsx` | Sheet 제거, 버튼 → `router.push('/recommendations/conditions/step/1')` |
| `ConditionWizard.tsx` | 변경 없음 (desktop 사이드 패널은 progressive=false로 유지) |
| `useRecommendations` hook | 상태/저장 로직 변경 없음 |
| `sessionCondition.ts` | 변경 없음 |

---

## 범위 외 (이번 작업에서 제외)

- 데스크탑 조건 패널 UI 변경
- 필드 단위 progressive disclosure (한 필드씩 순차 공개)
- `/offerings` 진입점 추가
