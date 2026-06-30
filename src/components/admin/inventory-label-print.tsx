"use client";

import { PrintLabelButton } from "@/components/admin/print-label-button";
import { parseSizeColorFromName } from "@/lib/label-data";
import type { LabelProductData } from "@/types";

interface InventoryLabelPrintProps {
  name: string;
  barcode: string;
  sellingPrice?: number;
  mrp?: number;
  sku?: string | null;
}

export function InventoryLabelPrint({
  name,
  barcode,
  sellingPrice = 0,
  mrp = 0,
  sku,
}: InventoryLabelPrintProps) {
  const parsed = parseSizeColorFromName(name);
  const product: LabelProductData = {
    name,
    barcode,
    sku: sku || barcode,
    size: parsed.size,
    color: parsed.color,
    sellingPrice,
    mrp,
  };

  return <PrintLabelButton product={product} quickPrint label="Label" />;
}
