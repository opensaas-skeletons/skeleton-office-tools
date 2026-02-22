import { TOOLS } from "../../types/tool";
import type { RecentDocument } from "../../types/document";

interface ToolSelectorProps {
  recentDocuments: RecentDocument[];
  onOpenFile: () => void;
  onOpenRecent: (filePath: string) => void;
}

export default function ToolSelector({ recentDocuments, onOpenFile, onOpenRecent }: ToolSelectorProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto bg-slate-50/50">
      {/* Heading */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-800">What would you like to work on?</h1>
        <p className="text-slate-500 mt-2">Choose a tool to get started</p>
      </div>

      {/* Tool Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full mb-10">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={tool.available ? onOpenFile : undefined}
            disabled={!tool.available}
            className={`relative flex flex-col items-center gap-3 p-6 rounded-xl border transition-all text-center ${
              tool.available
                ? "bg-white border-slate-200 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-600/5 cursor-pointer"
                : "bg-slate-50 border-slate-100 cursor-default opacity-70"
            }`}
          >
            {!tool.available && (
              <span className="absolute top-2.5 right-2.5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-slate-200 text-slate-500 rounded-full">
                Coming Soon
              </span>
            )}
            <span className="text-3xl">{tool.icon}</span>
            <div>
              <p className="text-sm font-semibold text-slate-700">{tool.name}</p>
              <p className="text-xs text-slate-400 mt-1">{tool.description}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Recent Files */}
      {recentDocuments.length > 0 && (
        <div className="max-w-2xl w-full">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Recent Files
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {recentDocuments.slice(0, 5).map((doc) => (
              <button
                key={doc.id}
                onClick={() => onOpenRecent(doc.filePath)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left group"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-red-400 flex-shrink-0"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-700 truncate group-hover:text-blue-600 transition-colors">
                    {doc.fileName}
                  </p>
                  <p className="text-xs text-slate-400">{formatSize(doc.fileSize)}</p>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-slate-300 group-hover:text-blue-500 transition-colors"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Drop hint */}
      <p className="text-xs text-slate-400 mt-8">
        or drag and drop a PDF file anywhere
      </p>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
