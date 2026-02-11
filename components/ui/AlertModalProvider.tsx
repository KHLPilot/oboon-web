"use client";

import { useEffect, useRef, useState } from "react";

import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { ALERT_EVENT, type AlertPayload } from "@/shared/alert";

const DEFAULT_TITLE = "알림";

export default function AlertModalProvider() {
  const [alert, setAlert] = useState<AlertPayload | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<AlertPayload>).detail;
      if (!detail?.message) return;
      setAlert(detail);
    };

    window.addEventListener(ALERT_EVENT, handler as EventListener);
    return () => window.removeEventListener(ALERT_EVENT, handler as EventListener);
  }, []);

  const close = () => setAlert(null);

  useEffect(() => {
    if (!alert) return;

    // 알림이 뜬 직후 확인 버튼에 포커스를 줘서
    // 엔터 입력이 뒤 폼 submit으로 전달되지 않게 한다.
    confirmButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== "NumpadEnter") return;
      event.preventDefault();
      event.stopPropagation();
      close();
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [alert]);

  return (
    <Modal open={Boolean(alert)} onClose={close} size="sm">
      <div className="space-y-2">
        <div className="ob-typo-h2 text-(--oboon-text-title)">
          {alert?.title ?? DEFAULT_TITLE}
        </div>
        <div className="ob-typo-body text-(--oboon-text-muted) whitespace-pre-line">
          {alert?.message}
        </div>
        <div className="mt-5">
          <Button
            ref={confirmButtonRef}
            variant="primary"
            shape="pill"
            className="w-full justify-center"
            onClick={close}
          >
            확인
          </Button>
        </div>
      </div>
    </Modal>
  );
}
