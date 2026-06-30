import type { BarcodeSymbology, LabelProductData, LabelSize } from "@/types";
import { getLabelLayout, labelDimensions } from "@/lib/label-layout";

export const BATCH_PRINT_PRESETS = [1, 5, 10, 50] as const;

export const TVS_PRINTER_PATTERNS = [
  /tvs/i,
  /lp\s*46/i,
  /dlite/i,
  /tsc/i,
  /barcode/i,
  /label/i,
];

export interface TsplLabelOptions {
  labelSize: LabelSize;
  barcodeType: BarcodeSymbology;
  showLogo: boolean;
  showMrp: boolean;
  copies: number;
}

function escapeTsplText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').trim();
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function formatMoney(amount: number): string {
  return `Rs.${Math.round(amount)}`;
}

function tsplSymbology(type: BarcodeSymbology): string {
  switch (type) {
    case "EAN13":
      return "EAN13";
    case "EAN8":
      return "EAN8";
    case "UPCA":
      return "UPCA";
    case "39":
      return "39";
    case "128":
    default:
      return "128";
  }
}

function isNumericBarcode(code: string): boolean {
  return /^\d+$/.test(code);
}

function buildQrSection(
  data: LabelProductData,
  opts: TsplLabelOptions,
  layout: ReturnType<typeof getLabelLayout>
): string[] {
  const qrSize = opts.labelSize === "100x50" ? 4 : 3;
  const qrY = layout.barcodeY;
  const qrX = opts.labelSize === "100x50" ? 420 : 180;
  return [
    `QRCODE ${qrX},${qrY},M,${qrSize},A,0,"${escapeTsplText(data.barcode)}"`,
    `TEXT ${layout.marginX},${layout.bcnY},"1",0,1,1,"${escapeTsplText(data.barcode)}"`,
  ];
}

function buildBarcodeSection(
  data: LabelProductData,
  opts: TsplLabelOptions,
  layout: ReturnType<typeof getLabelLayout>
): string[] {
  const code = data.barcode.replace(/\s/g, "");
  const sym = tsplSymbology(opts.barcodeType);

  if (opts.barcodeType === "QRCODE") {
    return buildQrSection(data, opts, layout);
  }

  if (opts.barcodeType === "EAN13" && code.length !== 12 && code.length !== 13) {
    return [`TEXT ${layout.marginX},${layout.barcodeY},"1",0,1,1,"Invalid EAN-13: ${escapeTsplText(code)}"`];
  }

  const narrow = opts.labelSize === "100x50" ? 2 : 2;
  const wide = opts.labelSize === "100x50" ? 4 : 3;

  return [
    `BARCODE ${layout.marginX},${layout.barcodeY},"${sym}",${layout.barcodeHeight},1,0,${narrow},${wide},"${escapeTsplText(code)}"`,
    `TEXT ${layout.marginX},${layout.bcnY},"1",0,1,1,"BCN: ${escapeTsplText(code)}"`,
  ];
}

export function buildTsplLabel(data: LabelProductData, opts: TsplLabelOptions): string {
  const { widthMm, heightMm } = labelDimensions(opts.labelSize);

  const meta: string[] = [];
  if (data.sku) meta.push(`SKU:${truncate(data.sku, 14)}`);
  if (data.size) meta.push(`Sz:${truncate(data.size, 8)}`);
  if (data.color) meta.push(`Col:${truncate(data.color, 10)}`);
  const hasMeta = meta.length > 0;

  const layout = getLabelLayout(opts.labelSize, {
    showLogo: opts.showLogo,
    hasMeta,
  });

  const nameMax = opts.labelSize === "100x50" ? 42 : 22;
  const logoFont = opts.labelSize === "100x50" ? "3" : "2";
  const nameFont = opts.labelSize === "100x50" ? "3" : "2";
  const metaFont = "1";
  const priceFont = opts.labelSize === "100x50" ? "3" : "2";

  const lines: string[] = [
    `SIZE ${widthMm} mm,${heightMm} mm`,
    "GAP 2 mm,0 mm",
    "DIRECTION 1",
    "REFERENCE 0,0",
    "OFFSET 0 mm",
    "SET TEAR ON",
    "CLS",
  ];

  if (opts.showLogo && layout.logoY !== null) {
    lines.push(`TEXT ${layout.marginX},${layout.logoY},"${logoFont}",0,1,1,"SHOE MAFIA"`);
  }

  lines.push(
    `TEXT ${layout.marginX},${layout.nameY},"${nameFont}",0,1,1,"${escapeTsplText(truncate(data.name, nameMax))}"`
  );

  if (hasMeta && layout.metaY !== null) {
    lines.push(`TEXT ${layout.marginX},${layout.metaY},"${metaFont}",0,1,1,"${escapeTsplText(meta.join("  "))}"`);
  }

  lines.push(...buildBarcodeSection(data, opts, layout));

  const priceLine =
    opts.showMrp && data.mrp && data.mrp > data.sellingPrice
      ? `${formatMoney(data.sellingPrice)}  MRP:${formatMoney(data.mrp)}`
      : formatMoney(data.sellingPrice);
  lines.push(`TEXT ${layout.marginX},${layout.priceY},"${priceFont}",0,1,1,"${escapeTsplText(priceLine)}"`);

  lines.push(`PRINT ${Math.max(1, opts.copies)}`);
  return lines.join("\r\n");
}

export function buildTsplBatch(
  items: LabelProductData[],
  opts: TsplLabelOptions
): string {
  return items.map((item) => buildTsplLabel(item, opts)).join("\r\n");
}

export function validateBarcodeForSymbology(
  barcode: string,
  type: BarcodeSymbology
): string | null {
  const code = barcode.replace(/\s/g, "");
  if (!code) return "Barcode is required";

  switch (type) {
    case "EAN13":
      if (!/^\d{12,13}$/.test(code)) return "EAN-13 needs 12 or 13 digits";
      break;
    case "EAN8":
      if (!/^\d{7,8}$/.test(code)) return "EAN-8 needs 7 or 8 digits";
      break;
    case "UPCA":
      if (!/^\d{11,12}$/.test(code)) return "UPC-A needs 11 or 12 digits";
      break;
    case "39":
      if (!/^[0-9A-Z\-. $/+%]+$/.test(code)) return "Code 39 allows A-Z, 0-9 and - . $ / + %";
      break;
    case "128":
      if (!isNumericBarcode(code) && code.length > 80) return "Code 128 value too long";
      break;
    default:
      break;
  }
  return null;
}
