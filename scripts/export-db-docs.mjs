#!/usr/bin/env node

/**
 * scripts/export-db-docs.mjs
 *
 * Supabase DB에서 메타데이터를 직접 조회하여 docs/db/*.json 파일을 자동 갱신한다.
 * schema.sql은 사람이 읽는 요약 문서이므로 수동 유지.
 *
 * 사용법:
 *   node scripts/export-db-docs.mjs
 *
 * 환경변수 (.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DOCS_DIR = resolve(ROOT, "docs/db");

// ─── 환경변수 로드 (.env.local) ───
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "❌ 환경변수 누락: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 필요"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// ─── SQL 실행 헬퍼 ───
async function sql(query) {
  const { data, error } = await supabase.rpc("exec_sql", { query });
  if (error) {
    // rpc가 없으면 REST로 직접 실행
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      // exec_sql rpc가 없는 경우 pg_meta API 사용
      return await sqlViaPgMeta(query);
    }
    return await res.json();
  }
  return data;
}

async function sqlViaPgMeta(query) {
  const res = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      "X-Connection-Encrypted": "true",
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SQL 실행 실패 (${res.status}): ${text}`);
  }

  const result = await res.json();
  return result;
}

// ─── JSON 파일 쓰기 ───
function writeJson(filename, data) {
  const path = resolve(DOCS_DIR, filename);
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf-8");
  console.log(`✅ ${filename} (${data.length} entries)`);
}

// ─── 1. constraints.json ───
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

// ─── 2. indexes.json ───
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

// ─── 3. enums.json ───
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

// ─── 4. rls.json ───
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

// ─── 5. policies.json ───
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

// ─── 6. grant.json ───
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

// ─── 실행 ───
async function main() {
  console.log("🔄 Supabase DB → docs/db/ export 시작...\n");
  console.log(`  URL: ${SUPABASE_URL}`);
  console.log(`  Target: ${DOCS_DIR}\n`);

  try {
    await exportConstraints();
    await exportIndexes();
    await exportEnums();
    await exportRls();
    await exportPolicies();
    await exportGrants();
    console.log("\n✅ 모든 파일 export 완료!");
    console.log("⚠️  schema.sql은 수동 유지 대상입니다.");
  } catch (err) {
    console.error("\n❌ Export 실패:", err.message);
    console.error("\n💡 해결 방법:");
    console.error("  1. .env.local에 NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY가 있는지 확인");
    console.error("  2. Supabase 프로젝트에 exec_sql RPC 함수가 있는지 확인");
    console.error("  3. 또는 Supabase Dashboard > SQL Editor에서 직접 실행 후 결과를 JSON으로 저장");
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
