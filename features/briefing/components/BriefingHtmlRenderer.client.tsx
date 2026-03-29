"use client";

import { useMemo } from "react";
import DOMPurify from "dompurify";

type Props = {
  html: string;
  className?: string;
};

export default function BriefingHtmlRenderer({ html, className }: Props) {
  const sanitized = useMemo(() => {
    if (typeof window === "undefined") return html;

    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        "p",
        "br",
        "strong",
        "em",
        "u",
        "s",
        "h1",
        "h2",
        "h3",
        "h4",
        "ul",
        "ol",
        "li",
        "blockquote",
        "pre",
        "code",
        "a",
        "img",
        "table",
        "thead",
        "tbody",
        "tr",
        "th",
        "td",
        "hr",
        "span",
        "div",
      ],
      ALLOWED_ATTR: ["href", "src", "alt", "class", "style", "target", "rel"],
    });
  }, [html]);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
