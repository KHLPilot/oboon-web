import type {
  LtvDsrInput,
  LtvDsrPreview,
  MonthlyLoanRepayment,
  MonthlyIncomeRange,
  EmploymentType,
} from "./types";

export function repaymentRangeToMidpoint(range: MonthlyLoanRepayment): number {
  switch (range) {
    case "none":
      return 0;
    case "under_50":
      return 25;
    case "50to100":
      return 75;
    case "100to200":
      return 150;
    case "over_200":
      return 250;
  }
}

export function incomeRangeToMidpoint(range: MonthlyIncomeRange): number {
  switch (range) {
    case "under_200":
      return 150;
    case "200to300":
      return 250;
    case "300to500":
      return 400;
    case "500to700":
      return 600;
    case "over_700":
      return 750;
  }
}

export function employmentIncomeMultiplier(type: EmploymentType): number {
  switch (type) {
    case "employee":
      return 1.0;
    case "self_employed":
      return 0.8;
    case "freelancer":
      return 0.7;
    case "other":
      return 0.7;
  }
}

export function calculateLtvInternalScore(input: LtvDsrInput): number {
  let score = 0;

  // 1. House ownership (25pt)
  if (input.houseOwnership === "none") score += 25;
  else if (input.houseOwnership === "one") score += 15;
  else score += 5;

  // 2. Existing mortgage (20pt)
  if (input.existingLoan === "none") score += 20;
  else if (input.existingLoan === "under_1eok") score += 15;
  else if (input.existingLoan === "1to3eok") score += 10;
  else score += 5;

  // 3. Delinquency (15pt) - auto full score if no loan
  if (input.existingLoan === "none") {
    score += 15;
  } else {
    if (input.recentDelinquency === "none") score += 15;
    else if (input.recentDelinquency === "once") score += 8;
    else score += 3;
  }

  // 4. Card loan usage (10pt)
  if (input.cardLoanUsage === "none") score += 10;
  else if (input.cardLoanUsage === "1to2") score += 6;
  else score += 2;

  // 5. Loan rejection (10pt) - auto full score if no loan
  if (input.existingLoan === "none") {
    score += 10;
  } else {
    if (input.loanRejection === "none") score += 10;
    else score += 3;
  }

  // 6. Employment stability (10pt)
  if (input.employmentType === "employee") score += 10;
  else if (input.employmentType === "self_employed") score += 7;
  else if (input.employmentType === "freelancer") score += 5;
  else score += 4;

  // 7. Income level (10pt)
  if (input.monthlyIncomeRange === "over_700") score += 10;
  else if (input.monthlyIncomeRange === "500to700") score += 8;
  else if (input.monthlyIncomeRange === "300to500") score += 6;
  else if (input.monthlyIncomeRange === "200to300") score += 4;
  else score += 2;

  return score;
}

export function ltvScoreToPoints(score: number): { points: number; label: string } {
  if (score >= 85) return { points: 10, label: "대출 가능성 높음" };
  if (score >= 70) return { points: 8, label: "대출 가능 보통" };
  if (score >= 55) return { points: 6, label: "대출 가능 낮음" };
  if (score >= 40) return { points: 4, label: "대출 확인 필요" };
  return { points: 2, label: "대출 불가능" };
}

function dsrPointsFromPercent(dsr: number): number {
  if (dsr <= 30) return 10;
  if (dsr <= 40) return 8;
  if (dsr <= 50) return 5;
  return 2;
}

function dsrLabelFromPoints(points: number): string {
  if (points >= 10) return "안정";
  if (points >= 8) return "보통";
  if (points >= 5) return "위험";
  return "대출 어려움";
}

export function calculateLtvDsrPreview(
  input: LtvDsrInput,
  estimatedNewLoanPaymentManwon = 0,
): LtvDsrPreview {
  const ltvInternalScore = calculateLtvInternalScore(input);
  const { points: ltvPoints, label: ltvLabel } = ltvScoreToPoints(ltvInternalScore);

  const adjustedIncome =
    incomeRangeToMidpoint(input.monthlyIncomeRange) *
    employmentIncomeMultiplier(input.employmentType);
  const existingRepayment = repaymentRangeToMidpoint(input.existingMonthlyRepayment);

  let dsrEstimate: number | null = null;
  let dsrPoints = 2;

  if (adjustedIncome > 0) {
    const totalRepayment = existingRepayment + estimatedNewLoanPaymentManwon;
    dsrEstimate = (totalRepayment / adjustedIncome) * 100;
    dsrPoints = dsrPointsFromPercent(dsrEstimate);
  }

  return {
    ltvInternalScore,
    ltvPoints,
    ltvLabel,
    dsrEstimate,
    dsrPoints,
    dsrLabel: dsrLabelFromPoints(dsrPoints),
    totalPoints: ltvPoints + dsrPoints,
  };
}
