import type { FinalGrade5 } from "@/features/condition-validation/domain/types";

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

const CHIP_LABEL_BY_GRADE: Record<FinalGrade5, string> = {
  GREEN: "안정",
  LIME: "양호",
  YELLOW: "검토",
  ORANGE: "주의",
  RED: "위험",
};

export function getGrade5ToneMeta(grade: FinalGrade5): Grade5ToneMeta {
  const toneKey = TONE_KEY_BY_GRADE[grade];

  return {
    chipLabel: CHIP_LABEL_BY_GRADE[grade],
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
