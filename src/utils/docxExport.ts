import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  ExternalHyperlink,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  PageBreak,
  LevelFormat,
  UnderlineType,
  type ParagraphChild,
} from "docx";

type DocxBlockElement = Paragraph | Table;

// Numbering reference IDs
const BULLET_REF = "bullet-list";
const ORDERED_REF = "ordered-list";

/**
 * Convert editor HTML to .docx bytes.
 */
export async function htmlToDocx(html: string): Promise<Uint8Array> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const children = parseBlockNodes(doc.body.childNodes);

  const docxDoc = new Document({
    numbering: {
      config: [
        {
          reference: BULLET_REF,
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "\u2022",
              alignment: AlignmentType.LEFT,
            },
          ],
        },
        {
          reference: ORDERED_REF,
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
            },
          ],
        },
      ],
    },
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(docxDoc);
  return new Uint8Array(await blob.arrayBuffer());
}

/** Parse a NodeList of block-level nodes into docx elements. */
function parseBlockNodes(nodes: NodeListOf<ChildNode> | ChildNode[]): DocxBlockElement[] {
  const result: DocxBlockElement[] = [];
  for (const node of Array.from(nodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        result.push(new Paragraph({ children: [new TextRun(text)] }));
      }
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (isHeading(tag)) {
      result.push(createHeadingParagraph(el, tag));
    } else if (tag === "p") {
      result.push(createParagraph(el));
    } else if (tag === "ul" || tag === "ol") {
      result.push(...createListItems(el, tag === "ol"));
    } else if (tag === "table") {
      result.push(createTable(el));
    } else if (tag === "blockquote") {
      result.push(...createBlockquote(el));
    } else if (tag === "hr") {
      result.push(new Paragraph({ children: [new PageBreak()] }));
    } else if (tag === "div" || tag === "section" || tag === "article" || tag === "main") {
      result.push(...parseBlockNodes(el.childNodes));
    } else if (tag === "pre") {
      result.push(createParagraph(el));
    } else if (tag === "img") {
      const imgRun = createImageRun(el);
      if (imgRun) {
        result.push(new Paragraph({ children: [imgRun] }));
      }
    } else {
      // Fallback: treat as paragraph
      result.push(createParagraph(el));
    }
  }
  return result;
}

function isHeading(tag: string): boolean {
  return /^h[1-6]$/.test(tag);
}

function getHeadingLevel(tag: string): (typeof HeadingLevel)[keyof typeof HeadingLevel] {
  const map: Record<string, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
    h1: HeadingLevel.HEADING_1,
    h2: HeadingLevel.HEADING_2,
    h3: HeadingLevel.HEADING_3,
    h4: HeadingLevel.HEADING_4,
    h5: HeadingLevel.HEADING_5,
    h6: HeadingLevel.HEADING_6,
  };
  return map[tag] ?? HeadingLevel.HEADING_1;
}

function getAlignment(el: HTMLElement): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined {
  const align = el.style.textAlign || el.getAttribute("align");
  if (!align) return undefined;
  const map: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
    left: AlignmentType.LEFT,
    center: AlignmentType.CENTER,
    right: AlignmentType.RIGHT,
    justify: AlignmentType.JUSTIFIED,
  };
  return map[align.toLowerCase()];
}

function createHeadingParagraph(el: HTMLElement, tag: string): Paragraph {
  return new Paragraph({
    heading: getHeadingLevel(tag),
    alignment: getAlignment(el),
    children: parseInlineNodes(el.childNodes),
  });
}

function createParagraph(el: HTMLElement): Paragraph {
  return new Paragraph({
    alignment: getAlignment(el),
    children: parseInlineNodes(el.childNodes),
  });
}

/** Parse inline content, returning an array of paragraph children. */
function parseInlineNodes(
  nodes: NodeListOf<ChildNode> | ChildNode[],
  inheritedStyle?: InlineStyle
): ParagraphChild[] {
  const result: ParagraphChild[] = [];
  for (const node of Array.from(nodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      if (text.length === 0) continue;
      result.push(createTextRun(text, inheritedStyle));
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === "br") {
      result.push(new TextRun({ text: "", break: 1 }));
      continue;
    }

    if (tag === "img") {
      const imgRun = createImageRun(el);
      if (imgRun) result.push(imgRun);
      continue;
    }

    if (tag === "a") {
      const href = el.getAttribute("href") ?? "";
      const linkChildren = parseInlineNodes(el.childNodes, inheritedStyle);
      // ExternalHyperlink children must be ParagraphChild (TextRun etc.)
      result.push(
        new ExternalHyperlink({
          link: href,
          children: linkChildren as ConstructorParameters<typeof ExternalHyperlink>[0]["children"],
        })
      );
      continue;
    }

    // Inline formatting elements
    const style = mergeInlineStyle(inheritedStyle, el, tag);
    result.push(...parseInlineNodes(el.childNodes, style));
  }
  return result;
}

interface InlineStyle {
  bold?: boolean;
  italics?: boolean;
  underline?: boolean;
  strike?: boolean;
  subScript?: boolean;
  superScript?: boolean;
  font?: string;
  size?: number; // half-points
  color?: string;
}

