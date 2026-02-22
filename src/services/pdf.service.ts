import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { Annotation, TextAnnotation, SignatureAnnotation } from "../types/pdf";
import { isTextAnnotation } from "../types/pdf";
import type { Signature } from "../types/signature";
import { SIGNATURE_DEFAULT_FONT_SIZE } from "../constants";

/**
 * Map hex color string to pdf-lib rgb color.
 */
function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return rgb(r, g, b);
}

/**
 * Font file paths keyed by font family name.
 * These resolve to files in public/fonts/ (served at /fonts/ by Vite/Tauri).
 */
const FONT_FILE_MAP: Record<string, string> = {
  "Dancing Script": "/fonts/DancingScript-Regular.ttf",
  "Great Vibes": "/fonts/GreatVibes-Regular.ttf",
  Sacramento: "/fonts/Sacramento-Regular.ttf",
};

/**
 * Fetch a font file as bytes for embedding in pdf-lib.
 */
async function fetchFontBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch font: ${url} (${response.status})`);
  }
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * Flatten all annotations (text + signature) into the PDF bytes,
 * producing a new PDF with embedded text.
 *
 * Coordinate system: annotations store x,y as CSS-pixel offsets from the
 * top-left of the rendered page at scale=1. PDF pages have origin at
 * bottom-left, so we flip the y-axis.
 */
export async function flattenPdf(
  pdfBytes: Uint8Array,
  annotations: Annotation[],
  signatures: Signature[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);

  // Register fontkit so pdf-lib can parse and embed custom TTF fonts
  pdfDoc.registerFontkit(fontkit);

  // Pre-embed fonts we'll need
  const embeddedFonts = new Map<string, Awaited<ReturnType<typeof pdfDoc.embedFont>>>();

  // Standard font for text annotations
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  embeddedFonts.set("Helvetica", helvetica);

  // Pre-embed custom signature fonts that are actually used
  const usedFontFamilies = new Set<string>();
  for (const annotation of annotations) {
    if (!isTextAnnotation(annotation)) {
      const sigAnn = annotation as SignatureAnnotation;
      const sig = signatures.find((s) => s.id === sigAnn.signatureId);
      if (sig) usedFontFamilies.add(sig.fontFamily);
    }
  }

  for (const family of usedFontFamilies) {
    const fontPath = FONT_FILE_MAP[family];
    if (fontPath) {
      try {
        const fontBytes = await fetchFontBytes(fontPath);
        const embedded = await pdfDoc.embedFont(fontBytes);
        embeddedFonts.set(family, embedded);
      } catch (err) {
        console.warn(`Could not embed font "${family}", falling back to Helvetica:`, err);
        embeddedFonts.set(family, helvetica);
      }
    } else {
      embeddedFonts.set(family, helvetica);
    }
  }

  // Group annotations by page
  const pages = pdfDoc.getPages();

  for (const annotation of annotations) {
    const pageIndex = annotation.pageNumber - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;

    const page = pages[pageIndex];
    const { height: pageHeight } = page.getSize();

    if (isTextAnnotation(annotation)) {
      const textAnn = annotation as TextAnnotation;
      if (!textAnn.text) continue; // skip empty text annotations

      const color = hexToRgb(textAnn.color);
      const fontSize = textAnn.fontSize;

      // Flip y: annotation y is from top, PDF y is from bottom
      const pdfY = pageHeight - textAnn.y - fontSize;

      page.drawText(textAnn.text, {
        x: textAnn.x,
        y: pdfY,
        size: fontSize,
        font: helvetica,
        color,
      });
    } else {
      const sigAnn = annotation as SignatureAnnotation;
      const sig = signatures.find((s) => s.id === sigAnn.signatureId);
      if (!sig) continue;

      const font = embeddedFonts.get(sig.fontFamily) ?? helvetica;
      const color = hexToRgb(sig.color);

      // Use the same font size as the on-screen overlay for consistent rendering
      const fontSize = SIGNATURE_DEFAULT_FONT_SIZE;
      const pdfY = pageHeight - sigAnn.y - fontSize;

      page.drawText(sig.name, {
        x: sigAnn.x,
        y: pdfY,
        size: fontSize,
        font,
        color,
      });
    }
  }

  const flattenedBytes = await pdfDoc.save();
  return new Uint8Array(flattenedBytes);
}
