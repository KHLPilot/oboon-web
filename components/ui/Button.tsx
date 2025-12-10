"use client";

export default function Button({
  children,
  onClick,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="inline-flex h-11 items-center justify-center rounded-xl bg-(--oboon-primary) px-5 text-sm font-semibold text-white transition hover:bg-(--oboon-primary-hover)"
    >
      {children}
    </button>
  );
}
