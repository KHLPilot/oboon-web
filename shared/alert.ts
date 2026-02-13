import { toKoreanErrorMessage } from "@/shared/errorMessage";

export type AlertPayload = {
  message: string;
  title?: string;
};

export const ALERT_EVENT = "oboon:alert";

export function showAlert(message: string, title?: string) {
  if (typeof window === "undefined") return;
  if (!message || message.trim() === "") return;

  const normalizedMessage = toKoreanErrorMessage(message);

  window.dispatchEvent(
    new CustomEvent<AlertPayload>(ALERT_EVENT, {
      detail: { message: normalizedMessage, title },
    }),
  );
}
