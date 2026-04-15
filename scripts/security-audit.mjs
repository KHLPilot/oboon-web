import { spawnSync } from "node:child_process";

const AUDIT_ENDPOINT =
  "https://registry.npmjs.org/-/npm/v1/security/advisories/bulk";

const SEVERITY_ORDER = {
  info: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

function parseArgs(argv) {
  const args = { auditLevel: "high" };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--audit-level" && typeof argv[i + 1] === "string") {
      args.auditLevel = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--audit-level=")) {
      args.auditLevel = arg.split("=", 2)[1] || args.auditLevel;
    }
  }
  return args;
}

function normalizeLevel(level) {
  return Object.prototype.hasOwnProperty.call(SEVERITY_ORDER, level)
    ? level
    : "high";
}

function collectTreeNodes(tree, versionsByName) {
  if (!tree) return;

  if (Array.isArray(tree)) {
    for (const node of tree) {
      collectTreeNodes(node, versionsByName);
    }
    return;
  }

  if (typeof tree !== "object") return;

  const name = typeof tree.name === "string" ? tree.name.trim() : "";
  const version = typeof tree.version === "string" ? tree.version.trim() : "";
  if (name && version) {
    if (!versionsByName.has(name)) {
      versionsByName.set(name, new Set());
    }
    versionsByName.get(name).add(version);
  }

  const dependencies = tree.dependencies;
  if (dependencies && typeof dependencies === "object" && !Array.isArray(dependencies)) {
    for (const child of Object.values(dependencies)) {
      collectTreeNodes(child, versionsByName);
    }
  }
}

function buildPayloadFromTree(tree) {
  const versionsByName = new Map();
  collectTreeNodes(tree, versionsByName);

  const payload = {};
  for (const [name, versions] of versionsByName) {
    payload[name] = [...versions].sort();
  }
  return payload;
}

function loadPnpmTree() {
  const result = spawnSync(
    "pnpm",
    ["list", "--json", "--depth", "Infinity"],
    {
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
    },
  );

  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    const stdout = result.stdout?.trim();
    throw new Error(
      [
        "Failed to collect dependency tree from pnpm list.",
        stderr ? `stderr: ${stderr}` : null,
        stdout ? `stdout: ${stdout}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  const raw = result.stdout.trim();
  if (!raw) return [];

  return JSON.parse(raw);
}

function flattenAdvisories(response) {
  const advisories = [];
  if (!response || typeof response !== "object") return advisories;

  for (const [packageName, entries] of Object.entries(response)) {
    if (!Array.isArray(entries)) continue;
    for (const advisory of entries) {
      if (!advisory || typeof advisory !== "object") continue;
      advisories.push({
        packageName,
        id: advisory.id,
        title: advisory.title,
        severity: advisory.severity,
        url: advisory.url,
        vulnerableVersions: advisory.vulnerable_versions,
      });
    }
  }

  return advisories;
}

function severityAtLeast(severity, minSeverity) {
  return (SEVERITY_ORDER[severity] ?? 0) >= (SEVERITY_ORDER[minSeverity] ?? 3);
}

async function main() {
  const { auditLevel } = parseArgs(process.argv.slice(2));
  const threshold = normalizeLevel(auditLevel);
  const tree = loadPnpmTree();
  const payload = buildPayloadFromTree(tree);

  if (Object.keys(payload).length === 0) {
    console.log("No packages found to audit.");
    return;
  }

  const response = await fetch(AUDIT_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Bulk advisory audit failed with ${response.status} ${response.statusText}:\n${body}`,
    );
  }

  const advisoriesByPackage = await response.json();
  const advisories = flattenAdvisories(advisoriesByPackage);
  const failingAdvisories = advisories.filter((item) =>
    severityAtLeast(item.severity, threshold),
  );

  if (failingAdvisories.length === 0) {
    console.log("No vulnerabilities found.");
    return;
  }

  console.log("Security vulnerabilities found:");
  for (const advisory of failingAdvisories) {
    console.log(
      `- ${advisory.packageName}: ${advisory.title} (${advisory.severity})`,
    );
    console.log(`  id: ${advisory.id}`);
    console.log(`  range: ${advisory.vulnerableVersions}`);
    if (advisory.url) {
      console.log(`  info: ${advisory.url}`);
    }
  }

  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
