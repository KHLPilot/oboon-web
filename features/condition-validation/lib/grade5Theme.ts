import type { FinalGrade5 } from "@/features/condition-validation/domain/types";
import { grade5DetailLabel } from "@/features/condition-validation/lib/grade5Labels";

type Grade5ToneKey = "green" | "lime" | "yellow" | "orange" | "red";

export type Grade5ToneMeta = {
  chipLabel: string;
  color: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  solidClassName: string;
  textClassName: string;
  badgeClassName: string;
};

const TONE_KEY_BY_GRADE: Record<FinalGrade5, Grade5ToneKey> = {
  GREEN: "green",
  LIME: "lime",
  YELLOW: "yellow",
  ORANGE: "orange",
  RED: "red",
};

export function getGrade5ToneMeta(grade: FinalGrade5): Grade5ToneMeta {
  const toneKey = TONE_KEY_BY_GRADE[grade];

  return {
    chipLabel: grade5DetailLabel(grade),
    color: `var(--oboon-grade-${toneKey})`,
    textColor: `var(--oboon-grade-${toneKey}-text)`,
    bgColor: `var(--oboon-grade-${toneKey}-bg)`,
    borderColor: `var(--oboon-grade-${toneKey}-border)`,
    solidClassName: `bg-(--oboon-grade-${toneKey})`,
    textClassName: `text-(--oboon-grade-${toneKey}-text)`,
    badgeClassName:
      `border-(--oboon-grade-${toneKey}-border) ` +
      `bg-(--oboon-grade-${toneKey}-bg) ` +
      `text-(--oboon-grade-${toneKey}-text)`,
  };
}
