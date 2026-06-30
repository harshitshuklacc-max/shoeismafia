"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProductByBarcode } from "@/actions/products";
import { LabelPrintDialog } from "@/components/admin/label-print-dialog";
import { PrintLabelButton } from "@/components/admin/print-label-button";
import { productToLabelData } from "@/lib/label-data";
import { toast } from "sonner";
import { ScanBarcode, Printer } from "lucide-react";
import type { LabelProductData, Product } from "@/types";

export function BarcodeReprintForm() {
  const [barcode, setBarcode] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);
  const [queue, setQueue] = useState<LabelProductData[]>([]);

  const lookup = async (code?: string) => {
    const trimmed = (code ?? barcode).trim();
    if (!trimmed) return;
    const found = await getProductByBarcode(trimmed);
    setProduct(found);
    if (!found) toast.error("Product not found");
  };

  const addToQueue = () => {
    if (!product) return;
    const data = productToLabelData(product);
    setQueue((prev) => {
      if (prev.some((p) => p.barcode === data.barcode)) return prev;
      return [...prev, data];
    });
    toast.success("Added to print queue");
    setBarcode("");
    setProduct(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanBarcode className="h-5 w-5" />
            Barcode Reprint
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="bcn">Scan or enter BCN</Label>
            <Input
              id="bcn"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  lookup();
                }
              }}
              className="font-mono"
              placeholder="Barcode number"
              autoFocus
            />
          </div>

          {product && (
            <div className="rounded-lg border bg-gray-50 p-4 space-y-3">
              <div>
                <p className="font-medium">{product.name}</p>
                <p className="text-xs font-mono text-gray-500">BCN: {product.barcode}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <PrintLabelButton product={product} quickPrint label="Print Now" />
                <PrintLabelButton product={product} label="Print Options" />
                <Button type="button" variant="outline" size="sm" onClick={addToQueue}>
                  Add to Batch
                </Button>
              </div>
            </div>
          )}

          <Button type="button" variant="flipkart" onClick={() => lookup()} disabled={!barcode.trim()}>
            Find Product
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Batch Queue ({queue.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {queue.length === 0 ? (
            <p className="text-sm text-gray-500">Add products to print multiple labels at once.</p>
          ) : (
            <>
              <ul className="text-sm divide-y max-h-48 overflow-y-auto">
                {queue.map((item) => (
                  <li key={item.barcode} className="py-2 flex justify-between gap-2">
                    <span className="truncate">{item.name}</span>
                    <span className="font-mono text-xs shrink-0">{item.barcode}</span>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Button type="button" variant="flipkart" onClick={() => setBatchOpen(true)}>
                  Print Batch
                </Button>
                <Button type="button" variant="outline" onClick={() => setQueue([])}>
                  Clear
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <LabelPrintDialog
        open={batchOpen}
        onOpenChange={setBatchOpen}
        products={queue}
        title={`Batch print ${queue.length} labels`}
      />
    </div>
  );
}
