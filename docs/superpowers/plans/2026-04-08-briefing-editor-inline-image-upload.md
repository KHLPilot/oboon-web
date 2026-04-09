# Briefing Editor Inline Image Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 브리핑 본문 이미지 삽입을 URL 입력에서 파일 업로드로 바꾸고, 클릭 업로드·드래그앤드롭·붙여넣기와 이미지 블록 재정렬을 지원한다.

**Architecture:** 본문 이미지 업로드는 브리핑 전용 업로드 헬퍼로 분리하고, `PostEditorClient`가 그 함수를 `TiptapEditor`에 주입한다. 에디터는 숨겨진 파일 입력, `handleDrop`, `handlePaste`를 통해 이미지를 업로드한 뒤 block image 노드로 삽입하고, ProseMirror 기본 node drag 동작을 활용해 이미지 블록 순서를 이동시킨다.

**Tech Stack:** Next.js App Router, React 18, Tiptap 3, ProseMirror editor props, existing `/api/r2/upload` endpoint, Node test runner, TypeScript

---

## File Structure

- Create: `features/briefing/lib/uploadBriefingImage.ts`
  - 브리핑 본문/커버 이미지 업로드 fetch helper
- Modify: `app/briefing/admin/posts/new/PostEditor.client.tsx`
  - 커버 이미지 업로드를 helper로 치환하고 본문 이미지 업로드 callback 주입
- Modify: `features/briefing/components/TiptapEditor.client.tsx`
  - URL prompt 제거, 숨겨진 파일 입력 추가, drop/paste 업로드 처리, draggable image node 설정
- Modify: `app/globals.css`
  - 에디터 이미지 블록 drag affordance와 업로드 중 시각 상태 보강
- Modify: `tests/briefing-rich-text-styles.test.mjs`
  - 업로드 경로, drop/paste 연결, draggable 이미지 회귀 테스트 추가

### Task 1: Lock The Behavior With Failing Tests

**Files:**
- Modify: `tests/briefing-rich-text-styles.test.mjs`
- Test: `tests/briefing-rich-text-styles.test.mjs`

- [ ] **Step 1: Write the failing test for inline image upload wiring**

```js
test("briefing editor routes inline image insertion through upload callbacks", () => {
  const editorSource = readWorkspaceFile(
    "features/briefing/components/TiptapEditor.client.tsx",
  );
  const postEditorSource = readWorkspaceFile(
    "app/briefing/admin/posts/new/PostEditor.client.tsx",
  );

  assert.match(editorSource, /onImageUpload\?: \(file: File\) => Promise<string>/);
  assert.match(editorSource, /handleDrop/);
  assert.match(editorSource, /handlePaste/);
  assert.match(editorSource, /type="file"/);
  assert.doesNotMatch(editorSource, /이미지 URL을 입력하세요/);
  assert.match(postEditorSource, /mode", "briefing_content"/);
  assert.match(postEditorSource, /onImageUpload=\{handleInlineImageUpload\}/);
});
```

- [ ] **Step 2: Write the failing test for draggable image block behavior**

```js
test("briefing editor configures block images for drag reordering", () => {
  const editorSource = readWorkspaceFile(
    "features/briefing/components/TiptapEditor.client.tsx",
  );
  const css = readWorkspaceFile("app/globals.css");

  assert.match(editorSource, /const DraggableImage = Image\.extend/);
  assert.match(editorSource, /draggable:\s*true/);
  assert.match(editorSource, /HTMLAttributes:\s*\{\s*class:\s*"ob-editor-inline-image"/);
  assert.match(css, /\.ob-richtext-editor \.ob-editor-inline-image/);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH /opt/homebrew/bin/node --test tests/briefing-rich-text-styles.test.mjs
```

Expected: FAIL because `onImageUpload`, `handleDrop`, `handlePaste`, `DraggableImage`, and inline upload wiring do not exist yet.

- [ ] **Step 4: Commit the failing test only after confirming RED in local workspace notes**

```bash
git diff -- tests/briefing-rich-text-styles.test.mjs
```

Expected: only the new failing assertions appear; do not commit yet if you are batching RED→GREEN in one local branch.

### Task 2: Extract Shared Briefing Image Upload Helper

**Files:**
- Create: `features/briefing/lib/uploadBriefingImage.ts`
- Modify: `app/briefing/admin/posts/new/PostEditor.client.tsx`
- Test: `tests/briefing-rich-text-styles.test.mjs`

- [ ] **Step 1: Create the upload helper with explicit modes**

```ts
// features/briefing/lib/uploadBriefingImage.ts
type UploadMode = "briefing_cover" | "briefing_content";

type UploadArgs = {
  file: File;
  postId: string;
  mode: UploadMode;
};

export async function uploadBriefingImage({
  file,
  postId,
  mode,
}: UploadArgs): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("mode", mode);
  formData.append("postId", postId);

  const res = await fetch("/api/r2/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "업로드 실패");
  }

  const data = (await res.json()) as { url?: string };
  if (!data.url) {
    throw new Error("업로드 URL을 받지 못했습니다.");
  }

  return data.url;
}
```

