const ALLOWED_TAGS = new Set([
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
]);

const VOID_TAGS = new Set(["br", "hr", "img"]);
const BLOCKED_CONTENT_TAGS = [
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "svg",
  "math",
  "noscript",
  "template",
];

const SAFE_CLASS_TOKEN = /^[a-zA-Z0-9:_-]+$/;
const SAFE_TEXT_ALIGN = /^(left|right|center|justify|start|end)$/i;
const SAFE_TEXT_DECORATION = /^(none|underline|line-through)$/i;
const SAFE_FONT_STYLE = /^(normal|italic|oblique)$/i;
const SAFE_FONT_WEIGHT = /^(normal|bold|bolder|lighter|[1-9]00)$/i;
const SAFE_COLOR_VALUE =
  /^(#[0-9a-f]{3,8}|(?:rgb|rgba|hsl|hsla)\([^()]+\)|[a-z]+)$/i;
const SAFE_DATA_IMAGE_URL =
  /^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z0-9+/=\s]+$/i;

function escapeTextNode(value: string) {
  return value.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) =>
      String.fromCodePoint(Number.parseInt(dec, 10)),
    );
}

function escapeAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function sanitizeClassName(value: string) {
  const tokens = value
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0 && SAFE_CLASS_TOKEN.test(token));

  return tokens.length > 0 ? tokens.join(" ") : null;
}

function sanitizeStyle(value: string) {
  const safeDeclarations: string[] = [];

  value
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((declaration) => {
      const colonIndex = declaration.indexOf(":");
      if (colonIndex <= 0) return;

      const property = declaration.slice(0, colonIndex).trim().toLowerCase();
      const rawValue = declaration.slice(colonIndex + 1).trim();
      if (!rawValue) return;

      let allowed = false;

      if (
        (property === "color" || property === "background-color") &&
        SAFE_COLOR_VALUE.test(rawValue)
      ) {
        allowed = true;
      } else if (property === "text-align" && SAFE_TEXT_ALIGN.test(rawValue)) {
        allowed = true;
      } else if (
        (property === "text-decoration" ||
          property === "text-decoration-line") &&
        SAFE_TEXT_DECORATION.test(rawValue)
      ) {
        allowed = true;
      } else if (property === "font-style" && SAFE_FONT_STYLE.test(rawValue)) {
        allowed = true;
      } else if (
        property === "font-weight" &&
        SAFE_FONT_WEIGHT.test(rawValue)
      ) {
        allowed = true;
      }

      if (!allowed) return;
      safeDeclarations.push(`${property}: ${rawValue}`);
    });

  return safeDeclarations.length > 0 ? safeDeclarations.join("; ") : null;
}

function sanitizeUrl(value: string, options: { allowDataImage?: boolean } = {}) {
  const decoded = decodeHtmlEntities(value)
    .replace(/[\u0000-\u001f\u007f\s]+/g, "")
    .trim();

  if (!decoded || decoded.startsWith("//")) {
    return null;
  }

  if (
    decoded.startsWith("/") ||
    decoded.startsWith("./") ||
    decoded.startsWith("../") ||
    decoded.startsWith("#") ||
    decoded.startsWith("?")
  ) {
    return decoded;
  }

  if (options.allowDataImage && SAFE_DATA_IMAGE_URL.test(decoded)) {
    return decoded;
  }

  try {
    const parsed = new URL(decoded);
    if (
      parsed.protocol === "http:" ||
      parsed.protocol === "https:" ||
      parsed.protocol === "mailto:" ||
      parsed.protocol === "tel:"
    ) {
      return decoded;
    }
  } catch {
    return null;
  }

  return null;
}

function sanitizeAttributes(tagName: string, rawAttrs: string) {
  const safeAttributes: string[] = [];
  const attrRegex =
    /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

  for (const match of rawAttrs.matchAll(attrRegex)) {
    const attributeName = match[1]?.toLowerCase();
    const rawValue = match[2] ?? match[3] ?? match[4] ?? "";

    if (!attributeName || attributeName.startsWith("on")) {
      continue;
    }

    if (attributeName === "class") {
      const className = sanitizeClassName(rawValue);
      if (className) {
        safeAttributes.push(`class="${escapeAttribute(className)}"`);
      }
      continue;
    }

    if (attributeName === "style") {
      const style = sanitizeStyle(rawValue);
      if (style) {
        safeAttributes.push(`style="${escapeAttribute(style)}"`);
      }
      continue;
    }

    if (tagName === "a" && attributeName === "href") {
      const href = sanitizeUrl(rawValue);
      if (href) {
        safeAttributes.push(`href="${escapeAttribute(href)}"`);
      }
      continue;
    }

    if (tagName === "a" && attributeName === "target") {
      if (rawValue === "_blank") {
        safeAttributes.push('target="_blank"');
      }
      continue;
    }

    if (tagName === "a" && attributeName === "rel") {
      continue;
    }

    if (tagName === "img" && attributeName === "src") {
      const src = sanitizeUrl(rawValue, { allowDataImage: true });
      if (src) {
        safeAttributes.push(`src="${escapeAttribute(src)}"`);
      }
      continue;
    }

    if (tagName === "img" && attributeName === "alt") {
      safeAttributes.push(`alt="${escapeAttribute(rawValue.trim())}"`);
      continue;
    }

    if (
      (tagName === "td" || tagName === "th") &&
      (attributeName === "colspan" || attributeName === "rowspan")
    ) {
      const numeric = Number.parseInt(rawValue, 10);
      if (Number.isFinite(numeric) && numeric > 0 && numeric <= 100) {
        safeAttributes.push(`${attributeName}="${numeric}"`);
      }
    }
  }

  if (tagName === "a") {
    safeAttributes.push('rel="noopener noreferrer"');
  }

  return safeAttributes.length > 0 ? ` ${safeAttributes.join(" ")}` : "";
}

function stripBlockedContent(html: string) {
  return BLOCKED_CONTENT_TAGS.reduce((acc, tagName) => {
    const blockPattern = new RegExp(
      `<${tagName}\\b[^>]*>[\\s\\S]*?<\\/${tagName}\\s*>`,
      "gi",
    );
    const selfClosingPattern = new RegExp(`<${tagName}\\b[^>]*\\/?>`, "gi");

    return acc.replace(blockPattern, "").replace(selfClosingPattern, "");
  }, html);
}

function sanitizeTag(token: string) {
  const match = token.match(/^<\s*(\/)?\s*([a-zA-Z0-9:-]+)([^>]*)>$/);
  if (!match) {
    return "";
  }

  const [, isClosing, rawTagName, rawAttrs] = match;
  const tagName = rawTagName.toLowerCase();

  if (!ALLOWED_TAGS.has(tagName)) {
    return "";
  }

  if (isClosing) {
    return VOID_TAGS.has(tagName) ? "" : `</${tagName}>`;
  }

  const attrs = sanitizeAttributes(tagName, rawAttrs ?? "");
  return VOID_TAGS.has(tagName)
    ? `<${tagName}${attrs}>`
    : `<${tagName}${attrs}>`;
}

export function sanitizeBriefingHtml(html: string | null | undefined) {
  const raw = (html ?? "")
    .replace(/\u0000/g, "")
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  const stripped = stripBlockedContent(raw);
  const tokens = stripped.split(/(<[^>]+>)/g);

  return tokens
    .map((token) => {
      if (!token) return "";
      if (token.startsWith("<")) {
        return sanitizeTag(token);
      }
      return escapeTextNode(token);
    })
    .join("");
}
