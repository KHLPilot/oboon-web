import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils/cn";

const ALLOWED_MARKDOWN_ELEMENTS = [
  "a",
  "blockquote",
  "br",
  "em",
  "h2",
  "h3",
  "li",
  "ol",
  "p",
  "strong",
  "ul",
] as const;

type SafeMarkdownProps = {
  content: string;
  className?: string;
};

function sanitizeHref(href?: string) {
  if (!href) return undefined;
  if (href.startsWith("/") || href.startsWith("#")) return href;

  try {
    const parsed = new URL(href);
    if (
      parsed.protocol === "http:" ||
      parsed.protocol === "https:" ||
      parsed.protocol === "mailto:" ||
      parsed.protocol === "tel:"
    ) {
      return href;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export default function SafeMarkdown({
  content,
  className,
}: SafeMarkdownProps) {
  return (
    <div
      className={cn(
        "ob-md prose max-w-none whitespace-pre-wrap break-words text-(--oboon-text-body)",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        allowedElements={[...ALLOWED_MARKDOWN_ELEMENTS]}
        components={{
          a: ({ href, children }) => {
            const safeHref = sanitizeHref(href);
            const isExternal =
              typeof safeHref === "string" &&
              (safeHref.startsWith("http://") || safeHref.startsWith("https://"));

            return (
              <a
                href={safeHref}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                className="text-(--oboon-primary) underline underline-offset-4"
              >
                {children}
              </a>
            );
          },
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          h2: ({ children }) => (
            <h2 className="mb-2 text-base font-semibold text-(--oboon-text-title)">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 text-sm font-semibold text-(--oboon-text-title)">
              {children}
            </h3>
          ),
          ul: ({ children }) => <ul className="mb-3 list-disc pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 list-decimal pl-5">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="mb-3 border-l-2 border-(--oboon-border-default) pl-4 text-(--oboon-text-muted)">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
