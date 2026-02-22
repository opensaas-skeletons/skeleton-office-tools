import { useState, useRef, useEffect, useCallback } from "react";
import type { TextAnnotation } from "../../types/pdf";
import { TEXT_MIN_FONT_SIZE, TEXT_MAX_FONT_SIZE } from "../../constants";

interface TextOverlayProps {
  annotation: TextAnnotation;
  selected: boolean;
  isNew?: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<TextAnnotation>) => void;
  onDelete: (id: string) => void;
  scale: number;
}

export default function TextOverlay({
  annotation,
  selected,
  isNew,
  onSelect,
  onUpdate,
  onDelete,
  scale,
}: TextOverlayProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, origX: 0, origY: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the input when this overlay is newly created
  useEffect(() => {
    if (isNew && inputRef.current) {
      inputRef.current.focus();
      setIsEditing(true);
    }
  }, [isNew]);

  // When selected externally (e.g. clicking the border area), don't force focus
  // but when deselected, exit editing mode
  useEffect(() => {
    if (!selected) {
      setIsEditing(false);
    }
  }, [selected]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      // Let input and button handle their own events
      if (tag === "INPUT" || tag === "BUTTON") {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      onSelect(annotation.id);
      setIsEditing(false);
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

  // Handle keyboard shortcut to delete overlay (Delete key when input is not focused)
  useEffect(() => {
    if (!selected) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only delete the overlay if Delete is pressed and input is NOT focused
      if (e.key === "Delete" && document.activeElement !== inputRef.current) {
        e.preventDefault();
        onDelete(annotation.id);
      }
      // Escape deselects the overlay
      if (e.key === "Escape") {
        e.preventDefault();
        if (isEditing) {
          setIsEditing(false);
          inputRef.current?.blur();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selected, isEditing, annotation.id, onDelete]);

  return (
    <div
      ref={overlayRef}
      onMouseDown={handleMouseDown}
      onClick={(e) => e.stopPropagation()}
      className={`absolute group ${
        isDragging ? "cursor-grabbing" : isEditing ? "cursor-text" : "cursor-grab"
      }`}
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
        ref={inputRef}
        type="text"
        value={annotation.text}
        onChange={(e) => onUpdate(annotation.id, { text: e.target.value })}
        onFocus={() => {
          onSelect(annotation.id);
          setIsEditing(true);
        }}
        onBlur={() => setIsEditing(false)}
        onMouseDown={(e) => {
          // Stop propagation so clicking the input doesn't trigger drag
          e.stopPropagation();
          onSelect(annotation.id);
          setIsEditing(true);
        }}
        className="w-full bg-transparent border-none outline-none cursor-text"
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
            onMouseDown={(e) => e.stopPropagation()}
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
            onMouseDown={(e) => e.stopPropagation()}
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
            onMouseDown={(e) => e.stopPropagation()}
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
