"use client";

import { getPrinterSettings } from "@/actions/printer-settings";
import { buildTsplBatch, buildTsplLabel, validateBarcodeForSymbology } from "@/lib/tspl";
import { printRawTspl, downloadTsplFile } from "@/lib/tvs-print";
import type { LabelProductData } from "@/types";

export async function printLabelsDirect(
  items: LabelProductData[],
  copies?: number
): Promise<{ method: "agent"; count: number }> {
  if (items.length === 0) {
    throw new Error("No labels to print");
  }

  const settings = await getPrinterSettings();
  if (!settings.printerName.trim()) {
    throw new Error("Select your TVS LP 46 printer in Admin → Settings first");
  }

  for (const item of items) {
    const err = validateBarcodeForSymbology(item.barcode, settings.barcodeType);
    if (err) {
      throw new Error(`${item.name}: ${err}`);
    }
  }

  const opts = {
    labelSize: settings.labelSize,
    barcodeType: settings.barcodeType,
    showLogo: settings.showLogo,
    showMrp: settings.showMrp,
    copies: copies ?? settings.copiesDefault,
  };

  const tspl =
    items.length === 1
      ? buildTsplLabel(items[0], opts)
      : buildTsplBatch(items, opts);

  try {
    const result = await printRawTspl(settings.printerName, tspl);
    return { method: result.method, count: items.length * opts.copies };
  } catch (error) {
    downloadTsplFile(tspl, "labels.tspl");
    throw error instanceof Error ? error : new Error("TVS print failed");
  }
}
