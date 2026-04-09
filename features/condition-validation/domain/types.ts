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
  | "BURDEN_INCOME_ZERO"
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
    | "BURDEN_INCOME_ZERO"
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

export type CategoryResult = {
  grade: FinalGrade;
  score: number;
  maxScore: number;
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
  monthlyBurdenRatio: number | null;
  monthlyBurdenPercent: number | null;
};

export type ConditionEvaluationResult = {
  finalGrade: FinalGrade;
  totalScore: number;
  maxScore: number;
  action: ActionCode;
  reasonCodes: ReasonCode[];
  reasonMessages: string[];
  summaryMessage: string;
  warnings: ReasonCode[];
  metrics: ConditionMetrics;
  trace: ConditionEvaluationTrace;
  categories: {
    cash: CategoryResult;
    burden: CategoryResult;
    risk: CategoryResult;
  };
};

export type ConditionCategoryGrades = {
  cash: { grade: FinalGrade5; score?: number };
  burden: { grade: FinalGrade5; score?: number };
  credit: { grade: FinalGrade5; score?: number };
  totalScore?: number;
};

export type ConditionEvaluationResponse = {
  ok: boolean;
  result?: {
    final_grade: FinalGrade;
    total_score: number;
    max_score: number;
    action: string;
    reason_codes: string[];
    reason_messages: string[];
    summary_message: string;
  };
  metrics?: {
    list_price: number | null;
    contract_amount: number | null;
    min_cash: number | null;
    recommended_cash: number | null;
    loan_ratio: number | null;
    loan_amount: number | null;
    interest_rate: number | null;
    monthly_payment_est: number | null;
    monthly_burden_ratio: number | null;
    monthly_burden_percent: number | null;
  };
  warnings?: string[];
  display?: {
    masked?: boolean;
    show_detailed_metrics?: boolean;
    price_visibility?: "public" | "non_public" | "unknown";
  };
  categories?: {
    cash: {
      grade: FinalGrade;
      score: number | null;
      max_score: number;
      masked: boolean;
      reason_message: string | null;
    };
    burden: {
      grade: FinalGrade;
      score: number | null;
      max_score: number;
      masked: boolean;
      reason_message: string | null;
    };
    risk: {
      grade: FinalGrade;
      score: number | null;
      max_score: number;
      masked: boolean;
      reason_message: string | null;
    };
  };
  trace?: {
    step1_cash_grade: FinalGrade;
    step1_cash_reason_code:
      | "CASH_BELOW_MIN"
      | "CASH_BETWEEN_MIN_AND_RECOMMENDED"
      | "CASH_ABOVE_RECOMMENDED";
    step1_cash_reason_message: string | null;
    step2_burden_grade: FinalGrade;
    step2_burden_reason_code:
      | "BURDEN_INCOME_ZERO"
      | "BURDEN_WARNING_40_TO_50"
      | "BURDEN_HIGH_OVER_50"
      | null;
    step2_burden_reason_message: string | null;
    step3_risk_grade: FinalGrade;
    step3_risk_reason_codes: Array<
      | "RISK_MULTI_HOME_REGULATED"
      | "RISK_CREDIT_UNSTABLE"
      | "RISK_INVESTMENT_TRANSFER_LIMITED"
    >;
    step3_risk_reason_messages: string[];
  };
  error?: {
    code?: string;
    message?: string;
    field_errors?: Record<string, string[] | undefined>;
  };
};

export type ConditionRecommendationItem = {
  property_id: number;
  property_name: string | null;
  property_type: string | null;
  status: string | null;
  image_url: string | null;
  show_detailed_metrics?: boolean;
  final_grade: FinalGrade5;
  total_score?: number;
  action: string;
  summary_message: string;
  reason_messages: string[];
  metrics: {
    list_price: number;
    min_cash: number;
    recommended_cash: number;
    monthly_payment_est: number;
    monthly_burden_percent: number | null;
  };
};

// ===== Unit Type Validation Types =====

export type UnitTypeValidationProfile = {
  propertyId: string;
  unitTypeId: number;
  unitTypeName: string | null;
  exclusiveArea: number | null;
  listPriceManwon: number;
  isPricePublic: boolean;
  assetType: ValidationAssetType;
  contractRatio: number;
  regulationArea: RegulationArea;
  transferRestriction: boolean;
};

export type UnitTypeEvaluationResult = {
  unitTypeId: number;
  unitTypeName: string | null;
  exclusiveArea: number | null;
  listPriceManwon: number;
  isPricePublic: boolean;
  finalGrade: FinalGrade5;
  totalScore: number;
  summaryMessage: string;
  gradeLabel: string;
  metrics: {
    contractAmount: number;
    minCash: number;
    recommendedCash: number;
    loanAmount: number;
    monthlyPaymentEst: number;
    monthlyBurdenPercent: number | null;
    timingMonthsDiff: number | null;
  };
  categories?: {
    cash: { grade: FinalGrade5; score: number; maxScore: number; reason: string };
    income: { grade: FinalGrade5; score: number; maxScore: number; reason: string };
    ltv_dsr?: { grade: FinalGrade5; score: number; maxScore: number; reason: string };
    credit?: { grade: FinalGrade5; score: number; maxScore: number; reason: string };
    ownership: { grade: FinalGrade5; score: number; maxScore: number; reason: string };
    purpose: { grade: FinalGrade5; score: number; maxScore: number; reason: string };
    timing?: { grade: FinalGrade5; score: number; maxScore: number; reason: string };
  };
};

