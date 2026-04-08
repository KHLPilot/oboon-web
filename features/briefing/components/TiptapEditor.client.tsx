"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Link from "@tiptap/extension-link";
import { cn } from "@/lib/utils/cn";

type Props = {
  initialValue?: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
  onImageUpload?: (file: File) => Promise<string>;
  onImageUploadStateChange?: (isUploading: boolean) => void;
};

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      disabled={disabled}
      title={title}
      className={[
        "flex h-7 min-w-[28px] items-center justify-center rounded px-1.5 text-xs transition-colors",
        active
          ? "bg-(--oboon-primary)/20 text-(--oboon-primary)"
          : "text-(--oboon-text-muted) hover:bg-(--oboon-bg-subtle) hover:text-(--oboon-text-title)",
        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="mx-1 h-4 w-px bg-(--oboon-border-default)" />;
}

function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

function getTransferredImageFiles(dataTransfer: DataTransfer | null): File[] {
  if (!dataTransfer) return [];

  const files = Array.from(dataTransfer.files ?? []).filter(isImageFile);
  if (files.length > 0) {
    return files;
  }

  return Array.from(dataTransfer.items ?? [])
    .filter((item) => item.kind === "file")
    .map((item) => item.getAsFile())
    .filter((file): file is File => Boolean(file && isImageFile(file)));
}

export default function TiptapEditor({
  initialValue = "",
  onChange,
  disabled = false,
  placeholder,
  onImageUpload,
  onImageUploadStateChange,
}: Props) {
  const onChangeRef = useRef(onChange);
  const editorRef = useRef<Editor | null>(null);
  const imageUploadInputRef = useRef<HTMLInputElement>(null);
  const disabledRef = useRef(disabled);
  const activeUploadCountRef = useRef(0);
  const [imageUploadStatus, setImageUploadStatus] = useState<string | null>(
    null,
  );
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  const insertImageAt = useCallback(
    (editor: Editor, pos: number, src: string) => {
      editor
        .chain()
        .focus()
        .insertContentAt(pos, {
          type: "image",
          attrs: { src },
        })
        .run();
    },
    [],
  );

  const uploadImageFiles = useCallback(
    async (files: File[], pos?: number) => {
      const imageFiles = files.filter(isImageFile);
      if (imageFiles.length === 0) return;

      if (disabledRef.current) return;

      if (!onImageUpload) {
        setImageUploadError("이미지 업로드가 설정되지 않았습니다.");
        return;
      }

      const initialEditor = editorRef.current;
      if (!initialEditor) return;

      setImageUploadError(null);
      activeUploadCountRef.current += 1;
      if (activeUploadCountRef.current === 1) {
        onImageUploadStateChange?.(true);
      }
      setImageUploadStatus(
        imageFiles.length === 1
          ? `이미지 업로드 중: ${imageFiles[0].name}`
          : `이미지 ${imageFiles.length}개 업로드 중`,
      );

      let nextPos =
        typeof pos === "number" ? pos : initialEditor.state.selection.from;

      try {
        for (const file of imageFiles) {
          const src = await onImageUpload(file);
          const activeEditor = editorRef.current;
          if (!activeEditor || disabledRef.current) {
            break;
          }

          insertImageAt(activeEditor, nextPos, src);
          nextPos += 1;
        }
      } catch (error) {
        setImageUploadError(
          error instanceof Error
            ? error.message
            : "이미지 업로드에 실패했습니다.",
        );
      } finally {
        activeUploadCountRef.current = Math.max(
          0,
          activeUploadCountRef.current - 1,
        );
        if (activeUploadCountRef.current === 0) {
          onImageUploadStateChange?.(false);
          setImageUploadStatus(null);
        } else {
          setImageUploadStatus("이미지 업로드 중");
        }
        if (imageUploadInputRef.current) {
          imageUploadInputRef.current.value = "";
        }
      }
    },
    [insertImageAt, onImageUpload, onImageUploadStateChange],
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        code: {},
        codeBlock: {},
        horizontalRule: {},
      }),
      TextStyle,
      Color,
      Image.extend({
        draggable: true,
      }).configure({
        inline: false,
        HTMLAttributes: { class: "ob-editor-inline-image" },
      }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
    ],
    immediatelyRender: false,
    enableInputRules: false,
    content: initialValue,
    editable: !disabled,
    onUpdate({ editor }) {
      onChangeRef.current(editor.getHTML());
    },
    onCreate({ editor }) {
      editorRef.current = editor;
    },
    onDestroy() {
      editorRef.current = null;
    },
    editorProps: {
      attributes: {
        class:
          "ob-richtext outline-none min-h-[320px] px-4 py-3 text-sm leading-7",
        "data-placeholder": placeholder ?? "",
      },
      handleDrop(view, event, _slice, moved) {
        if (moved) return false;
        if (disabledRef.current) return false;

        const files = getTransferredImageFiles(event.dataTransfer);
        if (files.length === 0) return false;

        event.preventDefault();
        event.stopPropagation();

        const coords = view.posAtCoords({
          left: event.clientX,
          top: event.clientY,
        });
        const pos = coords?.pos ?? view.state.selection.from;

        void uploadImageFiles(files, pos);
        return true;
      },
      handlePaste(_view, event) {
        if (disabledRef.current) return false;

        const files = getTransferredImageFiles(event.clipboardData);
        if (files.length === 0) return false;

        event.preventDefault();
        event.stopPropagation();

        void uploadImageFiles(files, editorRef.current?.state.selection.from);
        return true;
      },
    },
  });

  const prevInitialValue = useRef(initialValue);

  useEffect(() => {
    if (!editor) return;
    if (prevInitialValue.current !== initialValue) {
      prevInitialValue.current = initialValue;
      editor.commands.setContent(initialValue ?? "");
    }
  }, [editor, initialValue]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("링크 URL:", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const insertTable = useCallback(() => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  }, [editor]);

  const openImagePicker = useCallback(() => {
    if (disabled || !onImageUpload) return;
    imageUploadInputRef.current?.click();
  }, [disabled, onImageUpload]);

  const handleImageInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      if (files.length === 0) return;
      void uploadImageFiles(files);
    },
    [uploadImageFiles],
  );

  if (!editor) return null;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface)">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-2 py-1.5">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          disabled={disabled}
          title="굵게 (Ctrl+B)"
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          disabled={disabled}
          title="기울임 (Ctrl+I)"
        >
          <em>I</em>
        </ToolbarButton>

        <Divider />

        {([1, 2, 3] as const).map((level) => (
          <ToolbarButton
            key={level}
            onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
            active={editor.isActive("heading", { level })}
            disabled={disabled}
            title={`제목 H${level}`}
          >
            H{level}
          </ToolbarButton>
        ))}

        <Divider />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          disabled={disabled}
          title="순서 없는 목록"
        >
          ≡
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          disabled={disabled}
          title="순서 있는 목록"
        >
          1.
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          disabled={disabled}
          title="인용구"
        >
          인용
        </ToolbarButton>

        <Divider />

        <div className="relative flex items-center">
          <span className="pointer-events-none absolute left-1.5 text-xs text-(--oboon-text-muted)">
            A
          </span>
          <input
            type="color"
            className="h-7 w-9 cursor-pointer rounded border-none bg-transparent pl-4 opacity-60 hover:opacity-100"
            title="글자 색상"
            disabled={disabled}
            onChange={(e) => {
              editor.chain().focus().setColor(e.target.value).run();
            }}
          />
        </div>

        <Divider />

        <ToolbarButton
          onClick={openImagePicker}
          disabled={disabled || !onImageUpload}
          title="이미지 업로드"
        >
          🖼
        </ToolbarButton>
        <ToolbarButton
          onClick={insertTable}
          disabled={disabled}
          title="표 삽입 (3×3)"
        >
          ⊞
        </ToolbarButton>
        <ToolbarButton
          onClick={setLink}
          active={editor.isActive("link")}
          disabled={disabled}
          title="링크"
        >
          🔗
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          disabled={disabled}
          title="구분선"
        >
          -
        </ToolbarButton>
      </div>

      <input
        ref={imageUploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageInputChange}
        disabled={disabled || !onImageUpload}
      />

      {imageUploadStatus || imageUploadError ? (
        <div
          className={[
            "border-b border-(--oboon-border-default) px-4 py-2 text-[12px]",
            imageUploadError
              ? "bg-(--oboon-danger-bg) text-(--oboon-danger-text)"
              : "bg-(--oboon-bg-subtle) text-(--oboon-text-muted)",
          ].join(" ")}
        >
          {imageUploadError ?? imageUploadStatus}
        </div>
      ) : null}

      <EditorContent
        editor={editor}
        className={cn(
          "ob-md ob-richtext-editor flex-1 text-(--oboon-text-title)",
          disabled && "cursor-not-allowed opacity-60",
        )}
      />
    </div>
  );
}
