import type {
  CardLoanUsage,
  CreditGrade,
  DelinquencyCount,
  EmploymentType,
  ExistingLoanAmount,
  FullPurchasePurpose,
  LoanRejection,
  MonthlyIncomeRange,
  MonthlyLoanRepayment,
  MoveinTiming,
  PurchaseTiming,
} from "@/features/condition-validation/domain/types";
import type { OfferingRegionTab } from "@/features/offerings/domain/offering.types";

export type OwnedHouseCount = 0 | 1 | 2;

export type RecommendationCondition = {
  availableCash: number;
  monthlyIncome: number;
  ownedHouseCount: OwnedHouseCount;
  creditGrade: CreditGrade | null;
  purchasePurpose: "residence" | "investment" | "both";
  employmentType: EmploymentType | null;
  monthlyExpenses: number;
  houseOwnership: "none" | "one" | "two_or_more" | null;
  purchasePurposeV2: FullPurchasePurpose | null;
  purchaseTiming: PurchaseTiming | null;
  moveinTiming: MoveinTiming | null;
  ltvInternalScore: number;
  existingLoan: ExistingLoanAmount | null;
  recentDelinquency: DelinquencyCount | null;
  cardLoanUsage: CardLoanUsage | null;
  loanRejection: LoanRejection | null;
  monthlyIncomeRange: MonthlyIncomeRange | null;
  existingMonthlyRepayment: MonthlyLoanRepayment | null;
  regions: OfferingRegionTab[];
};
