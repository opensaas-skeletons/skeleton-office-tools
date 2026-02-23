import { EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import "../../styles/word-editor.css";

interface WordEditorProps {
  editor: Editor | null;
  isReady: boolean;
}

export default function WordEditor({ editor, isReady }: WordEditorProps) {
  if (!isReady) {
    return (
      <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="word-editor-wrapper">
      <div className="word-editor-page">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
