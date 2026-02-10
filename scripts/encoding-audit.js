const fs = require("fs");
const path = require("path");

const root = process.cwd();
const outDir = path.join(root, "docs");
const mdPath = path.join(outDir, "encoding-audit.md");
const jsonPath = path.join(outDir, "encoding-audit.json");
const fixesPath = path.join(outDir, "encoding-fixes.md");

const excludeDirs = new Set([
  "node_modules",
  ".next",
  "dist",
  "build",
  "out",
  "coverage",
  ".git",
]);

const binaryExts = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".ico",
  ".pdf",
  ".lock",
]);

const mojibakePattern =
  /(Ã.|Â.|â€|â€™|â€œ|â€¢|ê¸°|ë…|ì…|í•|ì•|ì—|ë“|ìž)/;
const replacementChar = "\uFFFD";

const rules = [
  "replacement-char",
  "double-question",
  "sr-only-corrupt",
  "question-heuristic",
  "mojibake-pattern",
];

function isCommentLine(line) {
  const t = line.trim();
  return (
    t.startsWith("//") ||
    t.startsWith("/*") ||
    t.startsWith("*") ||
    t.startsWith("#")
  );
}

function getStringRanges(line) {
  const ranges = [];
  let quote = null;
  let start = -1;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (!quote) {
      if (ch === "'" || ch === '"' || ch === "`") {
        quote = ch;
        start = i;
      }
      continue;
    }
    if (ch === "\\") {
      i += 1;
      continue;
    }
    if (ch === quote) {
      ranges.push([start, i]);
      quote = null;
      start = -1;
    }
  }
  return ranges;
}

function inRanges(idx, ranges) {
  return ranges.some(([s, e]) => idx >= s && idx <= e);
}

function isInComment(line, idx) {
  const lineComment = line.indexOf("//");
  if (lineComment >= 0 && idx >= lineComment) return true;
  const blockStart = line.indexOf("/*");
  if (blockStart >= 0 && idx >= blockStart) {
    const blockEnd = line.indexOf("*/", blockStart + 2);
    return blockEnd === -1 || idx <= blockEnd;
  }
  return false;
}

function lineHasCorruption(line) {
  return (
    line.includes(replacementChar) ||
    line.includes("�") ||
    mojibakePattern.test(line)
  );
}

function findFiles(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  const out = [];
  for (const item of items) {
    if (item.isDirectory()) {
      if (excludeDirs.has(item.name)) continue;
      out.push(...findFiles(path.join(dir, item.name)));
    } else {
      const ext = path.extname(item.name).toLowerCase();
      if (binaryExts.has(ext)) continue;
      out.push(path.join(dir, item.name));
    }
  }
  return out;
}

function findSrOnlyText(lines, i) {
  const line = lines[i];
  const sameLine = line.match(/sr-only[^>]*>([^<]*)<\/[^>]*>/);
  if (sameLine) {
    return { lineIndex: i, text: sameLine[1], sameLine: true };
  }

  const next = lines[i + 1];
  const nextNext = lines[i + 2];
  if (
    next &&
    next.trim() &&
    !next.includes("<") &&
    nextNext &&
    nextNext.includes("</")
  ) {
    return { lineIndex: i + 1, text: next.trim(), sameLine: false };
  }
  return null;
}

function applySrOnlyFix(filePath, lines, fixes) {
  const fixRules = [
    {
      file: /components[\\/]+ui[\\/]+Button\.tsx$/i,
      text: "로딩 중",
    },
    {
      file: /components[\\/]+ui[\\/]+DatePicker\.tsx$/i,
      text: "달력 열기",
    },
    {
      file: /features[\\/]+offerings[\\/]+FilterBar\.tsx$/i,
      text: "검색",
    },
    {
      file: /app[\\/]+company[\\/]+properties[\\/]+\\[id\\][\\/]+timeline[\\/]+page\.tsx$/i,
      text: "날짜 선택",
    },
  ];

  const candidates = lines
    .map((line, idx) => ({ line, idx }))
    .filter((item) => /sr-only/.test(item.line));

  for (const { idx } of candidates) {
    const sr = findSrOnlyText(lines, idx);
    if (!sr) continue;
    if (!lineHasCorruption(sr.text)) continue;

    const rule = fixRules.find((r) => r.file.test(filePath));
    if (!rule) continue;

    const beforeLine = lines[sr.lineIndex];
    let afterLine = beforeLine;

    if (sr.sameLine) {
      afterLine = beforeLine.replace(
        />[^<]*</,
        `>${rule.text}<`
      );
    } else {
      afterLine = `${rule.text}`;
    }

    if (beforeLine !== afterLine) {
      lines[sr.lineIndex] = afterLine;
      fixes.push({
        file: filePath,
        line: sr.lineIndex + 1,
        before: beforeLine,
        after: afterLine,
        context: lines
          .slice(Math.max(0, sr.lineIndex - 2), sr.lineIndex + 3)
          .join("\n"),
        reason: "sr-only 텍스트가 깨져 있고 문맥이 명확함",
      });
    }
  }
}

