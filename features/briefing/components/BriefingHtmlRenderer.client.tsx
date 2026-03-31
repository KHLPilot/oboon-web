import { sanitizeBriefingHtml } from "@/lib/briefing/sanitizeHtml";

type Props = {
  html: string;
  className?: string;
};

export default function BriefingHtmlRenderer({ html, className }: Props) {
  const sanitized = sanitizeBriefingHtml(html);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
