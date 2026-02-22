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
}

export function usePdfViewer(): UsePdfViewerReturn {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScaleState] = useState(PDF_DEFAULT_SCALE);
  const renderTaskRef = useRef<Map<number, pdfjsLib.RenderTask>>(new Map());

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      renderTaskRef.current.forEach((task) => task.cancel());
      renderTaskRef.current.clear();
    };
  }, []);

  const loadDocument = useCallback(async (bytes: Uint8Array): Promise<number> => {
    // Destroy previous document
    if (pdfDoc) {
      await pdfDoc.destroy();
    }

    const loadingTask = pdfjsLib.getDocument({ data: bytes });
    const doc = await loadingTask.promise;

    setPdfDoc(doc);
    setPageCount(doc.numPages);
    setCurrentPage(1);
    setScaleState(PDF_DEFAULT_SCALE);

    return doc.numPages;
  }, [pdfDoc]);

  const renderPage = useCallback(
    async (pageNum: number, canvas: HTMLCanvasElement) => {
      if (!pdfDoc) return;
      if (pageNum < 1 || pageNum > pdfDoc.numPages) return;

      // Cancel any ongoing render for this page
      const existing = renderTaskRef.current.get(pageNum);
      if (existing) {
        existing.cancel();
        renderTaskRef.current.delete(pageNum);
      }

      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

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
    [pdfDoc, scale]
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
  };
}
