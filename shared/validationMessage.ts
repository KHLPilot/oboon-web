import { showAlert } from "@/shared/alert";
import { UXCopy } from "@/shared/uxCopy";

type FieldName = "email" | "password" | "generic";

function topicParticle(label: string) {
  const lastChar = label.charCodeAt(label.length - 1);
  const isHangul = lastChar >= 0xac00 && lastChar <= 0xd7a3;
  if (!isHangul) return "";

  const hasJong = (lastChar - 0xac00) % 28 !== 0;
  return hasJong ? "은" : "는";
}

export function requiredMessage(label?: string) {
  if (label && label.trim() !== "") {
    const trimmed = label.trim();
    const particle = topicParticle(trimmed);
    return particle
      ? `${trimmed}${particle} ${UXCopy.validation.required}`
      : `${trimmed} ${UXCopy.validation.required}`;
  }
  return UXCopy.validation.required;
}

export function validateRequired(value: string, label?: string): string | null {
  if (!value || value.trim() === "") {
    return requiredMessage(label);
  }
  return null;
}

export function validateRequiredOrShowModal(
  value: string,
  label?: string,
  title: string = "입력 오류"
): boolean {
  const message = validateRequired(value, label);
  if (message) {
    showAlert(message, title);
    return false;
  }
  return true;
}

export function validationMessageFor(
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  field: FieldName = "generic"
) {
  const v = el.validity;

  // 1) 비어있음
  if (v.valueMissing) {
    if (field === "password") return UXCopy.validation.passwordRequired;
    return UXCopy.validation.required;
  }

  // 2) 이메일 형식
  if (v.typeMismatch && (el as HTMLInputElement).type === "email") {
    return UXCopy.validation.email;
  }

  // 3) 길이 제약
  if (v.tooShort) {
    const min = (el as HTMLInputElement).minLength;
    return UXCopy.validation.tooShort(
      Number.isFinite(min) && min > 0 ? min : 8
    );
  }
  if (v.tooLong) {
    const max = (el as HTMLInputElement).maxLength;
    return UXCopy.validation.tooLong(
      Number.isFinite(max) && max > 0 ? max : 50
    );
  }

  // 4) 패턴
  if (v.patternMismatch) {
    return UXCopy.validation.pattern;
  }

  // 5) 그 외
  return UXCopy.validation.generic;
}
