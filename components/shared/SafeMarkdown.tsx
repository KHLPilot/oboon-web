import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

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

const INLINE_TOKEN_RE =
  /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*)/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let matchIndex = 0;

  for (const match of text.matchAll(INLINE_TOKEN_RE)) {
    const fullMatch = match[0];
    const start = match.index ?? 0;

    if (start > lastIndex) {
      nodes.push(text.slice(lastIndex, start));
    }

    const linkText = match[2];
    const href = match[3];
    const strongText = match[4];
    const emText = match[5];
    const key = `${keyPrefix}-${matchIndex++}`;

    if (linkText && href) {
      const safeHref = sanitizeHref(href);
      const isExternal =
        typeof safeHref === "string" &&
        (safeHref.startsWith("http://") || safeHref.startsWith("https://"));

      nodes.push(
        <a
          key={key}
          href={safeHref}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          className="text-(--oboon-primary) underline underline-offset-4"
        >
          {renderInline(linkText, `${key}-link`)}
        </a>,
      );
    } else if (strongText) {
      nodes.push(
        <strong key={key}>{renderInline(strongText, `${key}-strong`)}</strong>,
      );
    } else if (emText) {
      nodes.push(<em key={key}>{renderInline(emText, `${key}-em`)}</em>);
    } else {
      nodes.push(fullMatch);
    }

    lastIndex = start + fullMatch.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function renderInlineWithBreaks(text: string, keyPrefix: string) {
  return text.split("\n").flatMap((part, index) => {
    const nodes = renderInline(part, `${keyPrefix}-${index}`);
    return index === 0
      ? nodes
      : [<br key={`${keyPrefix}-br-${index}`} />, ...nodes];
  });
}

function isUnorderedList(line: string) {
  return /^[-*+]\s+/.test(line);
}

function isOrderedList(line: string) {
  return /^\d+\.\s+/.test(line);
}

function isBlockStart(line: string) {
  return (
    line.startsWith("## ") ||
    line.startsWith("### ") ||
    line.startsWith("> ") ||
    isUnorderedList(line) ||
    isOrderedList(line)
  );
}

function renderBlocks(content: string) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (trimmed.startsWith("### ")) {
      blocks.push(
        <h3
          key={`h3-${i}`}
          className="mb-2 text-sm font-semibold text-(--oboon-text-title)"
        >
          {renderInline(trimmed.slice(4), `h3-${i}`)}
        </h3>,
      );
      i += 1;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      blocks.push(
        <h2
          key={`h2-${i}`}
          className="mb-2 text-base font-semibold text-(--oboon-text-title)"
        >
          {renderInline(trimmed.slice(3), `h2-${i}`)}
        </h2>,
      );
      i += 1;
      continue;
    }

    if (trimmed.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i]?.trim().startsWith("> ")) {
        quoteLines.push((lines[i] ?? "").trim().slice(2));
        i += 1;
      }

      blocks.push(
        <blockquote
          key={`blockquote-${i}`}
          className="mb-3 border-l-2 border-(--oboon-border-default) pl-4 text-(--oboon-text-muted)"
        >
          {renderInlineWithBreaks(quoteLines.join("\n"), `blockquote-${i}`)}
        </blockquote>,
      );
      continue;
    }

    if (isUnorderedList(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && isUnorderedList((lines[i] ?? "").trim())) {
        items.push((lines[i] ?? "").trim().replace(/^[-*+]\s+/, ""));
        i += 1;
      }

      blocks.push(
        <ul key={`ul-${i}`} className="mb-3 list-disc pl-5">
          {items.map((item, index) => (
            <li key={`ul-${i}-${index}`} className="mb-1">
              {renderInline(item, `ul-${i}-${index}`)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    if (isOrderedList(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && isOrderedList((lines[i] ?? "").trim())) {
        items.push((lines[i] ?? "").trim().replace(/^\d+\.\s+/, ""));
        i += 1;
      }

      blocks.push(
        <ol key={`ol-${i}`} className="mb-3 list-decimal pl-5">
          {items.map((item, index) => (
            <li key={`ol-${i}-${index}`} className="mb-1">
              {renderInline(item, `ol-${i}-${index}`)}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    const paragraphLines: string[] = [];
    while (i < lines.length) {
      const current = lines[i] ?? "";
      const currentTrimmed = current.trim();
      if (!currentTrimmed) {
        i += 1;
        break;
      }
      if (paragraphLines.length > 0 && isBlockStart(currentTrimmed)) {
        break;
      }
      paragraphLines.push(current);
      i += 1;
    }

    blocks.push(
      <p key={`p-${i}`} className="mb-3 last:mb-0">
        {renderInlineWithBreaks(paragraphLines.join("\n"), `p-${i}`)}
      </p>,
    );
  }

  return blocks;
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
      {renderBlocks(content)}
    </div>
  );
}
