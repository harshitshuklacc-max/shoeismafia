import type { LabelSize } from "@/types";

/** TVS LP 46 DLite Plus — 203 DPI (8 dots/mm) */
export const TVS_DPI = 8;

export interface LabelDimensions {
  widthMm: number;
  heightMm: number;
  widthDots: number;
  heightDots: number;
}

export interface LabelLayoutSlots {
  logoY: number | null;
  nameY: number;
  metaY: number | null;
  barcodeY: number;
  barcodeHeight: number;
  bcnY: number;
  priceY: number;
  marginX: number;
}

export function labelDimensions(size: LabelSize): LabelDimensions {
  const widthMm = size === "100x50" ? 100 : 50;
  const heightMm = size === "100x50" ? 50 : 25;
  return {
    widthMm,
    heightMm,
    widthDots: widthMm * TVS_DPI,
    heightDots: heightMm * TVS_DPI,
  };
}

export function getLabelLayout(
  size: LabelSize,
  options: { showLogo: boolean; hasMeta: boolean }
): LabelLayoutSlots {
  const { heightDots } = labelDimensions(size);
  const marginX = 10;

  if (size === "100x50") {
    let y = 10;
    const logoY = options.showLogo ? y : null;
    if (options.showLogo) y += 26;
    const nameY = y;
    y += 22;
    const metaY = options.hasMeta ? y : null;
    if (options.hasMeta) y += 18;
    const barcodeY = y;
    const barcodeHeight = 72;
    const bcnY = barcodeY + barcodeHeight + 6;
    const priceY = heightDots - 22;
    return { logoY, nameY, metaY, barcodeY, barcodeHeight, bcnY, priceY, marginX };
  }

  // 50 × 25 mm — compact layout for TVS thermal
  let y = 6;
  const logoY = options.showLogo ? y : null;
  if (options.showLogo) y += 18;
  const nameY = y;
  y += 16;
  const metaY = options.hasMeta ? y : null;
  if (options.hasMeta) y += 14;
  const barcodeY = y;
  const barcodeHeight = 36;
  const bcnY = barcodeY + barcodeHeight + 2;
  const priceY = heightDots - 16;

  return { logoY, nameY, metaY, barcodeY, barcodeHeight, bcnY, priceY, marginX };
}

/** CSS grid row heights (mm) matching TSPL layout */
export function htmlLabelGrid(size: LabelSize, showLogo: boolean, hasMeta: boolean): string {
  if (size === "100x50") {
    const rows = [
      showLogo ? "3.2mm" : "0",
      "3.8mm",
      hasMeta ? "3mm" : "0",
      "1fr",
      "2.8mm",
      "3.2mm",
    ].filter((r) => r !== "0");
    return rows.join(" ");
  }

  const rows = [
    showLogo ? "2.4mm" : "0",
    "2.8mm",
    hasMeta ? "2.4mm" : "0",
    "1fr",
    "2.2mm",
    "2.6mm",
  ].filter((r) => r !== "0");
  return rows.join(" ");
}