function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const matches = new Map();
  const fixes = [];
  const files = findFiles(root);

  for (const file of files) {
    const rel = path.relative(root, file);
    if (rel.startsWith("docs" + path.sep)) continue;
    if (rel.startsWith("report" + path.sep)) continue;
    if (rel === path.join("scripts", "encoding-audit.js")) continue;

    const content = fs.readFileSync(file, "utf8");
    const lines = content.split(/\r?\n/);
    const srOnlyLines = [];

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const lineNum = i + 1;
      const key = `${rel}:${lineNum}`;
      const lineRules = new Set();

      if (line.includes("sr-only")) {
        srOnlyLines.push(i);
      }

      if (line.includes(replacementChar) || line.includes("�")) {
        lineRules.add("replacement-char");
      }

      if (mojibakePattern.test(line)) {
        lineRules.add("mojibake-pattern");
      }

      if (isCommentLine(line)) {
        const qCount = (line.match(/\?/g) || []).length;
        if (qCount >= 3 || (line.length > 0 && qCount / line.length > 0.08)) {
          lineRules.add("question-heuristic");
        }
      } else {
        const ranges = getStringRanges(line);
        if (ranges.length > 0) {
          let textLen = 0;
          let qCount = 0;
          for (const [s, e] of ranges) {
            const segment = line.slice(s + 1, e);
            textLen += segment.length;
            qCount += (segment.match(/\?/g) || []).length;
          }
          if (qCount >= 3 || (textLen > 0 && qCount / textLen > 0.08)) {
            lineRules.add("question-heuristic");
          }
        }
      }

      if (line.includes("??")) {
        const ranges = getStringRanges(line);
        let foundInText = false;
        let idx = line.indexOf("??");
        while (idx >= 0) {
          if (inRanges(idx, ranges) || isInComment(line, idx)) {
            foundInText = true;
            break;
          }
          idx = line.indexOf("??", idx + 2);
        }
        if (foundInText) {
          lineRules.add("double-question");
        }
      }

      if (lineRules.size > 0) {
        const existing = matches.get(key) || {
          file: rel,
          line: lineNum,
          text: line,
          rules: new Set(),
        };
        for (const r of lineRules) existing.rules.add(r);
        matches.set(key, existing);
      }
    }

    for (const idx of srOnlyLines) {
      const sr = findSrOnlyText(lines, idx);
      if (!sr) continue;
      if (!lineHasCorruption(sr.text)) continue;
      const key = `${rel}:${sr.lineIndex + 1}`;
      const existing = matches.get(key) || {
        file: rel,
        line: sr.lineIndex + 1,
        text: lines[sr.lineIndex],
        rules: new Set(),
      };
      existing.rules.add("sr-only-corrupt");
      matches.set(key, existing);
    }

    applySrOnlyFix(file, lines, fixes);

    if (fixes.some((f) => f.file === file)) {
      fs.writeFileSync(file, lines.join("\n"), "utf8");
    }
  }

  const records = Array.from(matches.values()).map((m) => {
    const rulesArr = Array.from(m.rules);
    const isComment = isCommentLine(m.text);
    let risk = "Low";
    if (rulesArr.includes("sr-only-corrupt")) {
      risk = "High";
    } else if (
      rulesArr.some((r) =>
        ["replacement-char", "double-question", "question-heuristic"].includes(r)
      )
    ) {
      risk = isComment ? "Low" : "Med";
    } else if (rulesArr.includes("mojibake-pattern")) {
      risk = "Low";
    }

    return {
      file: m.file,
      line: m.line,
      text: m.text,
      rules: rulesArr,
      risk,
    };
  });

  const totals = {
    totalMatches: records.length,
    totalFiles: new Set(records.map((r) => r.file)).size,
  };

  const byRule = {};
  for (const r of rules) byRule[r] = 0;
  for (const rec of records) {
    for (const r of rec.rules) {
      byRule[r] = (byRule[r] || 0) + 1;
    }
  }

  const byFileByRule = {};
  for (const rule of rules) {
    const counts = {};
    for (const rec of records) {
      if (!rec.rules.includes(rule)) continue;
      counts[rec.file] = (counts[rec.file] || 0) + 1;
    }
    const top = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([file, count]) => ({ file, count }));
    byFileByRule[rule] = top;
  }

  const json = {
    rules,
    totals,
    byRule,
    topFilesByRule: byFileByRule,
    matches: records,
  };

  fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2), "utf8");

  const mdLines = [];
  mdLines.push("# Encoding Audit Report");
  mdLines.push("");
  mdLines.push("## 탐지 규칙 요약");
  mdLines.push(
    "- replacement-char: `�`(U+FFFD) 포함"
  );
  mdLines.push("- double-question: 문자열/주석 내 `??` 패턴");
  mdLines.push("- sr-only-corrupt: sr-only 주변에 `?` 또는 `�` 포함");
  mdLines.push(
    "- question-heuristic: `?` 다량(>=3) 또는 비율 0.08 초과"
  );
  mdLines.push(
    "- mojibake-pattern: 흔한 모지바케 시퀀스 탐지"
  );
  mdLines.push("");
  mdLines.push(`총 매칭 수: ${totals.totalMatches}`);
  mdLines.push(`총 파일 수: ${totals.totalFiles}`);
  mdLines.push("");
  mdLines.push("## 카테고리별 Top 파일");
  for (const rule of rules) {
    mdLines.push(`### ${rule}`);
    const top = byFileByRule[rule];
    if (!top || top.length === 0) {
      mdLines.push("- (no matches)");
    } else {
      for (const t of top) {
        mdLines.push(`- ${t.file} (${t.count})`);
      }
    }
  }
  mdLines.push("");
  mdLines.push("## 상세 매칭");
  for (const rec of records) {
    mdLines.push(`- ${rec.file}:${rec.line}`);
    mdLines.push(`  - rule: ${rec.rules.join(", ")}`);
    mdLines.push(`  - risk: ${rec.risk}`);
    mdLines.push(`  - line: ${rec.text}`);
  }

  const riskScore = { High: 3, Med: 2, Low: 1 };
  const topCandidates = [...records]
    .sort((a, b) => {
      const r = (riskScore[b.risk] || 0) - (riskScore[a.risk] || 0);
      if (r !== 0) return r;
      return (b.rules?.length || 0) - (a.rules?.length || 0);
    })
    .slice(0, 10);

  mdLines.push("");
  mdLines.push("## 사람이 확인해야 할 Top 10 후보");
  if (topCandidates.length === 0) {
    mdLines.push("- (no matches)");
  } else {
    for (const rec of topCandidates) {
      mdLines.push(`- ${rec.file}:${rec.line} (${rec.risk})`);
      mdLines.push(`  - rule: ${rec.rules.join(", ")}`);
      mdLines.push(`  - line: ${rec.text}`);
    }
  }
  mdLines.push("");
  mdLines.push("## 빠른 CLI 검색 명령");
  mdLines.push("- `rg -n \"�\" .`");
  mdLines.push("- `rg -n \"\\\\?\\\\?+\" .`");
  mdLines.push("- `rg -n \"sr-only\" .`");
  mdLines.push(
    "- `rg -n \"(Ã.|Â.|â€|â€™|â€œ|ê¸°|ë…|ì…)\" .`"
  );

  fs.writeFileSync(mdPath, mdLines.join("\n"), "utf8");

  if (fixes.length > 0) {
    const fixLines = [];
    fixLines.push("# Encoding Fixes (Auto)");
    fixLines.push("");
    for (const fix of fixes) {
      fixLines.push(`## ${fix.file}:${fix.line}`);
      fixLines.push(`- reason: ${fix.reason}`);
      fixLines.push("```diff");
      fixLines.push(`- ${fix.before}`);
      fixLines.push(`+ ${fix.after}`);
      fixLines.push("```");
      fixLines.push("```text");
      fixLines.push(fix.context);
      fixLines.push("```");
      fixLines.push("");
    }
    fs.writeFileSync(fixesPath, fixLines.join("\n"), "utf8");
  }
}

main();