function mergeInlineStyle(
  parent: InlineStyle | undefined,
  el: HTMLElement,
  tag: string
): InlineStyle {
  const style: InlineStyle = { ...parent };

  // Tag-based formatting
  if (tag === "strong" || tag === "b") style.bold = true;
  if (tag === "em" || tag === "i") style.italics = true;
  if (tag === "u") style.underline = true;
  if (tag === "s" || tag === "del" || tag === "strike") style.strike = true;
  if (tag === "sub") style.subScript = true;
  if (tag === "sup") style.superScript = true;
  if (tag === "code" || tag === "pre") style.font = style.font ?? "Courier New";

  // Inline style overrides
  const cssFont = el.style.fontFamily;
  if (cssFont) {
    style.font = cssFont.replace(/['"]/g, "").split(",")[0].trim();
  }

  const cssFontSize = el.style.fontSize;
  if (cssFontSize) {
    const pts = parseFontSizeToPt(cssFontSize);
    if (pts) style.size = pts * 2; // docx uses half-points
  }

  const cssColor = el.style.color;
  if (cssColor) {
    const hex = colorToHex(cssColor);
    if (hex) style.color = hex;
  }

  return style;
}

function createTextRun(text: string, style?: InlineStyle): TextRun {
  if (!style) return new TextRun(text);

  return new TextRun({
    text,
    bold: style.bold,
    italics: style.italics,
    underline: style.underline ? { type: UnderlineType.SINGLE } : undefined,
    strike: style.strike,
    subScript: style.subScript,
    superScript: style.superScript,
    font: style.font,
    size: style.size,
    color: style.color,
  });
}

/** Parse list items from <ul> or <ol> into paragraphs with numbering. */
function createListItems(listEl: HTMLElement, ordered: boolean): Paragraph[] {
  const items: Paragraph[] = [];
  for (const child of Array.from(listEl.children)) {
    if (child.tagName.toLowerCase() === "li") {
      const inlineChildren = parseInlineNodes(child.childNodes);
      items.push(
        new Paragraph({
          children: inlineChildren,
          numbering: {
            reference: ordered ? ORDERED_REF : BULLET_REF,
            level: 0,
          },
        })
      );

      // Handle nested lists inside <li>
      for (const nested of Array.from(child.children)) {
        const nestedTag = nested.tagName.toLowerCase();
        if (nestedTag === "ul" || nestedTag === "ol") {
          items.push(...createListItems(nested as HTMLElement, nestedTag === "ol"));
        }
      }
    }
  }
  return items;
}

/** Convert an HTML <table> to a docx Table. */
function createTable(tableEl: HTMLElement): Table {
  const rows: TableRow[] = [];

  // Gather rows from <thead>, <tbody>, <tfoot>, or direct <tr> children
  const trElements = tableEl.querySelectorAll("tr");
  for (const tr of Array.from(trElements)) {
    const cells: TableCell[] = [];
    for (const td of Array.from(tr.children)) {
      const tag = td.tagName.toLowerCase();
      if (tag === "td" || tag === "th") {
        const cellChildren = parseBlockNodes(td.childNodes);
        cells.push(
          new TableCell({
            children: cellChildren.length > 0 ? cellChildren : [new Paragraph("")],
          })
        );
      }
    }
    if (cells.length > 0) {
      rows.push(new TableRow({ children: cells }));
    }
  }

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

/** Convert a <blockquote> to indented paragraphs. */
function createBlockquote(el: HTMLElement): DocxBlockElement[] {
  const blockChildren = parseBlockNodes(el.childNodes);
  // If no block-level children were found, wrap the inline content
  if (blockChildren.length === 0) {
    return [
      new Paragraph({
        indent: { left: 720 },
        children: parseInlineNodes(el.childNodes),
      }),
    ];
  }
  // Apply indentation to paragraphs; pass through tables as-is
  return blockChildren.map((child) => {
    if (child instanceof Paragraph) {
      return new Paragraph({
        indent: { left: 720 }, // 0.5 inch in twips
        children: parseInlineNodes(el.childNodes),
      });
    }
    return child;
  });
}

/** Create an ImageRun from an <img> element with a base64 data URI. */
function createImageRun(el: HTMLElement): ImageRun | null {
  const src = el.getAttribute("src");
  if (!src || !src.startsWith("data:")) return null;

  const match = src.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) return null;

  const mimeType = match[1];
  const base64Data = match[2];

  const binaryStr = atob(base64Data);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  // Determine image type
  const typeMap: Record<string, "jpg" | "png" | "gif" | "bmp"> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/bmp": "bmp",
  };
  const imgType = typeMap[mimeType] ?? "png";

  // Try to get dimensions from attributes, default to reasonable size
  const width = parseInt(el.getAttribute("width") ?? "300", 10);
  const height = parseInt(el.getAttribute("height") ?? "200", 10);

  return new ImageRun({
    type: imgType,
    data: bytes,
    transformation: { width, height },
  });
}

// ---- Utility helpers ----

/** Parse a CSS font-size value to points. */
function parseFontSizeToPt(value: string): number | null {
  const pxMatch = value.match(/^([\d.]+)px$/);
  if (pxMatch) return Math.round(parseFloat(pxMatch[1]) * 0.75);

  const ptMatch = value.match(/^([\d.]+)pt$/);
  if (ptMatch) return Math.round(parseFloat(ptMatch[1]));

  const remMatch = value.match(/^([\d.]+)rem$/);
  if (remMatch) return Math.round(parseFloat(remMatch[1]) * 12);

  const emMatch = value.match(/^([\d.]+)em$/);
  if (emMatch) return Math.round(parseFloat(emMatch[1]) * 12);

  return null;
}

/** Convert a CSS color value to a 6-digit hex string (without #). */
function colorToHex(color: string): string | null {
  // Already hex
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      return hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    return hex.slice(0, 6);
  }

  // rgb(r, g, b) or rgba(r, g, b, a)
  const rgbMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    return (
      r.toString(16).padStart(2, "0") +
      g.toString(16).padStart(2, "0") +
      b.toString(16).padStart(2, "0")
    );
  }

  return null;
}
