import { useState, useRef, useEffect, useCallback } from "react";
import type { SignatureAnnotation } from "../../types/pdf";
import type { Signature } from "../../types/signature";
import { SIGNATURE_FONTS } from "../../types/signature";
import { SIGNATURE_DEFAULT_FONT_SIZE } from "../../constants";

interface SignatureOverlayProps {
  annotation: SignatureAnnotation;
  signature: Signature | undefined;
  selected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<SignatureAnnotation>) => void;
  onDelete: (id: string) => void;
  scale: number;
}

export default function SignatureOverlay({
  annotation,
  signature,
  selected,
  onSelect,
  onUpdate,
  onDelete,
  scale,
}: SignatureOverlayProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, origX: 0, origY: 0 });

  const fontEntry = signature
    ? SIGNATURE_FONTS.find((f) => f.family === signature.fontFamily)
    : undefined;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).tagName === "BUTTON") return;
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

  if (!signature) return null;

  return (
    <div
      onMouseDown={handleMouseDown}
      onClick={(e) => e.stopPropagation()}
      className={`absolute group ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
      style={{
        left: annotation.x * scale,
        top: annotation.y * scale,
        zIndex: selected ? 20 : 10,
        pointerEvents: "auto",
      }}
    >
      {/* Selection border */}
      <div
        className={`absolute -inset-1.5 rounded border-2 transition-colors ${
          selected ? "border-blue-500" : "border-transparent group-hover:border-blue-300"
        }`}
      />

      {/* Signature text */}
      <span
        className={fontEntry?.className ?? "font-signature-1"}
        style={{
          fontSize: SIGNATURE_DEFAULT_FONT_SIZE * scale,
          color: signature.color,
          lineHeight: 1,
          whiteSpace: "nowrap",
          userSelect: "none",
        }}
      >
        {signature.name}
      </span>

      {/* Delete button (visible when selected) */}
      {selected && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(annotation.id);
          }}
          className="absolute -top-7 -right-1 w-6 h-6 flex items-center justify-center bg-white rounded-md shadow-md border border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      )}
    </div>
  );
}
