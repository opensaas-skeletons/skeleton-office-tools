import { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface FileDropZoneProps {
  onFileDrop: (filePath: string) => void;
}

export default function FileDropZone({ onFileDrop }: FileDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setup = async () => {
      const currentWindow = getCurrentWindow();
      unlisten = await currentWindow.onDragDropEvent((event) => {
        const payload = event.payload;

        if (payload.type === "enter" || payload.type === "over") {
          setIsDragOver(true);
        } else if (payload.type === "leave") {
          setIsDragOver(false);
        } else if (payload.type === "drop") {
          setIsDragOver(false);
          const paths = payload.paths;
          if (paths && paths.length > 0) {
            const filePath = paths[0];
            const ext = filePath.toLowerCase();
            const supported = [".pdf", ".docx", ".doc", ".xlsx", ".xls", ".csv", ".pptx", ".ppt"];
            if (supported.some((e) => ext.endsWith(e))) {
              onFileDrop(filePath);
            }
          }
        }
      });
    };

    setup();

    return () => {
      if (unlisten) unlisten();
    };
  }, [onFileDrop]);

  // Also prevent default browser drag behavior so files don't navigate
  useEffect(() => {
    const prevent = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("dragover", prevent);
    window.addEventListener("drop", prevent);
    return () => {
      window.removeEventListener("dragover", prevent);
      window.removeEventListener("drop", prevent);
    };
  }, []);

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
          <p className="text-xl font-semibold text-slate-800">Drop file here</p>
          <p className="text-sm text-slate-500 mt-1">Release to open your document</p>
        </div>
      </div>
    </div>
  );
}
