import JsBarcode from "jsbarcode";

const BARCODE_OPTIONS = {
  format: "CODE128" as const,
  width: 2,
  height: 56,
  displayValue: true,
  fontSize: 14,
  margin: 6,
  background: "#ffffff",
};

export function renderBarcodeToCanvas(code: string, canvas: HTMLCanvasElement) {
  JsBarcode(canvas, code, BARCODE_OPTIONS);
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
