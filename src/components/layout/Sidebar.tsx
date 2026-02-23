import type { RecentDocument } from "../../types/document";

interface SidebarProps {
  recentDocuments: RecentDocument[];
  onOpenRecent: (filePath: string) => void;
  onClearRecents: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({
  recentDocuments,
  onOpenRecent,
  onClearRecents,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  return (
    <aside
      className={`flex flex-col bg-slate-50 border-r border-slate-200 transition-all duration-200 ${
        collapsed ? "w-10" : "w-60"
      }`}
    >
      {/* Toggle button */}
      <button
        onClick={onToggleCollapse}
        className="flex items-center justify-center h-10 hover:bg-slate-100 transition-colors border-b border-slate-200"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-slate-500 transition-transform ${collapsed ? "rotate-180" : ""}`}
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {!collapsed && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Recent Files
            </span>
            {recentDocuments.length > 0 && (
              <button
                onClick={onClearRecents}
                className="text-xs text-slate-400 hover:text-red-500 transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {/* File List */}
          <div className="flex-1 overflow-y-auto px-1.5">
            {recentDocuments.length === 0 ? (
              <p className="px-2 py-4 text-xs text-slate-400 text-center">No recent files</p>
            ) : (
              recentDocuments.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => onOpenRecent(doc.filePath)}
                  className="w-full flex items-start gap-2 px-2 py-2 rounded-lg hover:bg-slate-100 transition-colors text-left group"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-red-400 flex-shrink-0 mt-0.5"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-700 truncate group-hover:text-blue-600 transition-colors">
                      {doc.fileName}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatDate(doc.lastOpened)} &middot; {formatSize(doc.fileSize)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </aside>
  );
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / (1000 * 60));
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch {
    return dateStr;
  }
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
