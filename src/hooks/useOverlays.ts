import { useState, useCallback, useRef } from "react";
import type {
  Annotation,
  TextAnnotation,
  SignatureAnnotation,
  PdfMode,
} from "../types/pdf";
import {
  isTextAnnotation,
} from "../types/pdf";
import {
  saveAnnotation,
  getAnnotationsForDocument,
  deleteAnnotation as deleteAnnotationFromDb,
  deleteAnnotationsForDocument,
} from "../db/sqlite";
import { TEXT_DEFAULT_FONT_SIZE } from "../constants";

interface UseOverlaysReturn {
  annotations: Annotation[];
  mode: PdfMode;
  setMode: (mode: PdfMode) => void;
  addTextAnnotation: (pageNumber: number, x: number, y: number) => TextAnnotation;
  addSignatureAnnotation: (
    pageNumber: number,
    x: number,
    y: number,
    signatureId: number
  ) => SignatureAnnotation;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  removeAnnotation: (id: string) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  newAnnotationId: string | null;
  clearNewAnnotationId: () => void;
  loadAnnotations: (documentPath: string) => Promise<void>;
  saveAllAnnotations: (documentPath: string) => Promise<void>;
}

function generateId(): string {
  return `ann_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function useOverlays(): UseOverlaysReturn {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [mode, setMode] = useState<PdfMode>("view");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newAnnotationId, setNewAnnotationId] = useState<string | null>(null);
  const annotationsRef = useRef<Annotation[]>(annotations);
  annotationsRef.current = annotations;

  const clearNewAnnotationId = useCallback(() => {
    setNewAnnotationId(null);
  }, []);

  const loadAnnotations = useCallback(async (documentPath: string) => {
    try {
      const rows = await getAnnotationsForDocument(documentPath);
      const loaded: Annotation[] = rows.map((row) => {
        if (row.type === "text") {
          return {
            id: row.id,
            pageNumber: row.page_number,
            x: row.x,
            y: row.y,
            width: row.width,
            height: row.height,
            text: row.text_content || "",
            fontSize: row.font_size || TEXT_DEFAULT_FONT_SIZE,
            color: row.color || "#000000",
          } as TextAnnotation;
        } else {
          return {
            id: row.id,
            pageNumber: row.page_number,
            x: row.x,
            y: row.y,
            width: row.width,
            height: row.height,
            signatureId: row.signature_id!,
          } as SignatureAnnotation;
        }
      });
      setAnnotations(loaded);
    } catch (err) {
      console.error("Failed to load annotations:", err);
    }
  }, []);

  const addTextAnnotation = useCallback(
    (pageNumber: number, x: number, y: number): TextAnnotation => {
      const annotation: TextAnnotation = {
        id: generateId(),
        pageNumber,
        x,
        y,
        width: 200,
        height: 30,
        text: "",
        fontSize: TEXT_DEFAULT_FONT_SIZE,
        color: "#000000",
      };
      setAnnotations((prev) => [...prev, annotation]);
      setSelectedId(annotation.id);
      setNewAnnotationId(annotation.id);
      return annotation;
    },
    []
  );

  const addSignatureAnnotation = useCallback(
    (
      pageNumber: number,
      x: number,
      y: number,
      signatureId: number
    ): SignatureAnnotation => {
      const annotation: SignatureAnnotation = {
        id: generateId(),
        pageNumber,
        x,
        y,
        width: 200,
        height: 60,
        signatureId,
      };
      setAnnotations((prev) => [...prev, annotation]);
      setSelectedId(annotation.id);
      setNewAnnotationId(annotation.id);
      return annotation;
    },
    []
  );

  const updateAnnotation = useCallback(
    (id: string, updates: Partial<Annotation>) => {
      setAnnotations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
      );
    },
    []
  );

  const removeAnnotation = useCallback(async (id: string) => {
    try {
      await deleteAnnotationFromDb(id);
    } catch {
      // May not exist in DB yet if not saved
    }
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
  }, []);

  const saveAllAnnotations = useCallback(
    async (documentPath: string) => {
      // Read from ref to always get the latest annotations,
      // avoiding stale closure when this callback is captured elsewhere.
      const current = annotationsRef.current;
      try {
        // Delete existing annotations for this document, then re-insert all
        await deleteAnnotationsForDocument(documentPath);

        for (const ann of current) {
          if (isTextAnnotation(ann)) {
            const textAnn = ann as TextAnnotation;
            await saveAnnotation({
              id: textAnn.id,
              documentPath,
              pageNumber: textAnn.pageNumber,
              type: "text",
              x: textAnn.x,
              y: textAnn.y,
              width: textAnn.width,
              height: textAnn.height,
              textContent: textAnn.text,
              fontSize: textAnn.fontSize,
              color: textAnn.color,
            });
          } else {
            const sigAnn = ann as SignatureAnnotation;
            await saveAnnotation({
              id: sigAnn.id,
              documentPath,
              pageNumber: sigAnn.pageNumber,
              type: "signature",
              x: sigAnn.x,
              y: sigAnn.y,
              width: sigAnn.width,
              height: sigAnn.height,
              signatureId: sigAnn.signatureId,
            });
          }
        }
      } catch (err) {
        console.error("Failed to save annotations:", err);
      }
    },
    []
  );

  return {
    annotations,
    mode,
    setMode,
    addTextAnnotation,
    addSignatureAnnotation,
    updateAnnotation,
    removeAnnotation,
    selectedId,
    setSelectedId,
    newAnnotationId,
    clearNewAnnotationId,
    loadAnnotations,
    saveAllAnnotations,
  };
}