// ===== New System Types (v2) =====

export type EmploymentType = "employee" | "self_employed" | "freelancer" | "other";

export type FullPurchasePurpose =
  | "residence"
  | "investment_rent"
  | "investment_capital"
  | "long_term";

export type PurchaseTiming =
  | "by_property"
  | "over_1year"
  | "within_1year"
  | "within_6months"
  | "within_3months";

export type MoveinTiming =
  | "anytime"
  | "within_3years"
  | "within_2years"
  | "within_1year"
  | "immediate";

export type FinalGrade5 = "GREEN" | "LIME" | "YELLOW" | "ORANGE" | "RED";

export const EXISTING_LOAN_AMOUNTS = ["none", "under_1eok", "1to3eok", "over_3eok"] as const;
export type ExistingLoanAmount = (typeof EXISTING_LOAN_AMOUNTS)[number];

export const MONTHLY_LOAN_REPAYMENTS = ["none", "under_50", "50to100", "100to200", "over_200"] as const;
export type MonthlyLoanRepayment = (typeof MONTHLY_LOAN_REPAYMENTS)[number];

export const MONTHLY_INCOME_RANGES = [
  "under_200",
  "200to300",
  "300to500",
  "500to700",
  "over_700",
] as const;
export type MonthlyIncomeRange = (typeof MONTHLY_INCOME_RANGES)[number];

export const DELINQUENCY_COUNTS = ["none", "once", "twice_or_more"] as const;
export type DelinquencyCount = (typeof DELINQUENCY_COUNTS)[number];

export const CARD_LOAN_USAGES = ["none", "1to2", "3_or_more"] as const;
export type CardLoanUsage = (typeof CARD_LOAN_USAGES)[number];

export const LOAN_REJECTIONS = ["none", "yes"] as const;
export type LoanRejection = (typeof LOAN_REJECTIONS)[number];

export type LtvDsrPersistedValues = {
  existingLoan: ExistingLoanAmount | null;
  recentDelinquency: DelinquencyCount | null;
  cardLoanUsage: CardLoanUsage | null;
  loanRejection: LoanRejection | null;
  monthlyIncomeRange: MonthlyIncomeRange | null;
  existingMonthlyRepayment: MonthlyLoanRepayment | null;
};

export const EMPTY_LTV_DSR_PERSISTED_VALUES: LtvDsrPersistedValues = {
  existingLoan: null,
  recentDelinquency: null,
  cardLoanUsage: null,
  loanRejection: null,
  monthlyIncomeRange: null,
  existingMonthlyRepayment: null,
};

export function isOneOf<T extends readonly string[]>(
  values: T,
  value: unknown,
): value is T[number] {
  return typeof value === "string" && values.includes(value as T[number]);
}

export type LtvDsrInput = {
  houseOwnership: "none" | "one" | "two_or_more";
  existingLoan: ExistingLoanAmount;
  recentDelinquency: DelinquencyCount;
  cardLoanUsage: CardLoanUsage;
  loanRejection: LoanRejection;
  employmentType: EmploymentType;
  monthlyIncomeRange: MonthlyIncomeRange;
  existingMonthlyRepayment: MonthlyLoanRepayment;
};

export type LtvDsrPreview = {
  ltvInternalScore: number;
  ltvPoints: number;
  ltvLabel: string;
  dsrEstimate: number | null;
  dsrPoints: number;
  dsrLabel: string;
  totalPoints: number;
};

export type FullCustomerInput = {
  employmentType: EmploymentType;
  availableCash: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  houseOwnership: "none" | "one" | "two_or_more";
  purchasePurpose: FullPurchasePurpose;
  purchaseTiming: PurchaseTiming;
  moveinTiming: MoveinTiming;
  ltvInternalScore: number;
  existingMonthlyRepayment: MonthlyLoanRepayment;
};

export type FullEvaluationCategoryResult = {
  grade: FinalGrade5;
  score: number;
  maxScore: number;
  reasonMessage: string;
};

export type FullEvaluationResult = {
  finalGrade: FinalGrade5;
  totalScore: number;
  maxScore: 100;
  summaryMessage: string;
  gradeLabel: string;
  categories: {
    cash: FullEvaluationCategoryResult;
    income: FullEvaluationCategoryResult;
    ltvDsr: FullEvaluationCategoryResult;
    ownership: FullEvaluationCategoryResult;
    purpose: FullEvaluationCategoryResult;
    timing: FullEvaluationCategoryResult;
  };
  metrics: {
    contractAmount: number;
    loanAmount: number;
    monthlyPaymentEst: number;
    monthlySurplus: number;
    dsrPercent: number | null;
    dsrPoints: number;
    ltvPoints: number;
  };
};