- [ ] **Step 2: Replace cover upload inline fetch with helper usage**

```ts
// inside PostEditorClient
import { uploadBriefingImage } from "@/features/briefing/lib/uploadBriefingImage";

const resolveUploadId = () =>
  mode === "edit" && postId ? postId : uploadTempIdRef.current;

const handleCoverUpload = async (file: File) => {
  return uploadBriefingImage({
    file,
    postId: resolveUploadId(),
    mode: "briefing_cover",
  });
};
```

- [ ] **Step 3: Wire the existing cover file input to the new helper**

```ts
const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  setIsUploading(true);
  setUploadError(null);

  try {
    const url = await handleCoverUpload(file);
    setCoverImageUrl(url);
  } catch (err) {
    setUploadError(err instanceof Error ? err.message : "업로드 실패");
  } finally {
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }
};
```

- [ ] **Step 4: Add a dedicated inline image uploader in the post editor**

```ts
const handleInlineImageUpload = async (file: File) => {
  return uploadBriefingImage({
    file,
    postId: resolveUploadId(),
    mode: "briefing_content",
  });
};
```

- [ ] **Step 5: Run the source test to confirm helper wiring exists**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH /opt/homebrew/bin/node --test tests/briefing-rich-text-styles.test.mjs
```

Expected: still FAIL, but the remaining failures should now be in `TiptapEditor` drag/drop/upload behavior rather than missing `briefing_content` wiring.

- [ ] **Step 6: Commit the helper extraction**

```bash
git add features/briefing/lib/uploadBriefingImage.ts app/briefing/admin/posts/new/PostEditor.client.tsx tests/briefing-rich-text-styles.test.mjs
git commit -m "refactor: share briefing image upload helper"
```

### Task 3: Replace URL Prompt With File Upload In Tiptap

**Files:**
- Modify: `features/briefing/components/TiptapEditor.client.tsx`
- Modify: `app/briefing/admin/posts/new/PostEditor.client.tsx`
- Test: `tests/briefing-rich-text-styles.test.mjs`

- [ ] **Step 1: Extend the editor props to accept upload and error callbacks**

```ts
type Props = {
  initialValue?: string;
  onChange: (html: string) => void;
  onImageUpload?: (file: File) => Promise<string>;
  onError?: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
};
```

- [ ] **Step 2: Add the hidden file input and image insertion helper**

```ts
const imageInputRef = useRef<HTMLInputElement | null>(null);

const insertUploadedImage = useCallback(
  async (file: File) => {
    if (!editor || !onImageUpload) return;

    try {
      const src = await onImageUpload(file);
      editor.chain().focus().setImage({ src }).run();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : "이미지 업로드 실패");
    }
  },
  [editor, onError, onImageUpload],
);
```

- [ ] **Step 3: Replace the toolbar image button behavior**

```tsx
<input
  ref={imageInputRef}
  type="file"
  accept="image/jpeg,image/png,image/gif,image/webp"
  className="hidden"
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void insertUploadedImage(file).finally(() => {
      if (imageInputRef.current) imageInputRef.current.value = "";
    });
  }}
/>;

<ToolbarButton
  onClick={() => imageInputRef.current?.click()}
  disabled={disabled || !onImageUpload}
  title="이미지 업로드"
>
  이미지
</ToolbarButton>
```

- [ ] **Step 4: Pass the inline upload callback from the post editor**

```tsx
<TiptapEditor
  initialValue={editorInitialValue}
  onChange={setContentHtml}
  onImageUpload={handleInlineImageUpload}
  onError={setUploadError}
  disabled={isPending || isUploading}
/>
```

- [ ] **Step 5: Run test to verify prompt removal and callback wiring**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH /opt/homebrew/bin/node --test tests/briefing-rich-text-styles.test.mjs
```

Expected: the prompt-related assertion passes; remaining failures should be around drop/paste and draggable image config.

- [ ] **Step 6: Commit the toolbar upload change**

```bash
git add features/briefing/components/TiptapEditor.client.tsx app/briefing/admin/posts/new/PostEditor.client.tsx tests/briefing-rich-text-styles.test.mjs
git commit -m "feat: upload briefing inline images from toolbar"
```

### Task 4: Add Drop, Paste, And Drag-Reorder Support

**Files:**
- Modify: `features/briefing/components/TiptapEditor.client.tsx`
- Modify: `app/globals.css`
- Test: `tests/briefing-rich-text-styles.test.mjs`

- [ ] **Step 1: Introduce a draggable block image extension**

```ts
const DraggableImage = Image.extend({
  draggable: true,
}).configure({
  inline: false,
  HTMLAttributes: {
    class: "ob-editor-inline-image",
    draggable: "true",
  },
});
```

- [ ] **Step 2: Swap the editor extension list to use the draggable image node**

