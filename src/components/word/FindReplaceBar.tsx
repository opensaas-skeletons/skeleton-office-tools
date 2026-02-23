import { useState, useCallback, useRef, useEffect } from "react";
import type { Editor } from "@tiptap/react";

interface FindReplaceBarProps {
  editor: Editor;
  onClose: () => void;
}

export default function FindReplaceBar({ editor, onClose }: FindReplaceBarProps) {
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);
  const findInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    findInputRef.current?.focus();
  }, []);

  const clearHighlights = useCallback(() => {
    const editorEl = editor.view.dom;
    const marks = editorEl.querySelectorAll("mark[data-find-highlight]");
    marks.forEach((mark) => {
      const parent = mark.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent || ""), mark);
        parent.normalize();
      }
    });
  }, [editor]);

  const highlightMatches = useCallback(
    (text: string) => {
      clearHighlights();
      if (!text) {
        setMatchCount(0);
        setCurrentMatch(0);
        return [];
      }

      const editorEl = editor.view.dom;
      const treeWalker = document.createTreeWalker(editorEl, NodeFilter.SHOW_TEXT);
      const textNodes: Text[] = [];
      let node: Node | null;
      while ((node = treeWalker.nextNode())) {
        textNodes.push(node as Text);
      }

      const matches: { node: Text; index: number }[] = [];
      const lowerText = text.toLowerCase();

      for (const textNode of textNodes) {
        const content = textNode.textContent || "";
        const lowerContent = content.toLowerCase();
        let startIndex = 0;
        let idx: number;
        while ((idx = lowerContent.indexOf(lowerText, startIndex)) !== -1) {
          matches.push({ node: textNode, index: idx });
          startIndex = idx + 1;
        }
      }

      // Apply highlights in reverse to preserve positions
      for (let i = matches.length - 1; i >= 0; i--) {
        const match = matches[i];
        const range = document.createRange();
        range.setStart(match.node, match.index);
        range.setEnd(match.node, match.index + text.length);

        const mark = document.createElement("mark");
        mark.setAttribute("data-find-highlight", "true");
        mark.style.backgroundColor = i === 0 ? "#ff9632" : "#ffff00";
        mark.style.color = "inherit";
        range.surroundContents(mark);
      }

      setMatchCount(matches.length);
      setCurrentMatch(matches.length > 0 ? 1 : 0);
      return matches;
    },
    [editor, clearHighlights]
  );

  const handleFind = useCallback(() => {
    highlightMatches(findText);
  }, [findText, highlightMatches]);

  const scrollToCurrentMatch = useCallback(
    (index: number) => {
      const editorEl = editor.view.dom;
      const marks = editorEl.querySelectorAll("mark[data-find-highlight]");

      marks.forEach((mark, i) => {
        (mark as HTMLElement).style.backgroundColor =
          i === index ? "#ff9632" : "#ffff00";
      });

      if (marks[index]) {
        marks[index].scrollIntoView({ behavior: "smooth", block: "center" });
      }
    },
    [editor]
  );

  const handleFindNext = useCallback(() => {
    if (matchCount === 0) {
      handleFind();
      return;
    }
    const next = currentMatch < matchCount ? currentMatch + 1 : 1;
    setCurrentMatch(next);
    scrollToCurrentMatch(next - 1);
  }, [matchCount, currentMatch, handleFind, scrollToCurrentMatch]);

  const handleFindPrev = useCallback(() => {
    if (matchCount === 0) return;
    const prev = currentMatch > 1 ? currentMatch - 1 : matchCount;
    setCurrentMatch(prev);
    scrollToCurrentMatch(prev - 1);
  }, [matchCount, currentMatch, scrollToCurrentMatch]);

  const handleReplace = useCallback(() => {
    if (matchCount === 0 || !findText) return;

    const editorEl = editor.view.dom;
    const marks = editorEl.querySelectorAll("mark[data-find-highlight]");
    const targetMark = marks[currentMatch - 1];
    if (!targetMark) return;

    targetMark.textContent = replaceText;
    const parent = targetMark.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(replaceText), targetMark);
      parent.normalize();
    }

    // Sync back to TipTap
    const html = editorEl.innerHTML;
    editor.commands.setContent(html);

    // Re-highlight
    highlightMatches(findText);
  }, [matchCount, findText, replaceText, currentMatch, editor, highlightMatches]);

  const handleReplaceAll = useCallback(() => {
    if (matchCount === 0 || !findText) return;

    clearHighlights();

    const { state } = editor;
    const { doc, tr } = state;
    const lowerFind = findText.toLowerCase();

    // Collect all positions with matches (reverse order for safe replacement)
    const replacements: { from: number; to: number }[] = [];
    doc.descendants((node, pos) => {
      if (node.isText && node.text) {
        const lowerContent = node.text.toLowerCase();
        let startIndex = 0;
        let idx: number;
        while ((idx = lowerContent.indexOf(lowerFind, startIndex)) !== -1) {
          replacements.push({ from: pos + idx, to: pos + idx + findText.length });
          startIndex = idx + 1;
        }
      }
    });

    // Apply replacements in reverse
    for (let i = replacements.length - 1; i >= 0; i--) {
      const { from, to } = replacements[i];
      tr.replaceWith(from, to, state.schema.text(replaceText));
    }

    editor.view.dispatch(tr);
    setMatchCount(0);
    setCurrentMatch(0);
  }, [matchCount, findText, replaceText, editor, clearHighlights]);

  const handleClose = useCallback(() => {
    clearHighlights();
    onClose();
  }, [clearHighlights, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleFindNext();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    },
    [handleFindNext, handleClose]
  );

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border-b border-slate-200">
      <div className="flex items-center gap-1.5">
        <input
          ref={findInputRef}
          type="text"
          value={findText}
          onChange={(e) => setFindText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Find..."
          className="w-40 h-7 px-2 text-sm border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-400"
        />
        {findText && (
          <span className="text-xs text-slate-400 tabular-nums min-w-[48px]">
            {matchCount > 0 ? `${currentMatch}/${matchCount}` : "0 results"}
          </span>
        )}
        <button
          onClick={handleFindPrev}
          disabled={matchCount === 0}
          title="Previous match"
          className="p-1 rounded text-slate-500 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-default transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
        <button
          onClick={handleFindNext}
          title="Next match"
          className="p-1 rounded text-slate-500 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-default transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      <div className="w-px h-5 bg-slate-200" />

      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={replaceText}
          onChange={(e) => setReplaceText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Replace..."
          className="w-40 h-7 px-2 text-sm border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-400"
        />
        <button
          onClick={handleReplace}
          disabled={matchCount === 0}
          title="Replace"
          className="px-2 py-1 text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded disabled:opacity-30 disabled:cursor-default transition-colors"
        >
          Replace
        </button>
        <button
          onClick={handleReplaceAll}
          disabled={matchCount === 0}
          title="Replace All"
          className="px-2 py-1 text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded disabled:opacity-30 disabled:cursor-default transition-colors"
        >
          Replace All
        </button>
      </div>

      <div className="flex-1" />

      <button
        onClick={handleClose}
        title="Close (Esc)"
        className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
