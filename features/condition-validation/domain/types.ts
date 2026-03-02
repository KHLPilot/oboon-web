export type ValidationAssetType =
  | "apartment"
  | "officetel"
  | "commercial"
  | "knowledge_industry";

export type RegulationArea =
  | "non_regulated"
  | "adjustment_target"
  | "speculative_overheated";

export type CreditGrade = "good" | "normal" | "unstable";

export type PurchasePurpose = "residence" | "investment" | "both";

export type FinalGrade = "GREEN" | "YELLOW" | "RED";

export type ActionCode =
  | "VISIT_BOOKING"
  | "PRE_VISIT_CONSULT"
  | "RECOMMEND_ALTERNATIVE_AND_CONSULT";

export type ReasonCode =
  | "CASH_BELOW_MIN"
  | "CASH_BETWEEN_MIN_AND_RECOMMENDED"
  | "CASH_ABOVE_RECOMMENDED"
  | "BURDEN_WARNING_40_TO_50"
  | "BURDEN_HIGH_OVER_50"
  | "RISK_MULTI_HOME_REGULATED"
  | "RISK_CREDIT_UNSTABLE"
  | "RISK_INVESTMENT_TRANSFER_LIMITED";

export type PropertyValidationProfile = {
  propertyId: string;
  propertyName: string | null;
  assetType: ValidationAssetType;
  listPrice: number;
  contractRatio: number;
  regulationArea: RegulationArea;
  transferRestriction: boolean;
  source: "validation_profile" | "property_fallback";
  matchedPropertyId: number | null;
};

export type ConditionCustomerInput = {
  availableCash: number;
  monthlyIncome: number;
  ownedHouseCount: number;
  creditGrade: CreditGrade;
  purchasePurpose: PurchasePurpose;
};

export type ConditionEvaluationTrace = {
  step1CashGrade: FinalGrade;
  step1CashReasonCode:
    | "CASH_BELOW_MIN"
    | "CASH_BETWEEN_MIN_AND_RECOMMENDED"
    | "CASH_ABOVE_RECOMMENDED";
  step2BurdenGrade: FinalGrade;
  step2BurdenReasonCode:
    | "BURDEN_WARNING_40_TO_50"
    | "BURDEN_HIGH_OVER_50"
    | null;
  step3RiskGrade: FinalGrade;
  step3RiskReasonCodes: Array<
    | "RISK_MULTI_HOME_REGULATED"
    | "RISK_CREDIT_UNSTABLE"
    | "RISK_INVESTMENT_TRANSFER_LIMITED"
  >;
};

export type ConditionMetrics = {
  listPrice: number;
  contractAmount: number;
  minCash: number;
  recommendedCash: number;
  loanRatio: number;
  loanAmount: number;
  interestRate: number;
  monthlyPaymentEst: number;
  monthlyBurdenRatio: number;
  monthlyBurdenPercent: number;
};

export type ConditionEvaluationResult = {
  finalGrade: FinalGrade;
  action: ActionCode;
  reasonCodes: ReasonCode[];
  reasonMessages: string[];
  summaryMessage: string;
  warnings: ReasonCode[];
  metrics: ConditionMetrics;
  trace: ConditionEvaluationTrace;
};
