"use client";

export default function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur">
      <div className="w-full max-w-md rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-6 shadow-lg">
        {children}

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-xl bg-(--oboon-primary) px-4 py-2 text-sm font-semibold text-white"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
