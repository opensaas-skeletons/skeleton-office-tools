import { useState, useEffect, useCallback } from "react";

interface FileDropZoneProps {
  onFileDrop: (filePath: string) => void;
}

export default function FileDropZone({ onFileDrop }: FileDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only trigger if leaving the window entirely
    if (e.relatedTarget === null || !(e.relatedTarget as Node).ownerDocument) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.name.toLowerCase().endsWith(".pdf")) {
          // In Tauri, file paths come from the drop event
          const path = (file as File & { path?: string }).path;
          if (path) {
            onFileDrop(path);
          }
        }
      }
    },
    [onFileDrop]
  );

  useEffect(() => {
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);
    return () => {
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [handleDragOver, handleDragLeave, handleDrop]);

  if (!isDragOver) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-blue-600/20 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 p-12 bg-white rounded-2xl shadow-2xl border-2 border-dashed border-blue-400">
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#2563eb"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <div className="text-center">
          <p className="text-xl font-semibold text-slate-800">Drop PDF here</p>
          <p className="text-sm text-slate-500 mt-1">Release to open your document</p>
        </div>
      </div>
    </div>
  );
}
