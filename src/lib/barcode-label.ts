import JsBarcode from "jsbarcode";
import { parseSizeColorFromName } from "@/lib/label-data";
import { labelDimensions } from "@/lib/label-layout";
import { STORE_NAME } from "@/lib/store-info";
import type { LabelSize } from "@/types";

const BARCODE_OPTIONS = {
  format: "CODE128" as const,
  width: 1.8,
  height: 40,
  displayValue: false,
  margin: 0,
  background: "#ffffff",
};

export interface BarcodeLabelPrintItem {
  name: string;
  barcode: string;
  sku?: string;
  size?: string;
  color?: string;
  sellingPrice?: number;
  mrp?: number;
}

export interface BarcodeLabelPrintOptions {
  labelSize?: LabelSize;
  showLogo?: boolean;
  showMrp?: boolean;
}

export function renderBarcodeToCanvas(code: string, canvas: HTMLCanvasElement) {
  JsBarcode(canvas, code, BARCODE_OPTIONS);
}

function barcodeDataUrl(code: string, labelSize: LabelSize): string {
  const canvas = document.createElement("canvas");
  const height = labelSize === "100x50" ? 72 : 36;
  const width = labelSize === "100x50" ? 2.2 : 1.6;
  JsBarcode(canvas, code, { ...BARCODE_OPTIONS, height, width });
  return canvas.toDataURL("image/png");
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function formatMoney(amount: number): string {
  return `Rs.${Math.round(amount)}`;
}

function buildLabelHtml(
  items: BarcodeLabelPrintItem[],
  options: BarcodeLabelPrintOptions
): string {
  const labelSize = options.labelSize ?? "50x25";
  const showLogo = options.showLogo ?? true;
  const showMrp = options.showMrp ?? true;
  const { widthMm, heightMm } = labelDimensions(labelSize);
  const nameMax = labelSize === "100x50" ? 42 : 22;
  const isLarge = labelSize === "100x50";

  const labels = items
    .filter((item) => item.barcode)
    .map((item) => {
      const parsed = parseSizeColorFromName(item.name);
      const size = item.size || parsed.size;
      const color = item.color || parsed.color;
      const meta: string[] = [];
      if (item.sku) meta.push(`SKU:${truncate(item.sku, 14)}`);
      if (size) meta.push(`Sz:${truncate(size, 8)}`);
      if (color) meta.push(`Col:${truncate(color, 10)}`);
      const hasMeta = meta.length > 0;

      const selling = item.sellingPrice ?? 0;
      const mrp = item.mrp ?? 0;
      const priceLine =
        showMrp && mrp > selling
          ? `${formatMoney(selling)}  MRP:${formatMoney(mrp)}`
          : formatMoney(selling);

      const img = barcodeDataUrl(item.barcode, labelSize);

      return `
      <div class="label">
        ${showLogo ? `<div class="logo">${STORE_NAME}</div>` : ""}
        <div class="name">${escapeHtml(truncate(item.name, nameMax))}</div>
        ${hasMeta ? `<div class="meta">${escapeHtml(meta.join("  "))}</div>` : ""}
        <div class="barcode-wrap">
          <img class="barcode" src="${img}" alt="${escapeHtml(item.barcode)}" />
        </div>
        <div class="bcn">BCN: ${escapeHtml(item.barcode)}</div>
        <div class="price">${escapeHtml(priceLine)}</div>
      </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>TVS LP 46 Labels</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: ${widthMm}mm; margin: 0; padding: 0; }
    @page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }
    body { font-family: Arial, Helvetica, sans-serif; color: #000; background: #fff; }
    .label {
      width: ${widthMm}mm;
      height: ${heightMm}mm;
      min-height: ${heightMm}mm;
      max-height: ${heightMm}mm;
      padding: 0.8mm 2mm 0.8mm 2mm;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      page-break-after: always;
      break-after: page;
      break-inside: avoid;
    }
    .label:last-child { page-break-after: auto; break-after: auto; }
    .logo {
      flex: 0 0 ${isLarge ? "3mm" : "2.2mm"};
      font-size: ${isLarge ? "10pt" : "7pt"};
      font-weight: 700;
      line-height: 1;
      white-space: nowrap;
      overflow: hidden;
    }
    .name {
      flex: 0 0 ${isLarge ? "3.6mm" : "2.6mm"};
      font-size: ${isLarge ? "9pt" : "6.5pt"};
      font-weight: 700;
      line-height: 1.05;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .meta {
      flex: 0 0 ${isLarge ? "2.8mm" : "2.2mm"};
      font-size: ${isLarge ? "7pt" : "5.5pt"};
      line-height: 1;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .barcode-wrap {
      flex: 1 1 auto;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      min-height: ${isLarge ? "8mm" : "4.5mm"};
      max-height: ${isLarge ? "12mm" : "6.5mm"};
      overflow: hidden;
    }
    .barcode {
      display: block;
      width: ${widthMm - 4}mm;
      max-width: ${widthMm - 4}mm;
      height: 100%;
      max-height: ${isLarge ? "10mm" : "5.5mm"};
      object-fit: fill;
    }
    .bcn {
      flex: 0 0 ${isLarge ? "2.8mm" : "2.2mm"};
      font-size: ${isLarge ? "7pt" : "5.5pt"};
      font-family: "Courier New", monospace;
      line-height: 1;
      white-space: nowrap;
    }
    .price {
      flex: 0 0 ${isLarge ? "3.2mm" : "2.6mm"};
      font-size: ${isLarge ? "8pt" : "6.5pt"};
      font-weight: 700;
      line-height: 1;
      white-space: nowrap;
    }
    @media print {
      html, body { width: ${widthMm}mm; height: auto; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .label { page-break-inside: avoid; }
    }
  </style>
</head>
<body>${labels}
  <script>
    window.onload = function() {
      window.focus();
      window.print();
    };
  <\/script>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function printBarcodeLabels(
  items: BarcodeLabelPrintItem[],
  options: BarcodeLabelPrintOptions = {}
): void {
  const valid = items.filter((item) => item.barcode);
  if (valid.length === 0) return;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";

  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  if (!win) {
    iframe.remove();
    return;
  }

  win.document.open();
  win.document.write(buildLabelHtml(valid, options));
  win.document.close();

  const triggerPrint = () => {
    try {
      win.focus();
      win.print();
    } catch {
      // ignore print errors
    }
  };

  if (iframe.contentDocument?.readyState === "complete") {
    setTimeout(triggerPrint, 150);
  } else {
    iframe.onload = () => setTimeout(triggerPrint, 150);
  }

  setTimeout(() => iframe.remove(), 10000);
}

export async function printBarcodeLabelsWithSettings(
  items: BarcodeLabelPrintItem[]
): Promise<void> {
  const { getPrinterSettings } = await import("@/actions/printer-settings");
  const settings = await getPrinterSettings();
  printBarcodeLabels(items, {
    labelSize: settings.labelSize,
    showLogo: settings.showLogo,
    showMrp: settings.showMrp,
  });
}

export function downloadBarcodePng(code: string, label: string) {
  const canvas = document.createElement("canvas");
  renderBarcodeToCanvas(code, canvas);
  const link = document.createElement("a");
  link.download = `${label.replace(/[^\w.-]+/g, "_")}-${code}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export async function downloadBarcodesPdf(
  items: { barcode: string; name: string }[],
  filename = "product-barcodes.pdf"
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 12;

  for (const item of items) {
    if (y > 260) {
      doc.addPage();
      y = 12;
    }

    doc.setFontSize(11);
    doc.text(item.name.slice(0, 60), 12, y);
    y += 5;

    const canvas = document.createElement("canvas");
    renderBarcodeToCanvas(item.barcode, canvas);
    const img = canvas.toDataURL("image/png");
    const imgWidth = Math.min(pageWidth - 24, 90);
    doc.addImage(img, "PNG", 12, y, imgWidth, 22);
    y += 28;
  }

  doc.save(filename);
}
