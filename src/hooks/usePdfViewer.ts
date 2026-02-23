import { useState, useCallback, useRef, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";
import {
  PDF_DEFAULT_SCALE,
  PDF_MIN_SCALE,
  PDF_MAX_SCALE,
  PDF_SCALE_STEP,
} from "../constants";

// Set up pdf.js worker — use Vite's URL resolution for the worker file.
// The ?url suffix ensures Vite emits the file and returns a resolved path,
// which works reliably in both dev and Tauri production builds.
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface UsePdfViewerReturn {
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  pageCount: number;
  currentPage: number;
  scale: number;
  renderPage: (pageNum: number, canvas: HTMLCanvasElement) => Promise<void>;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setScale: (scale: number) => void;
  loadDocument: (bytes: Uint8Array) => Promise<number>;
  error: string | null;
}

export function usePdfViewer(): UsePdfViewerReturn {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScaleState] = useState(PDF_DEFAULT_SCALE);
  const [error, setError] = useState<string | null>(null);
  const renderTaskRef = useRef<Map<number, pdfjsLib.RenderTask>>(new Map());
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const scaleRef = useRef(PDF_DEFAULT_SCALE);

  // Keep refs in sync with state
  useEffect(() => {
    pdfDocRef.current = pdfDoc;
  }, [pdfDoc]);
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      renderTaskRef.current.forEach((task) => task.cancel());
      renderTaskRef.current.clear();
      pdfDocRef.current?.destroy();
    };
  }, []);

  const loadDocument = useCallback(async (bytes: Uint8Array): Promise<number> => {
    setError(null);

    // Destroy previous document using ref to avoid stale closure
    if (pdfDocRef.current) {
      await pdfDocRef.current.destroy();
      pdfDocRef.current = null;
    }

    // Cancel all in-flight renders from the old document
    renderTaskRef.current.forEach((task) => task.cancel());
    renderTaskRef.current.clear();

    // Copy the bytes — pdf.js transfers the ArrayBuffer to its web worker,
    // which neuters the original Uint8Array (byteLength becomes 0).
    // The caller keeps the original for later use (e.g. flatten/save).
    const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
    const doc = await loadingTask.promise;

    pdfDocRef.current = doc;
    setPdfDoc(doc);
    setPageCount(doc.numPages);
    setCurrentPage(1);
    setScaleState(PDF_DEFAULT_SCALE);

    return doc.numPages;
  }, []);

  // Use pdfDocRef inside renderPage to avoid stale closures — the callback
  // identity changes only when scale changes (to trigger re-renders in
  // PdfPage). Scale is read from the closure (not ref) to avoid stale
  // values caused by effect ordering (child effects fire before parent).
  const renderPage = useCallback(
    async (pageNum: number, canvas: HTMLCanvasElement) => {
      const doc = pdfDocRef.current;
      if (!doc) return;
      if (pageNum < 1 || pageNum > doc.numPages) return;

      // Cancel any ongoing render for this page
      const existing = renderTaskRef.current.get(pageNum);
      if (existing) {
        existing.cancel();
        renderTaskRef.current.delete(pageNum);
      }

      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      // Account for high-DPI displays to render crisp text
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.scale(dpr, dpr);

      const renderTask = page.render({
        canvasContext: ctx,
        viewport,
      });

      renderTaskRef.current.set(pageNum, renderTask);

      try {
        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") {
          console.error("Render error:", err);
        }
      } finally {
        renderTaskRef.current.delete(pageNum);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reads from refs;
    // scale is included only so PdfPage re-triggers its effect on zoom change
    [scale]
  );

  const nextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, pageCount));
  }, [pageCount]);

  const prevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  }, []);

  const goToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= pageCount) {
        setCurrentPage(page);
      }
    },
    [pageCount]
  );

  const zoomIn = useCallback(() => {
    setScaleState((prev) => Math.min(prev + PDF_SCALE_STEP, PDF_MAX_SCALE));
  }, []);

  const zoomOut = useCallback(() => {
    setScaleState((prev) => Math.max(prev - PDF_SCALE_STEP, PDF_MIN_SCALE));
  }, []);

  const resetZoom = useCallback(() => {
    setScaleState(PDF_DEFAULT_SCALE);
  }, []);

  const setScale = useCallback((newScale: number) => {
    const clamped = Math.max(PDF_MIN_SCALE, Math.min(newScale, PDF_MAX_SCALE));
    setScaleState(clamped);
  }, []);

  return {
    pdfDoc,
    pageCount,
    currentPage,
    scale,
    renderPage,
    nextPage,
    prevPage,
    goToPage,
    zoomIn,
    zoomOut,
    resetZoom,
    setScale,
    loadDocument,
    error,
  };
}
