interface WordViewerProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  isLoaded: boolean;
  error: string | null;
}

export default function WordViewer({ containerRef, isLoaded, error }: WordViewerProps) {
  return (
    <div className="flex-1 overflow-auto bg-slate-100">
      {error && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center p-8">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-700">Failed to load document</p>
            <p className="text-xs text-slate-500 mt-1">{error}</p>
          </div>
        </div>
      )}
      {!isLoaded && !error && (
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse text-slate-400">Loading document...</div>
        </div>
      )}
      <div
        ref={containerRef as React.RefObject<HTMLDivElement>}
        className="docx-container"
        style={{ display: isLoaded && !error ? "block" : "none" }}
      />
    </div>
  );
}
