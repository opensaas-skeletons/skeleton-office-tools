import { useState, useRef, useEffect } from "react";
import { APP_NAME } from "../../constants";

interface HeaderProps {
  fileName: string | null;
  onOpenFile: () => void;
  onSaveFile: () => void;
  onCloseFile: () => void;
  hasDocument: boolean;
}

export default function Header({ fileName, onOpenFile, onSaveFile, onCloseFile, hasDocument }: HeaderProps) {
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [helpMenuOpen, setHelpMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const fileMenuRef = useRef<HTMLDivElement>(null);
  const helpMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) {
        setFileMenuOpen(false);
      }
      if (helpMenuRef.current && !helpMenuRef.current.contains(e.target as Node)) {
        setHelpMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <header className="flex items-center h-12 bg-white border-b border-slate-200 px-3 select-none" data-tauri-drag-region>
        {/* Left: Logo + App Name */}
        <div className="flex items-center gap-2 min-w-[180px]">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-slate-700">{APP_NAME}</span>
        </div>

        {/* Center: Menus + File Name */}
        <div className="flex items-center gap-1 ml-2">
          {/* File Menu */}
          <div ref={fileMenuRef} className="relative">
            <button
              onClick={() => { setFileMenuOpen(!fileMenuOpen); setHelpMenuOpen(false); }}
              className="px-2.5 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded transition-colors"
            >
              File
            </button>
            {fileMenuOpen && (
              <div className="absolute top-full left-0 mt-0.5 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                <MenuItem
                  label="Open PDF..."
                  shortcut="Ctrl+O"
                  onClick={() => { onOpenFile(); setFileMenuOpen(false); }}
                />
                <MenuItem
                  label="Save"
                  shortcut="Ctrl+S"
                  onClick={() => { onSaveFile(); setFileMenuOpen(false); }}
                  disabled={!hasDocument}
                />
                <div className="my-1 border-t border-slate-100" />
                <MenuItem
                  label="Close"
                  onClick={() => { onCloseFile(); setFileMenuOpen(false); }}
                  disabled={!hasDocument}
                />
              </div>
            )}
          </div>

          {/* Help Menu */}
          <div ref={helpMenuRef} className="relative">
            <button
              onClick={() => { setHelpMenuOpen(!helpMenuOpen); setFileMenuOpen(false); }}
              className="px-2.5 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded transition-colors"
            >
              Help
            </button>
            {helpMenuOpen && (
              <div className="absolute top-full left-0 mt-0.5 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                <MenuItem
                  label="About"
                  onClick={() => { setAboutOpen(true); setHelpMenuOpen(false); }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Center: File Name */}
        <div className="flex-1 flex justify-center">
          {fileName && (
            <span className="text-sm text-slate-500 truncate max-w-[300px]">
              {fileName}
            </span>
          )}
        </div>

        {/* Right: Window controls placeholder */}
        <div className="min-w-[180px]" />
      </header>

      {/* About Dialog */}
      {aboutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAboutOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 p-8 max-w-sm text-center">
            <div className="w-14 h-14 mx-auto rounded-xl bg-blue-600 flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-800">{APP_NAME}</h3>
            <p className="text-sm text-slate-500 mt-1">Version 1.0.0</p>
            <p className="text-sm text-slate-500 mt-3">
              A modern desktop office suite for viewing and editing documents.
            </p>
            <button
              onClick={() => setAboutOpen(false)}
              className="mt-5 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function MenuItem({
  label,
  shortcut,
  onClick,
  disabled = false,
}: {
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-default transition-colors"
    >
      <span>{label}</span>
      {shortcut && <span className="text-xs text-slate-400">{shortcut}</span>}
    </button>
  );
}
