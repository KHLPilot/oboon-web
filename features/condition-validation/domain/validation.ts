import type { CreditGrade, PurchasePurpose } from "@/features/condition-validation/domain/types";

export type CustomerInput = {
  availableCash: string;
  monthlyIncome: string;
  ownedHouseCount: string;
  creditGrade: CreditGrade;
  purchasePurpose: PurchasePurpose;
};

export type ParsedCustomerInput = {
  available_cash: number;
  monthly_income: number;
  owned_house_count: number;
  credit_grade: CreditGrade;
  purchase_purpose: PurchasePurpose;
};

export type ValidationError = {
  ok: false;
  error: string;
};

export type ParseCustomerInputResult =
  | {
      ok: true;
      data: ParsedCustomerInput;
    }
  | ValidationError;

type FieldMessages = {
  invalid?: string;
  nonInteger?: string;
};

type ParseCustomerInputMessages = {
  availableCash?: FieldMessages;
  monthlyIncome?: FieldMessages;
  ownedHouseCount?: {
    invalid?: string;
  };
};

function parseNumericInput(value: string): number {
  return Number(value.replaceAll(",", "").trim());
}

export function parseCustomerInput(
  input: CustomerInput,
  messages?: ParseCustomerInputMessages,
): ParseCustomerInputResult {
  const availableCashNum = parseNumericInput(input.availableCash);
  const monthlyIncomeNum = parseNumericInput(input.monthlyIncome);
  const ownedHouseCountNum = parseNumericInput(input.ownedHouseCount || "0");

  if (!Number.isFinite(availableCashNum) || availableCashNum < 0) {
    return {
      ok: false,
      error: messages?.availableCash?.invalid ?? "가용 현금을 올바르게 입력해주세요.",
    };
  }
  if (!Number.isInteger(availableCashNum)) {
    return {
      ok: false,
      error:
        messages?.availableCash?.nonInteger ?? "가용 현금은 만원 단위 정수로 입력해주세요.",
    };
  }

  if (!Number.isFinite(monthlyIncomeNum) || monthlyIncomeNum < 0) {
    return {
      ok: false,
      error: messages?.monthlyIncome?.invalid ?? "월 소득을 올바르게 입력해주세요.",
    };
  }
  if (!Number.isInteger(monthlyIncomeNum)) {
    return {
      ok: false,
      error:
        messages?.monthlyIncome?.nonInteger ?? "월 소득은 만원 단위 정수로 입력해주세요.",
    };
  }

  if (
    !Number.isFinite(ownedHouseCountNum) ||
    ownedHouseCountNum < 0 ||
    !Number.isInteger(ownedHouseCountNum)
  ) {
    return {
      ok: false,
      error:
        messages?.ownedHouseCount?.invalid ??
        "보유 주택 수는 0 이상의 정수로 입력해주세요.",
    };
  }

  return {
    ok: true,
    data: {
      available_cash: availableCashNum,
      monthly_income: monthlyIncomeNum,
      owned_house_count: ownedHouseCountNum,
      credit_grade: input.creditGrade,
      purchase_purpose: input.purchasePurpose,
    },
  };
}
