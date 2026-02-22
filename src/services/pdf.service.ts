import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import type { PDFFont, PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { Annotation, TextAnnotation, SignatureAnnotation } from "../types/pdf";
import { isTextAnnotation } from "../types/pdf";
import type { Signature } from "../types/signature";
import { SIGNATURE_DEFAULT_FONT_SIZE } from "../constants";

/**
 * Map hex color string to pdf-lib rgb color (DeviceRGB color space).
 */
function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return rgb(r, g, b);
}

/**
 * Convert annotation coordinates from the displayed (rotated) frame to
 * the unrotated MediaBox frame for pdf-lib drawText.
 *
 * Annotation x,y are captured from pdf.js which applies page rotation,
 * so they're relative to the top-left of the *displayed* page. pdf-lib's
 * drawText operates in the unrotated MediaBox coordinate system (origin
 * at bottom-left).
 *
 * @param x - annotation x in displayed frame (top-left origin)
 * @param y - annotation y in displayed frame (top-left origin)
 * @param fontAscent - font ascent in points (baseline offset from top of text)
 * @param page - the pdf-lib page
 * @returns { pdfX, pdfY, textRotation } in MediaBox coordinates + text rotation angle
 */
function toMediaBoxCoords(
  x: number,
  y: number,
  fontAscent: number,
  page: PDFPage
): { pdfX: number; pdfY: number; textRotation: number } {
  const rotation = page.getRotation().angle;
  const { x: mbX, y: mbY, width: mbWidth, height: mbHeight } = page.getMediaBox();

  // Normalize rotation to 0, 90, 180, 270
  const rot = ((rotation % 360) + 360) % 360;

  // pdf.js renders from viewport (0,0) regardless of MediaBox origin, but
  // pdf-lib draws in raw MediaBox coordinates, so we offset by (mbX, mbY).
  switch (rot) {
    case 0: {
      // No rotation. Displayed size = mbWidth x mbHeight.
      // pdfY: flip from top-origin to bottom-origin, offset by ascent for baseline
      return {
        pdfX: mbX + x,
        pdfY: mbY + mbHeight - y - fontAscent,
        textRotation: 0,
      };
    }
    case 90: {
      // Page rotated 90deg CW for display. Displayed size = mbHeight x mbWidth.
      return {
        pdfX: mbX + y,
        pdfY: mbY + x + fontAscent,
        textRotation: 90,
      };
    }
    case 180: {
      // Page rotated 180deg. Displayed size = mbWidth x mbHeight.
      return {
        pdfX: mbX + mbWidth - x,
        pdfY: mbY + y + fontAscent,
        textRotation: 180,
      };
    }
    case 270: {
      // Page rotated 270deg CW (= 90 CCW). Displayed size = mbHeight x mbWidth.
      return {
        pdfX: mbX + mbHeight - y,
        pdfY: mbY + mbWidth - x - fontAscent,
        textRotation: 270,
      };
    }
    default: {
      // Non-standard rotation — fall back to unrotated behavior
      return {
        pdfX: mbX + x,
        pdfY: mbY + mbHeight - y - fontAscent,
        textRotation: 0,
      };
    }
  }
}

/**
 * Get the font ascent in points for a given font size.
 * The ascent is the distance from the baseline to the top of the tallest glyph.
 */
function getFontAscent(font: PDFFont, fontSize: number): number {
  // heightAtSize with descender=false returns just the ascent portion
  return font.heightAtSize(fontSize, { descender: false });
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
 * ## Output format
 * pdf-lib outputs PDF 1.7 with a proper %PDF-1.7 header, cross-reference
 * table, and trailer. Compatible with Adobe Acrobat, Edge, Chrome, Firefox,
 * and Preview (macOS).
 *
 * ## Font embedding
 * Custom TTF fonts are embedded as CIDFont Type2 (composite fonts) with
 * Identity-H encoding and a ToUnicode CMap for text selection/search.
 * Fonts are subset-embedded to reduce file size. Font descriptors include
 * FontBBox, ItalicAngle, Ascent, Descent, CapHeight, XHeight.
 * NOTE: pdf-lib hardcodes StemV=0 in font descriptors -- this is technically
 * non-ideal but accepted by all major viewers including Adobe Acrobat.
 *
 * ## Content stream behavior
 * pdf-lib appends drawing operators to the existing page content stream via
 * pushOperators(), preserving all original page content. Existing form fields
 * (AcroForm), bookmarks/outlines, internal links, embedded attachments, and
 * JavaScript actions are preserved in the document structure.
 *
 * ## Known limitations
 * - Digital signatures: pdf-lib performs a full rewrite (not incremental save),
 *   so any existing digital signatures WILL be INVALIDATED after flatten.
 * - PDF/A conformance: Modifications add DeviceRGB colors and non-PDF/A fonts,
 *   which may break strict PDF/A compliance. ICC color profiles and XMP
 *   metadata are preserved in the document structure but conformance level
 *   is not guaranteed after modification.
 * - Text overflow: drawText does not clip or wrap -- long text that exceeds
 *   the annotation width will extend beyond the visible overlay boundary.
 *
 * ## Coordinate system
 * Annotations store x,y as point offsets from the top-left of the rendered
 * page at pdf.js scale=1 (which accounts for page rotation). pdf-lib operates
 * in the unrotated MediaBox coordinate system with origin at bottom-left, so
 * we convert through toMediaBoxCoords() which handles:
 *   - Y-axis flip (top-origin to bottom-origin)
 *   - Font ascent offset for accurate baseline placement
 *   - Page rotation (0/90/180/270 degrees)
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
        // Subset embed: only glyphs actually used are included,
        // reducing file size for large TTF fonts.
        const embedded = await pdfDoc.embedFont(fontBytes, { subset: true });
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

    if (isTextAnnotation(annotation)) {
      const textAnn = annotation as TextAnnotation;
      if (!textAnn.text) continue; // skip empty text annotations

      const color = hexToRgb(textAnn.color);
      const fontSize = textAnn.fontSize;
      const fontAscent = getFontAscent(helvetica, fontSize);

      // Convert from displayed (rotated, top-left origin) to MediaBox (bottom-left origin)
      const { pdfX, pdfY, textRotation } = toMediaBoxCoords(
        textAnn.x,
        textAnn.y,
        fontAscent,
        page
      );

      page.drawText(textAnn.text, {
        x: pdfX,
        y: pdfY,
        size: fontSize,
        font: helvetica,
        color,
        rotate: textRotation !== 0 ? degrees(textRotation) : undefined,
      });
    } else {
      const sigAnn = annotation as SignatureAnnotation;
      const sig = signatures.find((s) => s.id === sigAnn.signatureId);
      if (!sig) continue;

      const font = embeddedFonts.get(sig.fontFamily) ?? helvetica;
      const color = hexToRgb(sig.color);

      // Use the same font size as the on-screen overlay for consistent rendering
      const fontSize = SIGNATURE_DEFAULT_FONT_SIZE;
      const fontAscent = getFontAscent(font, fontSize);

      // Convert from displayed (rotated, top-left origin) to MediaBox (bottom-left origin)
      const { pdfX, pdfY, textRotation } = toMediaBoxCoords(
        sigAnn.x,
        sigAnn.y,
        fontAscent,
        page
      );

      page.drawText(sig.name, {
        x: pdfX,
        y: pdfY,
        size: fontSize,
        font,
        color,
        rotate: textRotation !== 0 ? degrees(textRotation) : undefined,
      });
    }
  }

  const flattenedBytes = await pdfDoc.save();
  return new Uint8Array(flattenedBytes);
}
