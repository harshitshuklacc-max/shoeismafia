import type { Product } from "@/types";
import type { LabelProductData } from "@/types";

export function parseSizeColorFromName(name: string): { size?: string; color?: string } {
  const sizeMatch = name.match(/Size\s+([^-]+)/i);
  const parts = name.split(" - ").map((p) => p.trim()).filter(Boolean);
  let color: string | undefined;
  if (parts.length >= 3) {
    const last = parts[parts.length - 1];
    if (!/^size\s/i.test(last) && last.toUpperCase() !== "NA") {
      color = last;
    }
  }
  return {
    size: sizeMatch?.[1]?.trim(),
    color,
  };
}

export function productToLabelData(product: Product): LabelProductData {
  const parsed = parseSizeColorFromName(product.name);
  return {
    name: product.name,
    barcode: product.barcode,
    sku: product.sku || product.barcode,
    size: parsed.size,
    color: parsed.color,
    sellingPrice: product.selling_price,
    mrp: product.mrp,
    brand: product.brand || undefined,
  };
}
