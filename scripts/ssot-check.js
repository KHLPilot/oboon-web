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

// ─── helpers ────────────────────────────────────────────────────────────────

function walk(dir, files) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (entry.isFile() && CODE_EXT.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
}

function rel(filePath) {
  return path.relative(ROOT, filePath);
}

/** match.index → { line, snippet } */
function getLineInfo(content, index) {
  const before = content.slice(0, index);
  const line = before.split(/\r?\n/).length;
  const lineStart = before.lastIndexOf("\n") + 1;
  const lineEnd = content.indexOf("\n", index);
  const raw =
    lineEnd === -1 ? content.slice(lineStart) : content.slice(lineStart, lineEnd);
  return { line, snippet: raw.trim() };
}

/**
 * 주석 줄 여부 판별
 * - `//` : 인라인 주석
 * - `*`  : JSDoc 블록 주석 (`* description`)
 * - `-`  : JSDoc 내 bullet (`   - description`, * 없이 들여쓰기된 경우)
 */
function isCommentSnippet(snippet) {
  return snippet.startsWith("//") || snippet.startsWith("*") || snippet.startsWith("- ");
}

function hasSsoIgnoreSnippet(snippet) {
  return snippet.includes("// ssot-ignore");
}

function segmentOf(filePath) {
  return filePath.split(path.sep);
}

function hasSegment(filePath, segment) {
  return segmentOf(filePath).includes(segment);
}

function isInApp(filePath) {
  return filePath.includes(`${path.sep}app${path.sep}`);
}

// ─── scan ───────────────────────────────────────────────────────────────────

const files = [];
for (const dir of TARGET_DIRS) walk(path.join(ROOT, dir), files);

/** @type {Array<{file:string, line:number, snippet:string, literal:string}>} */
const statusHits = [];       // Rule 1: READY/OPEN/CLOSED 리터럴을 domain/ 밖에서 사용

/** @type {Array<{file:string, line:number, snippet:string}>} */
const supabaseHits = [];     // Rule 2: app/** 에서 supabase.from().select() 직접 사용

/** @type {Array<{file:string}>} */
const domainReactHits = [];  // Rule 3: domain/ 에서 React import

/** @type {Array<{file:string}>} */
const domainSupabaseHits = []; // Rule 4: domain/ 에서 Supabase import

/** @type {Array<{file:string}>} */
const serviceReactHits = [];   // Rule 5: services/ 에서 React import

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  const inDomain   = hasSegment(file, "domain");
  const inServices = hasSegment(file, "services");
  const inApp      = isInApp(file);

  // Rule 1 — status literal outside domain/
  // 파일마다 새 RegExp 생성: /g 플래그 lastIndex 누적 방지
  if (!inDomain) {
    const seen = new Set(); // 동일 줄 중복 억제
    const pattern = /\b(READY|OPEN|CLOSED)\b/g;
    let match;
    while ((match = pattern.exec(content))) {
      const info = getLineInfo(content, match.index);
      if (isCommentSnippet(info.snippet)) continue;
      if (hasSsoIgnoreSnippet(info.snippet)) continue;
      const key = `${file}:${info.line}`;
      if (seen.has(key)) continue; // 같은 줄 여러 match → 1회만
      seen.add(key);
      // 해당 줄에 등장하는 모든 리터럴을 수집
      const literals = [...info.snippet.matchAll(/\b(READY|OPEN|CLOSED)\b/g)]
        .map((m) => m[1])
        .filter((v, i, a) => a.indexOf(v) === i)
        .join("|");
      statusHits.push({ file: rel(file), line: info.line, snippet: info.snippet, literal: literals });
    }
  }

  // Rule 2 — supabase.from().select() in app/**
  if (inApp) {
    const pattern = /supabase\s*\.\s*(?:from\s*\([\s\S]*?\)\s*\.\s*(?:select|insert|update|upsert|delete)|rpc)\s*\(/g;
    let match;
    while ((match = pattern.exec(content))) {
      const info = getLineInfo(content, match.index);
      if (isCommentSnippet(info.snippet)) continue;
      if (hasSsoIgnoreSnippet(info.snippet)) continue;
      supabaseHits.push({ file: rel(file), line: info.line, snippet: info.snippet });
    }
  }

  // Rule 3 — domain/ 에서 React import 금지
  if (inDomain && /from\s+['"]react['"]/.test(content)) {
    domainReactHits.push({ file: rel(file) });
  }

  // Rule 4 — domain/ 에서 Supabase import 금지
  if (inDomain && /from\s+['"]@supabase\//.test(content)) {
    domainSupabaseHits.push({ file: rel(file) });
  }

  // Rule 5 — services/ 에서 React import 금지
  if (inServices && /from\s+['"]react['"]/.test(content)) {
    serviceReactHits.push({ file: rel(file) });
  }
}

// ─── report ─────────────────────────────────────────────────────────────────

const allHits = [statusHits, supabaseHits, domainReactHits, domainSupabaseHits, serviceReactHits];
const total   = allHits.reduce((s, h) => s + h.length, 0);

if (total === 0) {
  console.log("✓ SSOT check: OK (Rule 1~5 모두 통과)");
  process.exit(0);
}

console.error(`✗ SSOT check failed — ${total} violation(s)\n`);
const ruleSummaries = [
  ["Rule 1", statusHits.length],
  ["Rule 2", supabaseHits.length],
  ["Rule 3", domainReactHits.length],
  ["Rule 4", domainSupabaseHits.length],
  ["Rule 5", serviceReactHits.length],
].filter(([, count]) => count > 0);

if (ruleSummaries.length > 0) {
  console.error(`  ${ruleSummaries.map(([rule, count]) => `${rule}: ${count}건`).join(" | ")}`);
  console.error("");
}

if (statusHits.length > 0) {
  console.error(`Rule 1 [${statusHits.length}]: READY/OPEN/CLOSED 리터럴을 domain/ 밖에서 사용`);
  console.error(`  → features/**/domain/ 의 상수/타입을 import 해서 사용하세요`);
  for (const h of statusHits) {
    console.error(`  ${h.file}:${h.line} [${h.literal}]  ${h.snippet}`);
  }
  console.error("");
}

if (supabaseHits.length > 0) {
  console.error(`Rule 2 [${supabaseHits.length}]: app/** 에서 Supabase 직접 호출 (select/insert/update/upsert/delete/rpc)`);
  console.error(`  → features/**/services/ 레이어를 통해 DB에 접근하세요`);
  for (const h of supabaseHits) {
    console.error(`  ${h.file}:${h.line}  ${h.snippet}`);
  }
  console.error("");
}

if (domainReactHits.length > 0) {
  console.error(`Rule 3 [${domainReactHits.length}]: domain/ 에서 React import 금지`);
  console.error(`  → domain/ 은 순수 TypeScript만 허용합니다`);
  for (const h of domainReactHits) console.error(`  ${h.file}`);
  console.error("");
}

if (domainSupabaseHits.length > 0) {
  console.error(`Rule 4 [${domainSupabaseHits.length}]: domain/ 에서 Supabase import 금지`);
  console.error(`  → domain/ 은 순수 TypeScript만 허용합니다`);
  for (const h of domainSupabaseHits) console.error(`  ${h.file}`);
  console.error("");
}

if (serviceReactHits.length > 0) {
  console.error(`Rule 5 [${serviceReactHits.length}]: services/ 에서 React import 금지`);
  console.error(`  → services/ 는 서버 사이드 로직 전용입니다`);
  for (const h of serviceReactHits) console.error(`  ${h.file}`);
  console.error("");
}

process.exit(1);
