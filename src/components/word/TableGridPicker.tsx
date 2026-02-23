import { useState, useRef, useEffect } from "react";

interface TableGridPickerProps {
  onInsert: (rows: number, cols: number) => void;
  disabled?: boolean;
}

const MAX_ROWS = 6;
const MAX_COLS = 8;

export default function TableGridPicker({ onInsert, disabled = false }: TableGridPickerProps) {
  const [open, setOpen] = useState(false);
  const [hoverRow, setHoverRow] = useState(0);
  const [hoverCol, setHoverCol] = useState(0);
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
        title="Insert Table"
        className="p-1.5 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-default transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="3" y1="15" x2="21" y2="15" />
          <line x1="9" y1="3" x2="9" y2="21" />
          <line x1="15" y1="3" x2="15" y2="21" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
          <div className="mb-1.5 text-xs text-slate-500 text-center">
            {hoverRow > 0 && hoverCol > 0
              ? `${hoverRow} x ${hoverCol} Table`
              : "Insert Table"}
          </div>
          <div
            className="grid gap-0.5"
            style={{ gridTemplateColumns: `repeat(${MAX_COLS}, 1fr)` }}
            onMouseLeave={() => {
              setHoverRow(0);
              setHoverCol(0);
            }}
          >
            {Array.from({ length: MAX_ROWS }, (_, row) =>
              Array.from({ length: MAX_COLS }, (_, col) => (
                <button
                  key={`${row}-${col}`}
                  className={`w-4 h-4 border rounded-sm transition-colors ${
                    row < hoverRow && col < hoverCol
                      ? "bg-blue-400 border-blue-500"
                      : "bg-white border-slate-300 hover:border-slate-400"
                  }`}
                  onMouseEnter={() => {
                    setHoverRow(row + 1);
                    setHoverCol(col + 1);
                  }}
                  onClick={() => {
                    onInsert(row + 1, col + 1);
                    setOpen(false);
                    setHoverRow(0);
                    setHoverCol(0);
                  }}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
