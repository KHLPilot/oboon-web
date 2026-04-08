import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const rootDir = path.resolve(import.meta.dirname, "..");

function readWorkspaceFile(relativePath) {
  return readFileSync(path.join(rootDir, relativePath), "utf8");
}

test("briefing rich text styles cover headings, links, and tables", () => {
  const css = readWorkspaceFile("app/globals.css");

  assert.match(css, /\.ob-richtext\s+h1\b/);
  assert.match(css, /\.ob-richtext\s+h2\b/);
  assert.match(css, /\.ob-richtext\s+h3\b/);
  assert.match(css, /\.ob-richtext\s+ul\b/);
  assert.match(css, /list-style:\s*disc/);
  assert.match(css, /\.ob-richtext\s+ol\b/);
  assert.match(css, /list-style:\s*decimal/);
  assert.match(css, /\.ob-richtext\s+a\b/);
  assert.match(css, /\.ob-richtext\s+table\b/);
  assert.match(css, /\.ob-richtext\s+th\b/);
  assert.match(css, /\.ob-richtext\s+td\b/);
});

test("briefing editor and renderer opt into shared rich text classes", () => {
  const editorSource = readWorkspaceFile(
    "features/briefing/components/TiptapEditor.client.tsx",
  );
  const rendererSource = readWorkspaceFile(
    "features/briefing/components/BriefingHtmlRenderer.client.tsx",
  );

  assert.match(editorSource, /ob-richtext-editor/);
  assert.match(editorSource, /ob-richtext/);
  assert.match(rendererSource, /ob-richtext/);
});

test("briefing editor keeps literal numbered text and labels quote control clearly", () => {
  const editorSource = readWorkspaceFile(
    "features/briefing/components/TiptapEditor.client.tsx",
  );

  assert.match(editorSource, /enableInputRules:\s*false/);
  assert.match(editorSource, /title="인용구"/);
  assert.match(editorSource, />\s*인용\s*</);
});

test("briefing editor routes inline image insertion through upload callbacks", () => {
  const editorSource = readWorkspaceFile(
    "features/briefing/components/TiptapEditor.client.tsx",
  );
  const postEditorSource = readWorkspaceFile(
    "app/briefing/admin/posts/new/PostEditor.client.tsx",
  );

  assert.match(editorSource, /onImageUpload\?: \(file: File\) => Promise<string>/);
  assert.match(
    editorSource,
    /editorProps:\s*\{[\s\S]*handleDrop[\s\S]*handlePaste[\s\S]*\}/,
  );
  assert.match(editorSource, /type="file"/);
  assert.doesNotMatch(editorSource, /이미지 URL을 입력하세요/);
  assert.match(postEditorSource, /handleInlineImageUpload/);
  assert.match(postEditorSource, /onImageUpload=\{handleInlineImageUpload\}/);
});

test("briefing editor configures block images for drag reordering", () => {
  const editorSource = readWorkspaceFile(
    "features/briefing/components/TiptapEditor.client.tsx",
  );
  const css = readWorkspaceFile("app/globals.css");

  assert.match(editorSource, /Image\.extend/);
  assert.match(editorSource, /draggable:\s*true/);
  assert.match(editorSource, /ob-editor-inline-image/);
  assert.match(css, /\.ob-richtext-editor \.ob-editor-inline-image/);
});
