import type { FinalGrade5 } from "@/features/condition-validation/domain/types";

export function grade5DetailLabel(grade: FinalGrade5): string {
  switch (grade) {
    case "GREEN":
      return "충족";
    case "LIME":
      return "거의 충족";
    case "YELLOW":
      return "검토";
    case "ORANGE":
      return "어려움";
    case "RED":
      return "미충족";
  }
}
