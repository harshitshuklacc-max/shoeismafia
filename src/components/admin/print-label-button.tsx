"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LabelPrintDialog } from "@/components/admin/label-print-dialog";
import { printLabelsDirect } from "@/lib/label-print";
import { productToLabelData } from "@/lib/label-data";
import { toast } from "sonner";
import { Printer } from "lucide-react";
import type { LabelProductData, Product } from "@/types";

interface PrintLabelButtonProps {
  product: Product | LabelProductData;
  variant?: "default" | "outline" | "ghost" | "flipkart";
  size?: "default" | "sm" | "icon";
  quickPrint?: boolean;
  label?: string;
}

function toLabelData(product: Product | LabelProductData): LabelProductData {
  if ("sellingPrice" in product) return product;
  return productToLabelData(product);
}

export function PrintLabelButton({
  product,
  variant = "outline",
  size = "sm",
  quickPrint = false,
  label = "Print Label",
}: PrintLabelButtonProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const labelData = toLabelData(product);

  const handleQuickPrint = async () => {
    setBusy(true);
    try {
      await printLabelsDirect([labelData]);
      toast.success("Label sent to TVS LP 46");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Print failed");
      setOpen(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={busy}
        onClick={() => (quickPrint ? handleQuickPrint() : setOpen(true))}
      >
        <Printer className="h-3.5 w-3.5 mr-1" />
        {busy ? "Printing…" : label}
      </Button>
      <LabelPrintDialog
        open={open}
        onOpenChange={setOpen}
        products={[labelData]}
        title={`Print: ${labelData.name}`}
      />
    </>
  );
}
