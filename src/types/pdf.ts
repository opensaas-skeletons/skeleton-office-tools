export interface PdfState {
  fileBytes: Uint8Array | null;
  filePath: string | null;
  fileName: string | null;
  pageCount: number;
  currentPage: number;
  scale: number;
}

export interface TextAnnotation {
  id: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  color: string;
}

export interface SignatureAnnotation {
  id: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  signatureId: number;
}

export type Annotation = TextAnnotation | SignatureAnnotation;

export function isTextAnnotation(a: Annotation): a is TextAnnotation {
  return "text" in a;
}

export function isSignatureAnnotation(a: Annotation): a is SignatureAnnotation {
  return "signatureId" in a;
}

export type PdfMode = "view" | "text" | "sign";
