 
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const TARGET_DIRS = ["app", "features", "components", "shared", "lib"];
const IGNORE_DIRS = new Set([
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage",
  "report",
  "result",
]);

const CODE_EXT = new Set([".ts", ".tsx", ".js", ".jsx"]);

const statusPattern = /\b(READY|OPEN|CLOSED)\b/g;
const supabaseSelectPattern =
  /supabase\s*\.\s*from\s*\([\s\S]*?\)\s*\.\s*select\s*\(/g;

function walk(dir, files) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (CODE_EXT.has(ext)) files.push(full);
    }
  }
}

function getLineInfo(content, index) {
  const before = content.slice(0, index);
  const line = before.split(/\r?\n/).length;
  const lineStart = before.lastIndexOf("\n") + 1;
  const lineEnd = content.indexOf("\n", index);
  const rawLine =
    lineEnd === -1 ? content.slice(lineStart) : content.slice(lineStart, lineEnd);
  return { line, snippet: rawLine.trim() };
}

function isInDomain(filePath) {
  const parts = filePath.split(path.sep);
  return parts.includes("domain");
}

function rel(filePath) {
  return path.relative(ROOT, filePath);
}

const files = [];
for (const dir of TARGET_DIRS) {
  walk(path.join(ROOT, dir), files);
}

const statusHits = [];
const supabaseHits = [];

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");

  if (!isInDomain(file)) {
    let match;
    while ((match = statusPattern.exec(content))) {
      const info = getLineInfo(content, match.index);
      statusHits.push({
        file: rel(file),
        line: info.line,
        snippet: info.snippet,
        literal: match[1],
      });
    }
  }

  if (file.includes(`${path.sep}app${path.sep}`)) {
    let match;
    while ((match = supabaseSelectPattern.exec(content))) {
      const info = getLineInfo(content, match.index);
      supabaseHits.push({
        file: rel(file),
        line: info.line,
        snippet: info.snippet,
      });
    }
  }
}

const hasViolations = statusHits.length > 0 || supabaseHits.length > 0;

if (!hasViolations) {
  console.log("SSOT check: OK");
  process.exit(0);
}

console.error("SSOT check failed.");
if (statusHits.length > 0) {
  console.error("\nRule 1: READY/OPEN/CLOSED used outside domain/");
  statusHits.forEach((hit) => {
    console.error(
      `- ${hit.file}:${hit.line} [${hit.literal}] ${hit.snippet || ""}`
    );
  });
}

if (supabaseHits.length > 0) {
  console.error("\nRule 2: supabase.from().select() used in app/**");
  supabaseHits.forEach((hit) => {
    console.error(`- ${hit.file}:${hit.line} ${hit.snippet || ""}`);
  });
}

process.exit(1);
