import { Document, Packer, Paragraph } from "docx";

export async function createBlankWordDocument(): Promise<Uint8Array> {
  const doc = new Document({
    sections: [{ children: [new Paragraph("")] }],
  });
  const blob = await Packer.toBlob(doc);
  const buffer = await blob.arrayBuffer();
  return new Uint8Array(buffer);
}
