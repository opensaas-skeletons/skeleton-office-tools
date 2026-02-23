import { useState, useRef, useEffect, useCallback } from "react";
import type { Editor } from "@tiptap/react";
import ColorPicker from "./ColorPicker";
import TableGridPicker from "./TableGridPicker";
import FindReplaceBar from "./FindReplaceBar";

interface WordEditorToolbarProps {
  editor: Editor | null;
  fileName: string | null;
  onInsertImage?: () => void;
  onPrint?: () => void;
}

const FONT_FAMILIES = [
  "Inter",
  "Arial",
  "Times New Roman",
  "Georgia",
  "Courier New",
  "Verdana",
  "Comic Sans MS",
  "Impact",
  "Trebuchet MS",
];

const FONT_SIZES = [
  "8", "9", "10", "11", "12", "14", "16", "18",
  "20", "24", "28", "32", "36", "48", "72",
];

const HEADINGS = [
  { label: "Normal", level: 0 },
  { label: "Heading 1", level: 1 },
  { label: "Heading 2", level: 2 },
  { label: "Heading 3", level: 3 },
  { label: "Heading 4", level: 4 },
  { label: "Heading 5", level: 5 },
  { label: "Heading 6", level: 6 },
] as const;

const LINE_SPACINGS = ["1", "1.15", "1.5", "2", "2.5", "3"];

const TEXT_COLORS = [
  "#000000", "#434343", "#666666", "#999999", "#b7b7b7", "#cccccc", "#d9d9d9", "#ffffff",
  "#980000", "#ff0000", "#ff9900", "#ffff00", "#00ff00", "#00ffff", "#4a86e8", "#0000ff",
  "#9900ff", "#ff00ff", "#e6b8af", "#f4cccc", "#fce5cd", "#fff2cc", "#d9ead3", "#d0e0e3",
  "#c9daf8", "#cfe2f3", "#d9d2e9", "#ead1dc",
];

const HIGHLIGHT_COLORS = [
  "#ffff00", "#00ff00", "#00ffff", "#ff69b4", "#ffa500",
  "#ff0000", "#9900ff", "#0000ff",
];

