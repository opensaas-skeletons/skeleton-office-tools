import { useState, useCallback, useRef } from "react";
import { renderAsync } from "docx-preview";

interface UseWordViewerReturn {
  isLoaded: boolean;
  error: string | null;
  loadDocument: (bytes: Uint8Array) => Promise<void>;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function useWordViewer(): UseWordViewerReturn {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const loadDocument = useCallback(async (bytes: Uint8Array) => {
    setError(null);
    setIsLoaded(false);

    const container = containerRef.current;
    if (!container) {
      setError("Viewer container not ready");
      return;
    }

    try {
      // Clear previous content
      container.innerHTML = "";

      await renderAsync(bytes.buffer as ArrayBuffer, container, undefined, {
        className: "docx-viewer",
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        ignoreFonts: false,
        breakPages: true,
        ignoreLastRenderedPageBreak: true,
        experimental: false,
        trimXmlDeclaration: true,
        useBase64URL: true,
        renderHeaders: true,
        renderFooters: true,
        renderFootnotes: true,
        renderEndnotes: true,
      });

      setIsLoaded(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Failed to render Word document:", err);
      setError(message);
    }
  }, []);

  return {
    isLoaded,
    error,
    loadDocument,
    containerRef,
  };
}