// ===== Guest (비로그인) Evaluation Types =====

export type GuestCustomerInput = {
  availableCash: number;
  monthlyIncome: number;
  creditGrade: CreditGrade;
  houseOwnership: "none" | "one" | "two_or_more";
  purchasePurpose: FullPurchasePurpose;
};

export type GuestEvaluationCategoryResult = {
  grade: FinalGrade5;
  score: number;
  maxScore: number;
  reasonMessage: string;
};

export type GuestEvaluationResult = {
  finalGrade: FinalGrade5;
  totalScore: number;
  maxScore: 100;
  summaryMessage: string;
  gradeLabel: string;
  categories: {
    cash: GuestEvaluationCategoryResult;
    income: GuestEvaluationCategoryResult;
    credit: GuestEvaluationCategoryResult;
    ownership: GuestEvaluationCategoryResult;
    purpose: GuestEvaluationCategoryResult;
  };
  metrics: {
    contractAmount: number;
    loanAmount: number;
    monthlyPaymentEst: number;
    monthlyBurdenPercent: number | null;
  };
};

export type UnitTypeResultItem = {
  unit_type_id: number;
  unit_type_name: string | null;
  exclusive_area: number | null;
  list_price_manwon: number;
  is_price_public: boolean;
  final_grade: FinalGrade5;
  total_score: number;
  summary_message: string;
  grade_label?: string;
  metrics?: {
    contract_amount?: number;
    min_cash?: number;
    recommended_cash?: number;
    loan_amount?: number;
    monthly_payment_est?: number;
    monthly_burden_percent?: number | null;
    timing_months_diff?: number | null;
  };
  categories?: {
    cash?: { grade: FinalGrade5; score: number; max_score: number; reason: string };
    income?: { grade: FinalGrade5; score: number; max_score: number; reason: string };
    ltv_dsr?: { grade: FinalGrade5; score: number; max_score: number; reason: string };
    credit?: { grade: FinalGrade5; score: number; max_score: number; reason: string };
    ownership?: { grade: FinalGrade5; score: number; max_score: number; reason: string };
    purpose?: { grade: FinalGrade5; score: number; max_score: number; reason: string };
    timing?: { grade: FinalGrade5; score: number; max_score: number; reason: string };
  };
  recommendation_context?: {
    available_cash_manwon?: number;
    monthly_income_manwon?: number;
    house_ownership?: "none" | "one" | "two_or_more" | null;
    purchase_purpose?: FullPurchasePurpose | null;
  };
};

export type GuestEvaluationResponse = {
  ok: boolean;
  result?: {
    final_grade: FinalGrade5;
    total_score: number;
    max_score: number;
    summary_message: string;
    grade_label: string;
  };
  categories?: {
    cash: { grade: FinalGrade5; score: number; max_score: number; reason: string };
    income: { grade: FinalGrade5; score: number; max_score: number; reason: string };
    credit: { grade: FinalGrade5; score: number; max_score: number; reason: string };
    ownership: { grade: FinalGrade5; score: number; max_score: number; reason: string };
    purpose: { grade: FinalGrade5; score: number; max_score: number; reason: string };
  };
  metrics?: {
    contract_amount: number;
    min_cash: number;
    recommended_cash: number;
    loan_amount: number;
    monthly_payment_est: number;
    monthly_burden_percent: number | null;
  };
  display?: {
    price_visibility?: "public" | "non_public" | "unknown";
  };
  unit_type_results?: UnitTypeResultItem[];
  error?: {
    code?: string;
    message?: string;
    field_errors?: Record<string, string[] | undefined>;
  };
};

export type FullEvaluationResponse = {
  ok: boolean;
  result?: {
    final_grade: FinalGrade5;
    total_score: number;
    max_score: number;
    summary_message: string;
    grade_label: string;
  };
  categories?: {
    cash: { grade: FinalGrade5; score: number; max_score: number; reason: string };
    income: { grade: FinalGrade5; score: number; max_score: number; reason: string };
    ltv_dsr: { grade: FinalGrade5; score: number; max_score: number; reason: string };
    ownership: { grade: FinalGrade5; score: number; max_score: number; reason: string };
    purpose: { grade: FinalGrade5; score: number; max_score: number; reason: string };
    timing: { grade: FinalGrade5; score: number; max_score: number; reason: string };
  };
  metrics?: {
    contract_amount: number;
    min_cash: number;
    recommended_cash: number;
    loan_amount: number;
    monthly_payment_est: number;
    monthly_surplus: number;
    monthly_burden_percent: number | null;
    dsr_percent: number | null;
    timing_months_diff?: number | null;
  };
  display?: {
    price_visibility?: "public" | "non_public" | "unknown";
  };
  unit_type_results?: UnitTypeResultItem[];
  error?: {
    code?: string;
    message?: string;
    field_errors?: Record<string, string[] | undefined>;
  };
};
