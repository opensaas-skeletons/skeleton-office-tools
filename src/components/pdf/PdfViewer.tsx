import { useRef, useCallback, useEffect, useState } from "react";
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

/** Number of pages to render above/below the visible area */
const PAGE_BUFFER = 2;

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
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([1]));

  // Use IntersectionObserver to track which pages are near the viewport
  useEffect(() => {
    const container = containerRef.current;
    if (!container || pageCount === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setVisiblePages((prev) => {
          const next = new Set(prev);
          for (const entry of entries) {
            const pageNum = Number(
              (entry.target as HTMLElement).dataset.pageNumber
            );
            if (!pageNum) continue;
            if (entry.isIntersecting) {
              next.add(pageNum);
            } else {
              next.delete(pageNum);
            }
          }
          return next;
        });
      },
      {
        root: container,
        // Extend the detection area so pages just outside the viewport get pre-rendered
        rootMargin: "200% 0px",
        threshold: 0,
      }
    );

    // Observe all page placeholder elements
    const pageEls = container.querySelectorAll("[data-page-number]");
    pageEls.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [pageCount, scale]);

  // Determine which pages should be fully rendered (visible + buffer)
  const renderedPages = new Set<number>();
  for (const p of visiblePages) {
    for (let offset = -PAGE_BUFFER; offset <= PAGE_BUFFER; offset++) {
      const page = p + offset;
      if (page >= 1 && page <= pageCount) {
        renderedPages.add(page);
      }
    }
  }

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
          const shouldRender = renderedPages.has(pageNum);

          // Stable wrapper div — always the same DOM element so
          // IntersectionObserver can track it across render/placeholder swaps.
          return (
            <div
              key={pageNum}
              data-page-number={pageNum}
              className="relative mx-auto bg-white shadow-lg"
              style={{
                width: dims.width * scale,
                height: dims.height * scale,
              }}
            >
              {shouldRender && (
                <PdfPage
                  pageNumber={pageNum}
                  scale={scale}
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
