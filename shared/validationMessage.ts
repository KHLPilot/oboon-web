import { UXCopy } from "@/shared/uxCopy";

type FieldName = "email" | "password" | "generic";

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
