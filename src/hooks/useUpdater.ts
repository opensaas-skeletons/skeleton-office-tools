import { useState, useCallback, useEffect } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "ready"
  | "error"
  | "dismissed";

interface UseUpdaterReturn {
  status: UpdateStatus;
  progress: number;
  version: string | null;
  error: string | null;
  checkForUpdate: () => Promise<void>;
  downloadAndInstall: () => Promise<void>;
  restartApp: () => Promise<void>;
  dismiss: () => void;
}

export function useUpdater(): UseUpdaterReturn {
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [version, setVersion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState<Update | null>(null);

  const checkForUpdate = useCallback(async () => {
    try {
      setStatus("checking");
      setError(null);
      const update = await check();
      if (update) {
        setVersion(update.version);
        setPendingUpdate(update);
        setStatus("available");
      } else {
        setStatus("idle");
      }
    } catch (err) {
      console.error("Update check failed:", err);
      setError(err instanceof Error ? err.message : "Update check failed");
      setStatus("error");
    }
  }, []);

  const downloadAndInstall = useCallback(async () => {
    if (!pendingUpdate) return;
    try {
      setStatus("downloading");
      setProgress(0);
      let contentLength = 0;
      let downloaded = 0;
      await pendingUpdate.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            contentLength = event.data.contentLength ?? 0;
            break;
          case "Progress":
            downloaded += event.data.chunkLength;
            if (contentLength > 0) {
              setProgress(Math.round((downloaded / contentLength) * 100));
            }
            break;
          case "Finished":
            setProgress(100);
            break;
        }
      });
      setStatus("ready");
    } catch (err) {
      console.error("Download failed:", err);
      setError(err instanceof Error ? err.message : "Download failed");
      setStatus("error");
    }
  }, [pendingUpdate]);

  const restartApp = useCallback(async () => {
    await relaunch();
  }, []);

  const dismiss = useCallback(() => {
    setStatus("dismissed");
  }, []);

  // Auto-check on mount (production only, after 5s delay)
  useEffect(() => {
    if (import.meta.env.DEV) return;
    const timer = setTimeout(() => {
      checkForUpdate();
    }, 5000);
    return () => clearTimeout(timer);
  }, [checkForUpdate]);

  return {
    status,
    progress,
    version,
    error,
    checkForUpdate,
    downloadAndInstall,
    restartApp,
    dismiss,
  };
}
