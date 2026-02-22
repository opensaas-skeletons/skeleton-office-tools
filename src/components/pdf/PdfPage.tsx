import { useRef, useEffect, useCallback } from "react";
import type { Annotation, SignatureAnnotation, PdfMode } from "../../types/pdf";
import { isTextAnnotation, isSignatureAnnotation } from "../../types/pdf";
import type { Signature } from "../../types/signature";
import TextOverlay from "./TextOverlay";
import SignatureOverlay from "./SignatureOverlay";

interface PdfPageProps {
  pageNumber: number;
  scale: number;
  width: number;
  height: number;
  renderPage: (pageNumber: number, canvas: HTMLCanvasElement) => void;
  annotations: Annotation[];
  signatures: Signature[];
  selectedAnnotationId: string | null;
  newAnnotationId: string | null;
  mode: PdfMode;
  onSelectAnnotation: (id: string | null) => void;
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  onDeleteAnnotation: (id: string) => void;
  onPageClick: (pageNumber: number, x: number, y: number) => void;
  onNewAnnotationHandled: () => void;
}

export default function PdfPage({
  pageNumber,
  scale,
  width,
  height,
  renderPage,
  annotations,
  signatures,
  selectedAnnotationId,
  newAnnotationId,
  mode,
  onSelectAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onPageClick,
  onNewAnnotationHandled,
}: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      renderPage(pageNumber, canvasRef.current);
    }
  }, [pageNumber, renderPage]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Only trigger if clicking the overlay layer itself, not an annotation
      if (e.target === e.currentTarget && mode !== "view") {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / scale;
        const y = (e.clientY - rect.top) / scale;
        onPageClick(pageNumber, x, y);
      } else if (e.target === e.currentTarget) {
        onSelectAnnotation(null);
      }
    },
    [mode, pageNumber, scale, onPageClick, onSelectAnnotation]
  );

  const pageAnnotations = annotations.filter((a) => a.pageNumber === pageNumber);

  return (
    <div
      ref={containerRef}
      data-page-number={pageNumber}
      className="relative mx-auto shadow-lg bg-white"
      style={{
        width: width * scale,
        height: height * scale,
      }}
    >
      {/* PDF Canvas */}
      <canvas
        ref={canvasRef}
        className="pdf-canvas block"
        style={{
          width: width * scale,
          height: height * scale,
        }}
      />

      {/* Annotation overlay layer */}
      <div
        className="absolute inset-0"
        style={{ pointerEvents: mode === "view" ? "none" : "auto" }}
        onClick={handleClick}
      >
        {pageAnnotations.map((annotation) => {
          if (isTextAnnotation(annotation)) {
            const isNew = newAnnotationId === annotation.id;
            return (
              <TextOverlay
                key={annotation.id}
                annotation={annotation}
                selected={selectedAnnotationId === annotation.id}
                isNew={isNew}
                onSelect={(id) => {
                  if (isNew) onNewAnnotationHandled();
                  onSelectAnnotation(id);
                }}
                onUpdate={(id, updates) => {
                  if (isNew) onNewAnnotationHandled();
                  onUpdateAnnotation(id, updates);
                }}
                onDelete={onDeleteAnnotation}
                scale={scale}
              />
            );
          }
          if (isSignatureAnnotation(annotation)) {
            const sig = signatures.find((s) => s.id === annotation.signatureId);
            return (
              <SignatureOverlay
                key={annotation.id}
                annotation={annotation}
                signature={sig}
                selected={selectedAnnotationId === annotation.id}
                onSelect={onSelectAnnotation}
                onUpdate={onUpdateAnnotation as (id: string, updates: Partial<SignatureAnnotation>) => void}
                onDelete={onDeleteAnnotation}
                scale={scale}
              />
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}
