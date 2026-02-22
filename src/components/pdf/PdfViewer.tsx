import { useRef, useCallback } from "react";
import type { Annotation, PdfMode } from "../../types/pdf";
import type { Signature } from "../../types/signature";
import PdfPage from "./PdfPage";

interface PageDimension {
  width: number;
  height: number;
}

interface PdfViewerProps {
  pageCount: number;
  scale: number;
  mode: PdfMode;
  annotations: Annotation[];
  signatures: Signature[];
  selectedAnnotationId: string | null;
  pageDimensions: PageDimension[];
  renderPage: (pageNumber: number, canvas: HTMLCanvasElement) => void;
  onSelectAnnotation: (id: string | null) => void;
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  onDeleteAnnotation: (id: string) => void;
  onPageClick: (pageNumber: number, x: number, y: number) => void;
}

export default function PdfViewer({
  pageCount,
  scale,
  mode,
  annotations,
  signatures,
  selectedAnnotationId,
  pageDimensions,
  renderPage,
  onSelectAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onPageClick,
}: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleBackgroundClick = useCallback(() => {
    onSelectAnnotation(null);
  }, [onSelectAnnotation]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto bg-slate-100 p-6"
      onClick={handleBackgroundClick}
    >
      <div className="flex flex-col items-center gap-4">
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
              mode={mode}
              onSelectAnnotation={onSelectAnnotation}
              onUpdateAnnotation={onUpdateAnnotation}
              onDeleteAnnotation={onDeleteAnnotation}
              onPageClick={onPageClick}
            />
          );
        })}
      </div>
    </div>
  );
}
