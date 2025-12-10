export default function Input(
  props: React.InputHTMLAttributes<HTMLInputElement>
) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-(--oboon-primary)"
    />
  );
}