```ts
extensions: [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    code: {},
    codeBlock: {},
    horizontalRule: {},
  }),
  TextStyle,
  Color,
  DraggableImage,
  Table.configure({ resizable: false }),
  TableRow,
  TableHeader,
  TableCell,
  Link.configure({
    openOnClick: false,
    HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
  }),
],
```

- [ ] **Step 3: Add a reusable image-file extractor for drop and paste**

```ts
function getImageFile(items: DataTransferItemList | null): File | null {
  if (!items) return null;
  for (const item of Array.from(items)) {
    if (item.kind === "file") {
      const file = item.getAsFile();
      if (file?.type.startsWith("image/")) return file;
    }
  }
  return null;
}
```

- [ ] **Step 4: Handle file drop at the cursor position**

```ts
editorProps: {
  attributes: {
    class:
      "ob-richtext outline-none min-h-[320px] px-4 py-3 text-sm leading-7",
    "data-placeholder": placeholder ?? "",
  },
  handleDrop(view, event) {
    const file = getImageFile(event.dataTransfer?.items ?? null);
    if (!file || !onImageUpload || disabled) return false;

    const coords = view.posAtCoords({
      left: event.clientX,
      top: event.clientY,
    });

    void (async () => {
      try {
        const src = await onImageUpload(file);
        const position = coords?.pos ?? view.state.selection.from;
        editor?.chain().focus().insertContentAt(position, {
          type: "image",
          attrs: { src },
        }).run();
      } catch (error) {
        onError?.(error instanceof Error ? error.message : "이미지 업로드 실패");
      }
    })();

    return true;
  },
```

- [ ] **Step 5: Handle clipboard image paste**

```ts
  handlePaste(_, event) {
    const file = getImageFile(event.clipboardData?.items ?? null);
    if (!file || !onImageUpload || disabled) return false;

    void insertUploadedImage(file);
    return true;
  },
},
```

- [ ] **Step 6: Add editor image block affordance styles**

```css
.ob-richtext-editor .ob-editor-inline-image {
  display: block;
  width: min(100%, 720px);
  cursor: grab;
}

.ob-richtext-editor .ob-editor-inline-image:active {
  cursor: grabbing;
  opacity: 0.92;
}
```

- [ ] **Step 7: Run the source tests to verify GREEN**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH /opt/homebrew/bin/node --test tests/briefing-rich-text-styles.test.mjs
```

Expected: PASS for upload callback, `handleDrop`, `handlePaste`, and draggable image assertions.

- [ ] **Step 8: Commit drag-and-drop support**

```bash
git add features/briefing/components/TiptapEditor.client.tsx app/globals.css tests/briefing-rich-text-styles.test.mjs
git commit -m "feat: support inline image drop paste and reordering"
```

### Task 5: Full Verification

**Files:**
- Test: `tests/briefing-rich-text-styles.test.mjs`
- Test: `tests/briefing-content.test.mjs`
- Test: `tests/briefing-loading.test.mjs`
- Test: `tests/briefing-detail-loading.test.mjs`
- Test: `tests/briefing-seo-policy.test.mjs`

- [ ] **Step 1: Run the focused briefing tests**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH /opt/homebrew/bin/node --test \
  tests/briefing-content.test.mjs \
  tests/briefing-loading.test.mjs \
  tests/briefing-detail-loading.test.mjs \
  tests/briefing-seo-policy.test.mjs \
  tests/briefing-rich-text-styles.test.mjs
```

Expected: PASS for all briefing-related tests.

- [ ] **Step 2: Run typecheck**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH /opt/homebrew/bin/pnpm typecheck
```

Expected: PASS with no TypeScript errors.

- [ ] **Step 3: Manually verify in the browser**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH /opt/homebrew/bin/pnpm dev
```

Expected manual checks:
- Toolbar image button opens a file picker and inserts the uploaded image
- Dropping an image file into the editor uploads and inserts it near the drop point
- Pasting a clipboard image uploads and inserts it at the current selection
- Dragging an existing image block above or below paragraphs changes its order
- Saving and reopening the post preserves inserted image URLs and order

- [ ] **Step 4: Commit the verification-clean state**

```bash
git status --short
```

Expected: only the planned files are modified; if everything is already committed in prior tasks, this should be clean.

## Self-Review

- Spec coverage:
  - 버튼 클릭 업로드: Task 3
  - 드래그앤드롭 업로드: Task 4
  - 붙여넣기 업로드: Task 4
  - block 이미지와 순서 이동: Task 4
  - 업로드 정책 재사용: Task 2
  - 테스트와 타입 검증: Task 5
- Placeholder scan:
  - `TODO`, `TBD`, “적절한 처리” 같은 표현 없이 실제 코드와 명령을 넣었다.
- Type consistency:
  - `onImageUpload`, `onError`, `uploadBriefingImage`, `handleInlineImageUpload`, `DraggableImage` 이름을 계획 전반에서 일관되게 사용했다.
