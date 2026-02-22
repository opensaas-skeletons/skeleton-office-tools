import { useState, useRef, useEffect, useCallback } from "react";
import type { TextAnnotation } from "../../types/pdf";
import { TEXT_MIN_FONT_SIZE, TEXT_MAX_FONT_SIZE } from "../../constants";

interface TextOverlayProps {
  annotation: TextAnnotation;
  selected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<TextAnnotation>) => void;
  onDelete: (id: string) => void;
  scale: number;
}

export default function TextOverlay({
  annotation,
  selected,
  onSelect,
  onUpdate,
  onDelete,
  scale,
}: TextOverlayProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, origX: 0, origY: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "BUTTON") {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      onSelect(annotation.id);
      setIsDragging(true);
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        origX: annotation.x,
        origY: annotation.y,
      };
    },
    [annotation.id, annotation.x, annotation.y, onSelect]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragStart.current.x) / scale;
      const dy = (e.clientY - dragStart.current.y) / scale;
      onUpdate(annotation.id, {
        x: dragStart.current.origX + dx,
        y: dragStart.current.origY + dy,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, annotation.id, onUpdate, scale]);

  return (
    <div
      ref={overlayRef}
      onMouseDown={handleMouseDown}
      className={`absolute group ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
      style={{
        left: annotation.x * scale,
        top: annotation.y * scale,
        width: annotation.width * scale,
        zIndex: selected ? 20 : 10,
        pointerEvents: "auto",
      }}
    >
      {/* Selection border */}
      <div
        className={`absolute -inset-1 rounded border-2 transition-colors ${
          selected ? "border-blue-500" : "border-transparent group-hover:border-blue-300"
        }`}
      />

      {/* Text input */}
      <input
        type="text"
        value={annotation.text}
        onChange={(e) => onUpdate(annotation.id, { text: e.target.value })}
        onFocus={() => onSelect(annotation.id)}
        className="w-full bg-transparent border-none outline-none"
        style={{
          fontSize: annotation.fontSize * scale,
          color: annotation.color,
          lineHeight: 1.2,
        }}
        placeholder="Type here..."
      />

      {/* Controls (visible when selected) */}
      {selected && (
        <div className="absolute -top-8 left-0 flex items-center gap-1 bg-white rounded-md shadow-md border border-slate-200 px-1 py-0.5">
          {/* Font size control */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdate(annotation.id, {
                fontSize: Math.max(TEXT_MIN_FONT_SIZE, annotation.fontSize - 2),
              });
            }}
            className="w-5 h-5 flex items-center justify-center text-xs text-slate-500 hover:text-slate-700 rounded hover:bg-slate-100"
          >
            A
          </button>
          <span className="text-[10px] text-slate-400 tabular-nums w-5 text-center">
            {annotation.fontSize}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdate(annotation.id, {
                fontSize: Math.min(TEXT_MAX_FONT_SIZE, annotation.fontSize + 2),
              });
            }}
            className="w-5 h-5 flex items-center justify-center text-sm font-bold text-slate-500 hover:text-slate-700 rounded hover:bg-slate-100"
          >
            A
          </button>

          <div className="w-px h-4 bg-slate-200 mx-0.5" />

          {/* Delete */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(annotation.id);
            }}
            className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-red-500 rounded hover:bg-red-50"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
