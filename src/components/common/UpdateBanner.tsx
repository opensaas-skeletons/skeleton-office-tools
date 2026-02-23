import type { UpdateStatus } from "../../hooks/useUpdater";

interface UpdateBannerProps {
  status: UpdateStatus;
  progress: number;
  version: string | null;
  error: string | null;
  onDownload: () => void;
  onRestart: () => void;
  onDismiss: () => void;
  onRetry: () => void;
}

export default function UpdateBanner({
  status,
  progress,
  version,
  error,
  onDownload,
  onRestart,
  onDismiss,
  onRetry,
}: UpdateBannerProps) {
  if (status === "idle" || status === "checking" || status === "dismissed") {
    return null;
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-sm select-none">
      {status === "available" && (
        <>
          <span className="flex-1">
            A new version {version ? `(v${version})` : ""} is available.
          </span>
          <button
            onClick={onDownload}
            className="px-3 py-1 bg-amber-600 text-white text-xs font-medium rounded hover:bg-amber-700 transition-colors"
          >
            Update Now
          </button>
          <button
            onClick={onDismiss}
            className="px-3 py-1 text-xs text-amber-700 hover:text-amber-900 transition-colors"
          >
            Dismiss
          </button>
        </>
      )}

      {status === "downloading" && (
        <>
          <span className="shrink-0">Downloading update... {progress}%</span>
          <div className="flex-1 h-2 bg-amber-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </>
      )}

      {status === "ready" && (
        <>
          <span className="flex-1">Update ready! Restart to apply.</span>
          <button
            onClick={onRestart}
            className="px-3 py-1 bg-amber-600 text-white text-xs font-medium rounded hover:bg-amber-700 transition-colors"
          >
            Restart Now
          </button>
          <button
            onClick={onDismiss}
            className="px-3 py-1 text-xs text-amber-700 hover:text-amber-900 transition-colors"
          >
            Later
          </button>
        </>
      )}

      {status === "error" && (
        <>
          <span className="flex-1">
            Update check failed.{error ? ` ${error}` : ""}
          </span>
          <button
            onClick={onRetry}
            className="px-3 py-1 bg-amber-600 text-white text-xs font-medium rounded hover:bg-amber-700 transition-colors"
          >
            Retry
          </button>
          <button
            onClick={onDismiss}
            className="px-3 py-1 text-xs text-amber-700 hover:text-amber-900 transition-colors"
          >
            Dismiss
          </button>
        </>
      )}
    </div>
  );
}
