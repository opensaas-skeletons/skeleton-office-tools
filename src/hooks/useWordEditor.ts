import { useCallback } from "react";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import FontSize from "tiptap-extension-font-size";
import type { AnyExtension } from "@tiptap/react";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Typography from "@tiptap/extension-typography";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import type { Editor } from "@tiptap/react";

interface UseWordEditorReturn {
  editor: Editor | null;
  isReady: boolean;
  wordCount: number;
  charCount: number;
  loadHtmlContent: (html: string) => void;
}

export function useWordEditor(): UseWordEditorReturn {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        horizontalRule: false,
      }),
      Underline,
      Subscript,
      Superscript,
      TextStyle,
      Color,
      FontFamily,
      FontSize as unknown as AnyExtension,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Image.configure({ inline: true, allowBase64: true }),
      Link.configure({
        autolink: true,
        openOnClick: true,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      Placeholder.configure({ placeholder: "Start typing..." }),
      CharacterCount,
      Typography,
      TaskList,
      TaskItem.configure({ nested: true }),
      HorizontalRule,
    ],
    content: "",
    autofocus: "start",
  });

  const isReady = !!editor;

  const wordCount =
    editor?.storage.characterCount?.words?.() ?? 0;

  const charCount =
    editor?.storage.characterCount?.characters?.() ?? 0;

  const loadHtmlContent = useCallback(
    (html: string) => {
      if (editor) {
        editor.commands.setContent(html);
      }
    },
    [editor]
  );

  return {
    editor,
    isReady,
    wordCount,
    charCount,
    loadHtmlContent,
  };
}