export default function WordEditorToolbar({
  editor,
  fileName,
  onInsertImage,
  onPrint,
}: WordEditorToolbarProps) {
  const [showFindReplace, setShowFindReplace] = useState(false);
  const disabled = !editor;

  const getCurrentFontFamily = (): string => {
    if (!editor) return "Inter";
    const attrs = editor.getAttributes("textStyle");
    return (attrs.fontFamily as string) || "Inter";
  };

  const getCurrentFontSize = (): string => {
    if (!editor) return "12";
    const attrs = editor.getAttributes("textStyle");
    const raw = (attrs.fontSize as string) || "16px";
    return raw.replace("px", "");
  };

  const getCurrentHeading = (): string => {
    if (!editor) return "Normal";
    for (let i = 1; i <= 6; i++) {
      if (editor.isActive("heading", { level: i })) return `Heading ${i}`;
    }
    return "Normal";
  };

  const handleInsertLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Enter URL:", previousUrl || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  }, [editor]);

  const handleInsertTable = useCallback(
    (rows: number, cols: number) => {
      if (!editor) return;
      editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
    },
    [editor]
  );

  const wordCount = editor?.storage.characterCount?.words?.() ?? 0;
  const charCount = editor?.storage.characterCount?.characters?.() ?? 0;

  return (
    <div>
      {/* Main toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-1 bg-white border-b border-slate-200 select-none min-h-[40px]">
        {/* File name */}
        <div className="flex items-center gap-1.5 mr-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500 shrink-0">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <span className="text-sm font-medium text-slate-600 truncate max-w-[160px]">
            {fileName || "Untitled"}
          </span>
        </div>

        <Divider />

        {/* Undo / Redo */}
        <ToolbarButton
          onClick={() => editor?.chain().focus().undo().run()}
          disabled={disabled || !editor?.can().undo()}
          title="Undo (Ctrl+Z)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().redo().run()}
          disabled={disabled || !editor?.can().redo()}
          title="Redo (Ctrl+Y)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
          </svg>
        </ToolbarButton>

        <Divider />

        {/* Heading dropdown */}
        <ToolbarDropdown
          value={getCurrentHeading()}
          disabled={disabled}
          width="w-[110px]"
          title="Paragraph style"
          options={HEADINGS.map((h) => h.label)}
          onSelect={(val) => {
            if (!editor) return;
            const heading = HEADINGS.find((h) => h.label === val);
            if (!heading) return;
            if (heading.level === 0) {
              editor.chain().focus().setParagraph().run();
            } else {
              editor
                .chain()
                .focus()
                .toggleHeading({ level: heading.level as 1 | 2 | 3 | 4 | 5 | 6 })
                .run();
            }
          }}
        />

        {/* Font family dropdown */}
        <ToolbarDropdown
          value={getCurrentFontFamily()}
          disabled={disabled}
          width="w-[120px]"
          title="Font family"
          options={FONT_FAMILIES}
          onSelect={(val) => {
            if (!editor) return;
            editor.chain().focus().setFontFamily(val).run();
          }}
        />

        {/* Font size dropdown */}
        <ToolbarDropdown
          value={getCurrentFontSize()}
          disabled={disabled}
          width="w-[52px]"
          title="Font size"
          options={FONT_SIZES}
          onSelect={(val) => {
            if (!editor) return;
            editor.chain().focus().setFontSize(`${val}px`).run();
          }}
        />

        <Divider />

        {/* Text formatting */}
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBold().run()}
          disabled={disabled}
          active={editor?.isActive("bold")}
          title="Bold (Ctrl+B)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
            <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          disabled={disabled}
          active={editor?.isActive("italic")}
          title="Italic (Ctrl+I)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="4" x2="10" y2="4" />
            <line x1="14" y1="20" x2="5" y2="20" />
            <line x1="15" y1="4" x2="9" y2="20" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          disabled={disabled}
          active={editor?.isActive("underline")}
          title="Underline (Ctrl+U)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" />
            <line x1="4" y1="21" x2="20" y2="21" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          disabled={disabled}
          active={editor?.isActive("strike")}
          title="Strikethrough"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 4H9a3 3 0 0 0-3 3v1" />
            <path d="M12 15v5" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <path d="M15 12a3 3 0 1 1 0 6H8" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleSubscript().run()}
          disabled={disabled}
          active={editor?.isActive("subscript")}
          title="Subscript"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <text x="2" y="14" fontSize="14" fill="currentColor" stroke="none" fontWeight="bold">x</text>
            <text x="13" y="20" fontSize="10" fill="currentColor" stroke="none">2</text>
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleSuperscript().run()}
          disabled={disabled}
          active={editor?.isActive("superscript")}
          title="Superscript"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <text x="2" y="14" fontSize="14" fill="currentColor" stroke="none" fontWeight="bold">x</text>
            <text x="13" y="8" fontSize="10" fill="currentColor" stroke="none">2</text>
          </svg>
        </ToolbarButton>

        <Divider />

        {/* Color pickers */}
        <ColorPicker
          label="Text color"
          currentColor={editor?.getAttributes("textStyle").color as string | undefined}
          colors={TEXT_COLORS}
          onSelect={(color) => {
            if (!editor) return;
            if (color) {
              editor.chain().focus().setColor(color).run();
            } else {
              editor.chain().focus().unsetColor().run();
            }
          }}
          disabled={disabled}
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L4 20h4l1.5-4h5L16 20h4L12 2z" />
            </svg>
          }
        />
        <ColorPicker
          label="Highlight color"
          currentColor={
            editor?.isActive("highlight")
              ? (editor.getAttributes("highlight").color as string | undefined) || "#ffff00"
              : undefined
          }
          colors={HIGHLIGHT_COLORS}
          onSelect={(color) => {
            if (!editor) return;
            if (color) {
              editor.chain().focus().toggleHighlight({ color }).run();
            } else {
              editor.chain().focus().unsetHighlight().run();
            }
          }}
          disabled={disabled}
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          }
        />

        {/* Clear formatting */}
        <ToolbarButton
          onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()}
          disabled={disabled}
          title="Clear formatting"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7V4h16v3" />
            <path d="M9 20h6" />
            <path d="M12 4v16" />
            <line x1="3" y1="21" x2="21" y2="3" strokeWidth="2" stroke="currentColor" />
          </svg>
        </ToolbarButton>

        <Divider />

        {/* Alignment */}
        <ToolbarButton
          onClick={() => editor?.chain().focus().setTextAlign("left").run()}
          disabled={disabled}
          active={editor?.isActive({ textAlign: "left" })}
          title="Align left"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="17" y1="10" x2="3" y2="10" />
            <line x1="21" y1="6" x2="3" y2="6" />
            <line x1="21" y1="14" x2="3" y2="14" />
            <line x1="17" y1="18" x2="3" y2="18" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().setTextAlign("center").run()}
          disabled={disabled}
          active={editor?.isActive({ textAlign: "center" })}
          title="Align center"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="10" x2="6" y2="10" />
            <line x1="21" y1="6" x2="3" y2="6" />
            <line x1="21" y1="14" x2="3" y2="14" />
            <line x1="18" y1="18" x2="6" y2="18" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().setTextAlign("right").run()}
          disabled={disabled}
          active={editor?.isActive({ textAlign: "right" })}
          title="Align right"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="21" y1="10" x2="7" y2="10" />
            <line x1="21" y1="6" x2="3" y2="6" />
            <line x1="21" y1="14" x2="3" y2="14" />
            <line x1="21" y1="18" x2="7" y2="18" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().setTextAlign("justify").run()}
          disabled={disabled}
          active={editor?.isActive({ textAlign: "justify" })}
          title="Justify"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="21" y1="10" x2="3" y2="10" />
            <line x1="21" y1="6" x2="3" y2="6" />
            <line x1="21" y1="14" x2="3" y2="14" />
            <line x1="21" y1="18" x2="3" y2="18" />
          </svg>
        </ToolbarButton>

        <Divider />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          disabled={disabled}
          active={editor?.isActive("bulletList")}
          title="Bulleted list"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <circle cx="4" cy="6" r="1" fill="currentColor" />
            <circle cx="4" cy="12" r="1" fill="currentColor" />
            <circle cx="4" cy="18" r="1" fill="currentColor" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          disabled={disabled}
          active={editor?.isActive("orderedList")}
          title="Numbered list"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="10" y1="6" x2="21" y2="6" />
            <line x1="10" y1="12" x2="21" y2="12" />
            <line x1="10" y1="18" x2="21" y2="18" />
            <text x="2" y="8" fontSize="8" fill="currentColor" stroke="none" fontWeight="bold">1</text>
            <text x="2" y="14" fontSize="8" fill="currentColor" stroke="none" fontWeight="bold">2</text>
            <text x="2" y="20" fontSize="8" fill="currentColor" stroke="none" fontWeight="bold">3</text>
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleTaskList().run()}
          disabled={disabled}
          active={editor?.isActive("taskList")}
          title="Task list"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="6" height="6" rx="1" />
            <polyline points="5 8 6 9 8 6.5" />
            <line x1="12" y1="8" x2="21" y2="8" />
            <rect x="3" y="14" width="6" height="6" rx="1" />
            <line x1="12" y1="17" x2="21" y2="17" />
          </svg>
        </ToolbarButton>

        {/* Indent */}
        <ToolbarButton
          onClick={() => editor?.chain().focus().liftListItem("listItem").run()}
          disabled={disabled || !editor?.can().liftListItem("listItem")}
          title="Decrease indent"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="11" y1="6" x2="21" y2="6" />
            <line x1="11" y1="12" x2="21" y2="12" />
            <line x1="11" y1="18" x2="21" y2="18" />
            <polyline points="7 8 3 12 7 16" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().sinkListItem("listItem").run()}
          disabled={disabled || !editor?.can().sinkListItem("listItem")}
          title="Increase indent"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="11" y1="6" x2="21" y2="6" />
            <line x1="11" y1="12" x2="21" y2="12" />
            <line x1="11" y1="18" x2="21" y2="18" />
            <polyline points="3 8 7 12 3 16" />
          </svg>
        </ToolbarButton>

        {/* Line spacing */}
        <LineSpacingDropdown editor={editor} disabled={disabled} />

        <Divider />

        {/* Blockquote */}
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          disabled={disabled}
          active={editor?.isActive("blockquote")}
          title="Blockquote"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" />
            <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z" />
          </svg>
        </ToolbarButton>

        <Divider />

        {/* Insert section */}
        <TableGridPicker onInsert={handleInsertTable} disabled={disabled} />
        <ToolbarButton
          onClick={() => onInsertImage?.()}
          disabled={disabled || !onInsertImage}
          title="Insert Image"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={handleInsertLink}
          disabled={disabled}
          active={editor?.isActive("link")}
          title="Insert Link (Ctrl+K)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().setHorizontalRule().run()}
          disabled={disabled}
          title="Horizontal rule"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().setHardBreak().run()}
          disabled={disabled}
          title="Page break"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="17 1 21 5 17 9" />
            <path d="M3 5h18" />
            <line x1="3" y1="12" x2="21" y2="12" strokeDasharray="3 3" />
            <path d="M3 19h18" />
            <polyline points="7 15 3 19 7 23" />
          </svg>
        </ToolbarButton>

        <Divider />

        {/* Tools */}
        <ToolbarButton
          onClick={() => setShowFindReplace(!showFindReplace)}
          disabled={disabled}
          active={showFindReplace}
          title="Find & Replace (Ctrl+H)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </ToolbarButton>

        {/* Word count */}
        <span className="text-xs text-slate-400 tabular-nums ml-1" title={`${charCount} characters`}>
          {wordCount} words
        </span>

        <div className="flex-1" />

        {/* Print */}
        <ToolbarButton
          onClick={() => onPrint?.()}
          disabled={disabled || !onPrint}
          title="Print (Ctrl+P)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
        </ToolbarButton>
      </div>

      {/* Find & Replace bar */}
      {showFindReplace && editor && (
        <FindReplaceBar editor={editor} onClose={() => setShowFindReplace(false)} />
      )}
    </div>
  );
}

