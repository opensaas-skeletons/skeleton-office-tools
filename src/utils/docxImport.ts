import mammoth from "mammoth";

/**
 * Convert .docx file bytes to HTML suitable for the TipTap editor.
 */
export async function docxToHtml(bytes: Uint8Array): Promise<string> {
  const result = await mammoth.convertToHtml(
    { arrayBuffer: bytes.buffer as ArrayBuffer },
    {
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Heading 4'] => h4:fresh",
        "p[style-name='Heading 5'] => h5:fresh",
        "p[style-name='Heading 6'] => h6:fresh",
      ],
      convertImage: mammoth.images.imgElement(async (image) => {
        const base64 = await image.read("base64");
        return { src: `data:${image.contentType};base64,${base64}` };
      }),
    }
  );

  if (result.messages.length > 0) {
    console.warn(
      "[docxImport] mammoth warnings:",
      result.messages.map((m) => m.message)
    );
  }

  return result.value;
}
