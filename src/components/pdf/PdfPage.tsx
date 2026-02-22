import { useRef, useEffect, useCallback } from "react";
import type { Annotation, TextAnnotation, SignatureAnnotation, PdfMode } from "../../types/pdf";
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
  mode: PdfMode;
  onSelectAnnotation: (id: string | null) => void;
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  onDeleteAnnotation: (id: string) => void;
  onPageClick: (pageNumber: number, x: number, y: number) => void;
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
  mode,
  onSelectAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onPageClick,
}: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
            return (
              <TextOverlay
                key={annotation.id}
                annotation={annotation}
                selected={selectedAnnotationId === annotation.id}
                onSelect={onSelectAnnotation}
                onUpdate={onUpdateAnnotation as (id: string, updates: Partial<TextAnnotation>) => void}
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