/* ---------- Helper components ---------- */

function ToolbarButton({
  children,
  onClick,
  disabled = false,
  active = false,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded-md transition-colors ${
        active
          ? "bg-blue-100 text-blue-600"
          : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
      } disabled:opacity-30 disabled:cursor-default`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-slate-200 mx-1" />;
}

function ToolbarDropdown({
  value,
  options,
  onSelect,
  disabled = false,
  width,
  title,
}: {
  value: string;
  options: string[];
  onSelect: (value: string) => void;
  disabled?: boolean;
  width?: string;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled}
        title={title}
        className={`flex items-center justify-between gap-1 h-7 px-2 text-xs border border-slate-200 rounded bg-white hover:border-slate-300 disabled:opacity-30 disabled:cursor-default transition-colors ${width || "w-auto"}`}
      >
        <span className="truncate text-slate-700">{value}</span>
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-slate-400">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 py-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto min-w-full">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                onSelect(opt);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 transition-colors ${
                opt === value ? "text-blue-600 font-medium bg-blue-50" : "text-slate-700"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LineSpacingDropdown({
  editor,
  disabled = false,
}: {
  editor: Editor | null;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const applyLineSpacing = useCallback(
    (spacing: string) => {
      if (!editor) return;
      // Apply line-height to the editor's content via a style
      const editorEl = editor.view.dom as HTMLElement;
      editorEl.style.lineHeight = spacing;
    },
    [editor]
  );

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled}
        title="Line spacing"
        className="p-1.5 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-default transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="11" y1="6" x2="21" y2="6" />
          <line x1="11" y1="12" x2="21" y2="12" />
          <line x1="11" y1="18" x2="21" y2="18" />
          <polyline points="4 6 7 3 7 21 4 18" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 py-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 min-w-[80px]">
          {LINE_SPACINGS.map((spacing) => (
            <button
              key={spacing}
              onClick={() => {
                applyLineSpacing(spacing);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 transition-colors"
            >
              {spacing}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
