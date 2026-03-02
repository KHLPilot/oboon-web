# 조건 검증 규칙표 (v1)

## 1. 목적
- 고객의 간단 입력 + 현장 기본정보로 `GREEN / YELLOW / RED`를 산출한다.
- 승인/불가 확정 판정이 아니라, 방문/상담/대안 추천의 운영 분기를 위한 보수적 리스크 분류다.

## 2. 입력 필드 규칙
| 필드 | 타입 | 필수 | 허용값/범위 | 비고 |
| --- | --- | --- | --- | --- |
| `property_id` | string | Y | 현장 마스터에 존재해야 함 | 없으면 `PROPERTY_NOT_FOUND` |
| `available_cash` | number | Y | `> 0` | 기본 단위 `만원` |
| `monthly_income` | number | Y | `> 0` | 기본 단위 `만원` |
| `owned_house_count` | integer | Y | `0,1,2...` | 음수 불가 |
| `credit_grade` | enum | Y | `good`,`normal`,`unstable` | 양호/보통/불안 |
| `purchase_purpose` | enum | Y | `residence`,`investment`,`both` | 실거주/투자/둘다 |
| `amount_unit` | enum | N | `manwon`,`krw` | 미입력 시 `manwon` |

## 3. 현장 마스터 필드
| 필드 | 타입 | 예시 |
| --- | --- | --- |
| `asset_type` | enum | `apartment`,`officetel`,`commercial`,`knowledge_industry` |
| `list_price` | number | 22678 (만원) |
| `contract_ratio` | number | 0.05, 0.10 |
| `regulation_area` | enum | `non_regulated`,`adjustment_target`,`speculative_overheated` |
| `transfer_restriction` | boolean | true/false |

## 4. 계산 공식
- 모든 계산 단위: `만원`

### 4.1 단위 정규화
- `amount_unit=krw`이면 `available_cash`, `monthly_income`를 `10000`으로 나눠 `만원`으로 변환.
- `amount_unit` 미입력 + 값이 비정상적으로 큰 경우(권장: `>=100000`) 자동 변환 시도.
- 자동 변환 시 `warnings`에 `UNIT_AUTO_CONVERTED_FROM_KRW` 추가.

### 4.2 기본값
- `contract_amount = list_price * contract_ratio`

### 4.3 최소/권장 현금
| 자산유형 | 최소현금 | 권장현금 |
| --- | --- | --- |
| apartment | `contract_amount + list_price * 0.08` | `contract_amount + list_price * 0.12` |
| officetel | `contract_amount + list_price * 0.10` | `contract_amount + list_price * 0.15` |
| knowledge_industry/commercial | `contract_amount + list_price * 0.12` | `contract_amount + list_price * 0.18` |

### 4.4 대출비율
| 조건 | 대출비율 |
| --- | --- |
| apartment and `list_price <= 90000` | 0.55 |
| apartment and `list_price > 90000` | 0.45 |
| officetel | 0.45 |
| knowledge_industry/commercial | 0.40 |

### 4.5 월상환/부담률
- 금리 매핑:
  - `good`: 0.048
  - `normal`: 0.052
  - `unstable`: 0.060
- `loan_amount = list_price * loan_ratio`
- `monthly_payment_est = (loan_amount * (interest_rate / 12)) * 1.3`
- `monthly_burden_ratio = monthly_payment_est / monthly_income`

## 5. 등급 산출 규칙

### 5.1 STEP1: 현금 1차
- `available_cash >= recommended_cash` -> `GREEN`
- `min_cash <= available_cash < recommended_cash` -> `YELLOW`
- `available_cash < min_cash` -> `RED`

### 5.2 STEP2: 월부담 보정
- `monthly_burden_ratio <= 0.40` -> 유지
- `0.40 < monthly_burden_ratio <= 0.50` -> 한 단계 하향
- `monthly_burden_ratio > 0.50` -> `RED`

### 5.3 STEP3: 리스크 보정
아래 중 하나라도 true이면 한 단계 하향(최대 1단계):
- `owned_house_count >= 2` and `regulation_area != non_regulated`
- `credit_grade == unstable`
- `purchase_purpose == investment` and `transfer_restriction == true`

### 5.4 하향 규칙
- `GREEN -> YELLOW`
- `YELLOW -> RED`
- `RED -> RED` (고정)

## 6. 사유 코드(reason_codes)
| 코드 | 설명 |
| --- | --- |
| `CASH_BELOW_MIN` | 최소 필요 현금 미달 |
| `CASH_BETWEEN_MIN_AND_RECOMMENDED` | 최소~권장 구간 |
| `CASH_ABOVE_RECOMMENDED` | 권장 현금 이상 |
| `BURDEN_WARNING_40_TO_50` | 월부담 40~50% 경계 |
| `BURDEN_HIGH_OVER_50` | 월부담 50% 초과 |
| `RISK_MULTI_HOME_REGULATED` | 다주택 + 규제지역 |
| `RISK_CREDIT_UNSTABLE` | 신용 불안 |
| `RISK_INVESTMENT_TRANSFER_LIMITED` | 투자 목적 + 전매 제한 |
| `UNIT_AUTO_CONVERTED_FROM_KRW` | 금액 단위 자동 변환 |

## 7. 액션 매핑
| 최종등급 | 기본 액션 |
| --- | --- |
| `GREEN` | `VISIT_BOOKING` (모델하우스 방문 예약 유도) |
| `YELLOW` | `PRE_VISIT_CONSULT` (상담 우선) |
| `RED` | `RECOMMEND_ALTERNATIVE_AND_CONSULT` (대안 추천 + 상담 재설계) |

## 8. 샘플 케이스 반영 메모
- 주신 데이터의 `No.5`처럼 `5,000,000 / 2,300,000` 값은 단위 혼용 가능성이 높다.
- 운영에서는 `amount_unit`을 명시 입력받고, 미입력 시 자동 변환 경고를 남기는 방식이 안전하다.
