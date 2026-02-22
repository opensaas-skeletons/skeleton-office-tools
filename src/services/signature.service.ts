import { SIGNATURE_DEFAULT_FONT_SIZE } from "../constants";

/**
 * Render signature text onto an existing canvas element.
 */
export function renderSignatureToCanvas(
  name: string,
  fontFamily: string,
  color: string,
  canvas: HTMLCanvasElement
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const fontSize = SIGNATURE_DEFAULT_FONT_SIZE;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `${fontSize}px "${fontFamily}", cursive`;
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(name, 10, canvas.height / 2);
}

/**
 * Generate a data URL (PNG) of the rendered signature text.
 */
export function getSignatureDataUrl(
  name: string,
  fontFamily: string,
  color: string,
  width: number,
  height: number
): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  // Use higher DPI for crisp rendering
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.scale(dpr, dpr);

  const fontSize = SIGNATURE_DEFAULT_FONT_SIZE;
  ctx.font = `${fontSize}px "${fontFamily}", cursive`;
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(name, 10, height / 2);

  return canvas.toDataURL("image/png");
}
