interface PlaceholderViewerProps {
  icon: string;
  title: string;
  description: string;
  fileName: string | null;
}

export default function PlaceholderViewer({ icon, title, description, fileName }: PlaceholderViewerProps) {
  return (
    <div className="flex-1 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-slate-200 min-h-[48px]">
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-medium text-slate-600 truncate max-w-xs">
          {fileName || "Document"}
        </span>
        <div className="flex-1" />
        <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-amber-100 text-amber-600 rounded-full">
          Coming Soon
        </span>
      </div>

      {/* Placeholder body */}
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center p-8 max-w-sm">
          <div className="text-5xl mb-4">{icon}</div>
          <h2 className="text-lg font-semibold text-slate-700">{title}</h2>
          <p className="text-sm text-slate-500 mt-2">{description}</p>
          <div className="mt-6 p-4 bg-white rounded-xl border border-slate-200">
            <p className="text-xs text-slate-400">
              This file type will be supported in a future update.
              The file has been recorded in your recent documents.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
