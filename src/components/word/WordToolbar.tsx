interface WordToolbarProps {
  fileName: string | null;
}

export default function WordToolbar({ fileName }: WordToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-slate-200 min-h-[48px]">
      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        <span className="text-sm font-medium text-slate-600 truncate max-w-xs">
          {fileName || "Word Document"}
        </span>
      </div>
      <div className="flex-1" />
      <span className="text-xs text-slate-400">Read-only viewer</span>
    </div>
  );
}
