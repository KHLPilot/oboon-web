#!/usr/bin/env node

/**
 * scripts/export-db-docs.mjs
 *
 * Supabase DB에서 메타데이터를 직접 조회하여 docs/db*.json 파일을 자동 갱신한다.
 * schema.sql은 사람이 읽는 요약 문서이므로 수동 유지.
 *
 * 사용법:
 *   node scripts/export-db-docs.mjs
 *   node scripts/export-db-docs.mjs --target current
 *   node scripts/export-db-docs.mjs --target main
 *   node scripts/export-db-docs.mjs --target test
 *   node scripts/export-db-docs.mjs --target both
 *
 * 환경변수 (.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * 추가 타깃 사용 시:
 *   SUPABASE_MAIN_URL
 *   SUPABASE_MAIN_SERVICE_ROLE_KEY
 *   SUPABASE_TEST_URL
 *   SUPABASE_TEST_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DEFAULT_DOCS_DIR = resolve(ROOT, "docs/db");
const MAIN_DOCS_DIR = resolve(ROOT, "docs/db-main");
const TEST_DOCS_DIR = resolve(ROOT, "docs/db-test");

function loadEnv() {
  const envPath = resolve(ROOT, ".env.local");
  try {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env.local 없으면 환경변수에서 직접 읽기
  }
}

loadEnv();

function parseArgs(argv) {
  const targetIndex = argv.findIndex((arg) => arg === "--target");
  if (targetIndex === -1) {
    return { target: "current" };
  }

  const target = argv[targetIndex + 1]?.trim().toLowerCase();
  if (!target || !["current", "main", "test", "both"].includes(target)) {
    throw new Error("--target 값은 current, main, test, both 중 하나여야 합니다.");
  }

  return { target };
}

function formatError(error) {
  if (!error) return "unknown error";
  const parts = [
    error.message,
    error.details,
    error.hint,
    error.code ? `code=${error.code}` : null,
  ].filter(Boolean);
  return parts.join(" | ");
}

function isMissingExecSqlError(error) {
  const text = `${error?.message ?? ""} ${error?.details ?? ""} ${error?.hint ?? ""}`;
  return (
    error?.code === "PGRST202" ||
    error?.code === "42883" ||
    (text.includes("exec_sql") && text.includes("does not exist"))
  );
}

async function fetchJson(url, init) {
  let res;
  try {
    res = await fetch(url, init);
  } catch (error) {
    const reason =
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(error);
    throw new Error(`네트워크 요청 실패: ${url} | ${reason}`);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} ${res.statusText} @ ${url} | ${text}`);
  }

  return await res.json();
}

function resolveTargets(targetArg) {
  const currentTarget = {
    name: "current",
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    docsDir: DEFAULT_DOCS_DIR,
  };

  const mainTarget = {
    name: "main",
    url: process.env.SUPABASE_MAIN_URL,
    serviceKey: process.env.SUPABASE_MAIN_SERVICE_ROLE_KEY,
    docsDir: MAIN_DOCS_DIR,
  };

  const testTarget = {
    name: "test",
    url: process.env.SUPABASE_TEST_URL,
    serviceKey: process.env.SUPABASE_TEST_SERVICE_ROLE_KEY,
    docsDir: TEST_DOCS_DIR,
  };

  if (targetArg === "current") return [currentTarget];
  if (targetArg === "main") return [mainTarget];
  if (targetArg === "test") return [testTarget];
  return [mainTarget, testTarget];
}

function validateTarget(target) {
  if (!target.url || !target.serviceKey) {
    const missing = [];
    if (!target.url) {
      missing.push(
        target.name === "current"
          ? "NEXT_PUBLIC_SUPABASE_URL"
          : `SUPABASE_${target.name.toUpperCase()}_URL`,
      );
    }
    if (!target.serviceKey) {
      missing.push(
        target.name === "current"
          ? "SUPABASE_SERVICE_ROLE_KEY"
          : `SUPABASE_${target.name.toUpperCase()}_SERVICE_ROLE_KEY`,
      );
    }
    throw new Error(
      `[${target.name}] 환경변수 누락: ${missing.join(", ")}`,
    );
  }
}

function createExporter(target) {
  const SUPABASE_URL = target.url;
  const SERVICE_KEY = target.serviceKey;
  const DOCS_DIR = target.docsDir;

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  async function sql(query) {
    const { data, error } = await supabase.rpc("exec_sql", { query });
    if (!error) {
      return data;
    }

    const rpcErrorText = formatError(error);

    if (!isMissingExecSqlError(error)) {
      throw new Error(`exec_sql RPC 호출 실패: ${rpcErrorText}`);
    }

    try {
      return await fetchJson(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: "POST",
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({ query }),
      });
    } catch (restError) {
      const restErrorText =
        restError instanceof Error ? restError.message : String(restError);

      try {
        return await sqlViaPgMeta(query);
      } catch (pgMetaError) {
        const pgMetaErrorText =
          pgMetaError instanceof Error ? pgMetaError.message : String(pgMetaError);
        throw new Error(
          [
            `exec_sql RPC 없음 또는 호출 실패: ${rpcErrorText}`,
            `REST fallback 실패: ${restErrorText}`,
            `pg_meta fallback 실패: ${pgMetaErrorText}`,
          ].join("\n"),
        );
      }
    }
  }

  async function sqlViaPgMeta(query) {
    return await fetchJson(`${SUPABASE_URL}/pg/query`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        "X-Connection-Encrypted": "true",
      },
      body: JSON.stringify({ query }),
    });
  }

  function writeJson(filename, data) {
    mkdirSync(DOCS_DIR, { recursive: true });
    const path = resolve(DOCS_DIR, filename);
    writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf-8");
    console.log(`✅ ${filename} (${data.length} entries)`);
  }

  async function exportConstraints() {
    const query = `
      SELECT
        tc.table_name,
        tc.constraint_name,
        CASE tc.constraint_type
          WHEN 'PRIMARY KEY' THEN 'p'
          WHEN 'FOREIGN KEY' THEN 'f'
          WHEN 'UNIQUE' THEN 'u'
          WHEN 'CHECK' THEN 'c'
          ELSE tc.constraint_type
        END AS constraint_type,
        pg_get_constraintdef(pgc.oid) AS definition
      FROM information_schema.table_constraints tc
      JOIN pg_catalog.pg_constraint pgc
        ON pgc.conname = tc.constraint_name
      JOIN pg_catalog.pg_namespace nsp
        ON nsp.oid = pgc.connamespace
        AND nsp.nspname = tc.constraint_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name NOT LIKE 'pg_%'
      ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name
    `;
    const rows = await sql(query);
    writeJson("constraints.json", rows);
  }

  async function exportIndexes() {
    const query = `
      SELECT
        t.relname AS table_name,
        i.relname AS index_name,
        pg_get_indexdef(ix.indexrelid) AS definition
      FROM pg_catalog.pg_index ix
      JOIN pg_catalog.pg_class t ON t.oid = ix.indrelid
      JOIN pg_catalog.pg_class i ON i.oid = ix.indexrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
        AND t.relname NOT LIKE 'pg_%'
      ORDER BY t.relname, i.relname
    `;
    const rows = await sql(query);
    writeJson("indexes.json", rows);
  }

  async function exportEnums() {
    const query = `
      SELECT
        t.typname AS enum_name,
        e.enumsortorder::int AS sort_order,
        e.enumlabel AS enum_value
      FROM pg_catalog.pg_type t
      JOIN pg_catalog.pg_enum e ON t.oid = e.enumtypid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      ORDER BY t.typname, e.enumsortorder
    `;
    const rows = await sql(query);
    writeJson("enums.json", rows);
  }

  async function exportRls() {
    const query = `
      SELECT
        c.relname AS table_name,
        c.relrowsecurity AS rls_enabled,
        c.relforcerowsecurity AS rls_forced
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND c.relname NOT LIKE 'pg_%'
      ORDER BY c.relname
    `;
    const rows = await sql(query);
    writeJson("rls.json", rows);
  }

  async function exportPolicies() {
    const query = `
      SELECT
        schemaname,
        tablename,
        policyname,
        permissive,
        roles::text,
        cmd,
        qual AS using_expression,
        with_check AS with_check_expression
      FROM pg_catalog.pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname
    `;
    const rows = await sql(query);
    writeJson("policies.json", rows);
  }

  async function exportGrants() {
    const query = `
      SELECT
        table_schema,
        table_name,
        grantee,
        privilege_type
      FROM information_schema.role_table_grants
      WHERE table_schema = 'public'
        AND table_name NOT LIKE 'pg_%'
      ORDER BY table_name, grantee, privilege_type
    `;
    const rows = await sql(query);
    writeJson("grant.json", rows);
  }

  async function run() {
    console.log(`🔄 [${target.name}] Supabase DB → export 시작...\n`);
    console.log(`  URL: ${SUPABASE_URL}`);
    console.log(`  Target: ${DOCS_DIR}\n`);

    await exportConstraints();
    await exportIndexes();
    await exportEnums();
    await exportRls();
    await exportPolicies();
    await exportGrants();
    console.log(`\n✅ [${target.name}] export 완료!`);
    console.log("⚠️  schema.sql은 수동 유지 대상입니다.");
  }

  return { run };
}

function printHelp() {
  console.error("\n💡 사용 방법:");
  console.error("  1. current 단일 export");
  console.error("     NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  console.error("  2. main export");
  console.error("     SUPABASE_MAIN_URL, SUPABASE_MAIN_SERVICE_ROLE_KEY");
  console.error("  3. test export");
  console.error("     SUPABASE_TEST_URL, SUPABASE_TEST_SERVICE_ROLE_KEY");
  console.error("  4. both export");
  console.error("     main/test 환경변수를 모두 설정");
  console.error("\n예시:");
  console.error("  node scripts/export-db-docs.mjs --target both");
  console.error("  node scripts/export-db-docs.mjs --target main");
}

async function main() {
  try {
    const { target } = parseArgs(process.argv.slice(2));
    const targets = resolveTargets(target);

    for (const item of targets) {
      validateTarget(item);
      const exporter = createExporter(item);
      await exporter.run();
      console.log("");
    }
  } catch (err) {
    console.error("\n❌ Export 실패:", err.message);
    printHelp();
    console.error("\n📋 exec_sql 함수 생성 SQL:");
    console.error(`
CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || query || ') t'
  INTO result;
  RETURN COALESCE(result, '[]'::json);
END;
$$;
`);
    process.exit(1);
  }
}

main();
