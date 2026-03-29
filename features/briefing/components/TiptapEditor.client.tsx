"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Link from "@tiptap/extension-link";

type Props = {
  initialValue?: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
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

export default function TiptapEditor({
  initialValue = "",
  onChange,
  disabled = false,
  placeholder,
}: Props) {
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

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
      Image.configure({ inline: false }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
    ],
    content: initialValue,
    editable: !disabled,
    onUpdate({ editor }) {
      onChangeRef.current(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "outline-none min-h-[320px] px-4 py-3 text-sm leading-7",
        "data-placeholder": placeholder ?? "",
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

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("이미지 URL을 입력하세요:");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

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
          &quot;
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
          onClick={addImage}
          disabled={disabled}
          title="이미지 삽입"
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

      <EditorContent
        editor={editor}
        className={[
          "ob-md flex-1 text-(--oboon-text-title)",
          disabled ? "cursor-not-allowed opacity-60" : "",
        ].join(" ")}
      />
    </div>
  );
}
