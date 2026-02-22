import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { addRecentDocument, getRecentDocuments } from "../db/sqlite";
import type { RecentDocument } from "../types/document";

declare global {
  interface Window {
    __OPENED_FILE__?: string;
  }
}

interface DocumentState {
  filePath: string | null;
  fileName: string | null;
  fileBytes: Uint8Array | null;
}

interface UseDocumentReturn {
  document: DocumentState;
  recentDocuments: RecentDocument[];
  openFile: () => Promise<void>;
  openFilePath: (path: string) => Promise<void>;
  saveFile: (bytes: Uint8Array, path?: string) => Promise<void>;
  closeFile: () => void;
  isLoading: boolean;
}

export function useDocument(): UseDocumentReturn {
  const [document, setDocument] = useState<DocumentState>({
    filePath: null,
    fileName: null,
    fileBytes: null,
  });
  const [recentDocuments, setRecentDocuments] = useState<RecentDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load recent documents on mount
  useEffect(() => {
    loadRecentDocuments();
  }, []);

  // Check for "Open With" file on mount
  useEffect(() => {
    if (window.__OPENED_FILE__) {
      const filePath = window.__OPENED_FILE__;
      delete window.__OPENED_FILE__;
      openFilePath(filePath);
    }
  }, []);

  const loadRecentDocuments = async () => {
    try {
      const docs = await getRecentDocuments();
      setRecentDocuments(
        docs.map((d) => ({
          id: d.id,
          filePath: d.file_path,
          fileName: d.file_name,
          fileSize: d.file_size,
          lastOpened: d.last_opened,
          pageCount: d.page_count,
        }))
      );
    } catch (err) {
      console.error("Failed to load recent documents:", err);
    }
  };

  const openFilePath = useCallback(async (path: string) => {
    setIsLoading(true);
    try {
      const bytes: number[] = await invoke("read_file_bytes", { path });
      const uint8 = new Uint8Array(bytes);
      const fileName = path.split(/[\\/]/).pop() || "unknown.pdf";

      setDocument({
        filePath: path,
        fileName,
        fileBytes: uint8,
      });
    } catch (err) {
      console.error("Failed to read file:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const openFile = useCallback(async () => {
    setIsLoading(true);
    try {
      const selected: string | null = await invoke("open_file_dialog");
      if (!selected) {
        setIsLoading(false);
        return;
      }
      await openFilePath(selected);
    } catch (err) {
      console.error("Failed to open file:", err);
      setIsLoading(false);
    }
  }, [openFilePath]);

  /**
   * Save (or "Save As") the PDF bytes.
   * If a path is provided, save there; otherwise save to the current path.
   */
  const saveFile = useCallback(
    async (bytes: Uint8Array, path?: string) => {
      const savePath = path || document.filePath;
      if (!savePath) return;

      try {
        await invoke("write_file_bytes", {
          path: savePath,
          bytes: Array.from(bytes),
        });
      } catch (err) {
        console.error("Failed to save file:", err);
      }
    },
    [document.filePath]
  );

  const closeFile = useCallback(() => {
    setDocument({
      filePath: null,
      fileName: null,
      fileBytes: null,
    });
  }, []);

  /**
   * Called externally after pdf.js has loaded the document
   * to record it in recent documents.
   */
  const recordRecentDocument = useCallback(
    async (pageCount: number) => {
      if (!document.filePath || !document.fileName || !document.fileBytes) return;
      try {
        await addRecentDocument(
          document.filePath,
          document.fileName,
          document.fileBytes.byteLength,
          pageCount
        );
        await loadRecentDocuments();
      } catch (err) {
        console.error("Failed to record recent document:", err);
      }
    },
    [document.filePath, document.fileName, document.fileBytes]
  );

  return {
    document,
    recentDocuments,
    openFile,
    openFilePath,
    saveFile,
    closeFile,
    isLoading,
  };
}
