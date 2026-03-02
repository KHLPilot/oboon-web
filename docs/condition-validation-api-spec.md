# 조건 검증 API 스펙 (v1)

## 1. Endpoint
- `POST /api/condition-validation/evaluate`
- 인증: 공개 가능(비로그인), 단 운영 로그 저장 시 rate limit 권장

## 2. Request
```json
{
  "property_id": "e편한세상 센텀 하이베뉴",
  "customer": {
    "available_cash": 5000,
    "monthly_income": 500,
    "owned_house_count": 1,
    "credit_grade": "good",
    "purchase_purpose": "residence",
    "amount_unit": "manwon"
  },
  "options": {
    "strict_validation": true,
    "trace": true
  }
}
```

### 2.1 Request Validation Error
```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "monthly_income must be greater than 0",
    "field_errors": {
      "customer.monthly_income": "must be > 0"
    }
  }
}
```

## 3. Response
```json
{
  "ok": true,
  "result": {
    "final_grade": "GREEN",
    "action": "VISIT_BOOKING",
    "reason_codes": [
      "CASH_ABOVE_RECOMMENDED"
    ],
    "summary_message": "진행 가능 조건"
  },
  "metrics": {
    "list_price": 22678,
    "contract_amount": 1133.9,
    "min_cash": 2948.14,
    "recommended_cash": 3855.26,
    "loan_ratio": 0.55,
    "loan_amount": 12472.9,
    "interest_rate": 0.048,
    "monthly_payment_est": 64.86,
    "monthly_burden_ratio": 0.1297,
    "monthly_burden_percent": 12.97
  },
  "warnings": [],
  "trace": {
    "step1_cash_grade": "GREEN",
    "step2_after_burden_grade": "GREEN",
    "step3_after_risk_grade": "GREEN",
    "downgrade_applied_step2": false,
    "downgrade_applied_step3": false
  }
}
```

## 4. Error Codes
| 코드 | HTTP | 설명 |
| --- | --- | --- |
| `VALIDATION_ERROR` | 400 | 입력 형식/범위 오류 |
| `PROPERTY_NOT_FOUND` | 404 | 현장 정보 없음 |
| `UNSUPPORTED_ASSET_TYPE` | 400 | 자산 유형 미지원 |
| `EVALUATION_FAILED` | 500 | 내부 계산 실패 |

## 5. Enum Definitions
### 5.1 `final_grade`
- `GREEN`
- `YELLOW`
- `RED`

### 5.2 `action`
- `VISIT_BOOKING`
- `PRE_VISIT_CONSULT`
- `RECOMMEND_ALTERNATIVE_AND_CONSULT`

### 5.3 `credit_grade`
- `good`
- `normal`
- `unstable`

### 5.4 `purchase_purpose`
- `residence`
- `investment`
- `both`

### 5.5 `amount_unit`
- `manwon`
- `krw`

## 6. Batch API (선택)
- `POST /api/condition-validation/evaluate/batch`
- 배열 입력으로 최대 N건(권장 50건) 처리
- 응답은 `results[]`와 `errors[]`를 분리하여 부분성공 지원

## 7. 구현 메모 (Next.js)
- Route: `app/api/condition-validation/evaluate/route.ts`
- Service: `features/condition-validation/services/evaluateCondition.ts`
- Validator: `zod` 스키마 분리
- 공통 사유코드/등급 하향 로직은 순수 함수로 분리(테스트 용이성 확보)
