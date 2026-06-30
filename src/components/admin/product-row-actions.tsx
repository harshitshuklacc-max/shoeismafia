"use client";

import { PrintLabelButton } from "@/components/admin/print-label-button";
import type { Product } from "@/types";

interface ProductRowActionsProps {
  product: Product;
}

export function ProductRowActions({ product }: ProductRowActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <PrintLabelButton product={product} quickPrint label="Label" />
    </div>
  );
}
