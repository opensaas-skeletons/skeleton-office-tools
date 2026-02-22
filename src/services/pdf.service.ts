import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { Annotation, TextAnnotation, SignatureAnnotation } from "../types/pdf";
import { isTextAnnotation } from "../types/pdf";
import type { Signature } from "../types/signature";

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
 * Map signature font families to pdf-lib standard fonts.
 * Custom font embedding can be added later by loading TTF/OTF bytes
 * and calling pdfDoc.embedFont(fontBytes).
 */
function mapFontToStandard(fontFamily: string): typeof StandardFonts[keyof typeof StandardFonts] {
  switch (fontFamily) {
    case "Dancing Script":
      return StandardFonts.Courier;
    case "Great Vibes":
      return StandardFonts.TimesRomanItalic;
    case "Sacramento":
      return StandardFonts.HelveticaOblique;
    default:
      return StandardFonts.Helvetica;
  }
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

  // Pre-embed fonts we'll need
  const embeddedFonts = new Map<string, Awaited<ReturnType<typeof pdfDoc.embedFont>>>();

  // Standard font for text annotations
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  embeddedFonts.set("Helvetica", helvetica);

  // Group annotations by page
  const pages = pdfDoc.getPages();

  for (const annotation of annotations) {
    const pageIndex = annotation.pageNumber - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;

    const page = pages[pageIndex];
    const { height: pageHeight } = page.getSize();

    if (isTextAnnotation(annotation)) {
      const textAnn = annotation as TextAnnotation;
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

      const standardFontKey = mapFontToStandard(sig.fontFamily);

      // Cache embedded fonts
      if (!embeddedFonts.has(standardFontKey)) {
        const embedded = await pdfDoc.embedFont(standardFontKey);
        embeddedFonts.set(standardFontKey, embedded);
      }
      const font = embeddedFonts.get(standardFontKey)!;
      const color = hexToRgb(sig.color);

      // Size the signature to fit the annotation box
      const fontSize = sigAnn.height * 0.7;
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
