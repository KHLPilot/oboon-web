export default function Footer() {
  return (
    <footer className="mt-20 border-t border-(--oboon-border-default) bg-(--oboon-bg-surface) py-8">
      <div className="mx-auto max-w-6xl px-4 text-xs text-(--oboon-text-muted)">
        © {new Date().getFullYear()} OBOON AI. All rights reserved.
      </div>
    </footer>
  );
}
