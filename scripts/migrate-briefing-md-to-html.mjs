/**
 * scripts/migrate-briefing-md-to-html.mjs
 *
 * content_html / excerpt 이 비어있는 briefing_posts를
 * content_md 기반으로 채워주는 1회성 마이그레이션 스크립트.
 *
 * 실행 전 필수:
 *   supabase db push (084_briefing_posts_excerpt.sql 적용 후)
 *
 * 실행:
 *   SUPABASE_URL=https://... SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-briefing-md-to-html.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { marked } from "marked";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ 환경변수 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 필요");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function stripHtml(html) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function createExcerpt(text, max = 90) {
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

async function run() {
  const { data: posts, error } = await supabase
    .from("briefing_posts")
    .select("id, title, content_md, content_html, excerpt")
    .is("content_html", null)
    .not("content_md", "is", null);

  if (error) {
    console.error("❌ 조회 실패:", error.message);
    process.exit(1);
  }

  console.log(`📋 대상 글: ${posts.length}개`);

  let success = 0;
  let fail = 0;

  for (const post of posts) {
    try {
      const html = await marked.parse(post.content_md ?? "");
      const plainText = stripHtml(html);
      const excerpt = createExcerpt(plainText, 90);

      const { error: updateError } = await supabase
        .from("briefing_posts")
        .update({
          content_html: html,
          excerpt,
        })
        .eq("id", post.id);

      if (updateError) throw updateError;

      console.log(`  ✅ "${post.title}"`);
      success++;
    } catch (err) {
      console.error(`  ❌ "${post.title}": ${err.message}`);
      fail++;
    }
  }

  console.log(`\n완료: 성공 ${success}개 / 실패 ${fail}개`);
}

run();
