import { sanitizeBriefingHtml } from "@/lib/briefing/sanitizeHtml";
import { cn } from "@/lib/utils/cn";

type Props = {
  html: string;
  className?: string;
};

export default function BriefingHtmlRenderer({ html, className }: Props) {
  const sanitized = sanitizeBriefingHtml(html);

  return (
    <div
      className={cn("ob-richtext", className)}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
