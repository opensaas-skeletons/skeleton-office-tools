import { useRef, useCallback, useEffect } from "react";
import type { Annotation, PdfMode } from "../../types/pdf";
import type { Signature } from "../../types/signature";
import PdfPage from "./PdfPage";

interface PageDimension {
  width: number;
  height: number;
}

interface PdfViewerProps {
  pageCount: number;
  currentPage: number;
  scale: number;
  mode: PdfMode;
  annotations: Annotation[];
  signatures: Signature[];
  selectedAnnotationId: string | null;
  newAnnotationId: string | null;
  pageDimensions: PageDimension[];
  renderPage: (pageNumber: number, canvas: HTMLCanvasElement) => void;
  onSelectAnnotation: (id: string | null) => void;
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  onDeleteAnnotation: (id: string) => void;
  onPageClick: (pageNumber: number, x: number, y: number) => void;
  onNewAnnotationHandled: () => void;
}

export default function PdfViewer({
  pageCount,
  currentPage,
  scale,
  mode,
  annotations,
  signatures,
  selectedAnnotationId,
  newAnnotationId,
  pageDimensions,
  renderPage,
  onSelectAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onPageClick,
  onNewAnnotationHandled,
}: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll to the target page when currentPage changes via toolbar navigation
  useEffect(() => {
    if (!containerRef.current || currentPage < 1) return;
    const pageEl = containerRef.current.querySelector(
      `[data-page-number="${currentPage}"]`
    );
    if (pageEl) {
      pageEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [currentPage]);

  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Only deselect when clicking the scroll container or the inner wrapper,
      // not when clicks bubble up from page content or annotations
      if (e.target === e.currentTarget) {
        onSelectAnnotation(null);
      }
    },
    [onSelectAnnotation]
  );

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto bg-slate-100 p-6"
      onClick={handleBackgroundClick}
    >
      <div
        className="flex flex-col items-center gap-4"
        onClick={handleBackgroundClick}
      >
        {Array.from({ length: pageCount }, (_, i) => {
          const pageNum = i + 1;
          const dims = pageDimensions[i] ?? { width: 612, height: 792 };
          return (
            <PdfPage
              key={pageNum}
              pageNumber={pageNum}
              scale={scale}
              width={dims.width}
              height={dims.height}
              renderPage={renderPage}
              annotations={annotations}
              signatures={signatures}
              selectedAnnotationId={selectedAnnotationId}
              newAnnotationId={newAnnotationId}
              mode={mode}
              onSelectAnnotation={onSelectAnnotation}
              onUpdateAnnotation={onUpdateAnnotation}
              onDeleteAnnotation={onDeleteAnnotation}
              onPageClick={onPageClick}
              onNewAnnotationHandled={onNewAnnotationHandled}
            />
          );
        })}
      </div>
    </div>
  );
}
