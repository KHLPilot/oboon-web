"use client";

import { useEffect, useState } from "react";

import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { ALERT_EVENT, type AlertPayload } from "@/shared/alert";

const DEFAULT_TITLE = "알림";

export default function AlertModalProvider() {
  const [alert, setAlert] = useState<AlertPayload | null>(null);

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
