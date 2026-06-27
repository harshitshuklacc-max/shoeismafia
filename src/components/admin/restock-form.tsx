"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { restockProduct } from "@/actions/inventory";
import { getProductByBarcode } from "@/actions/products";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { ScanBarcode, Package } from "lucide-react";
import type { Product } from "@/types";

export function RestockForm() {
  const [barcode, setBarcode] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const lookupProduct = async (code: string) => {
    if (!code.trim()) return;
    const found = await getProductByBarcode(code.trim());
    setProduct(found);
    if (!found) {
      toast.error("Product not found");
    }
  };

  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) {
      toast.error("Enter a barcode");
      return;
    }
    setLoading(true);
    const result = await restockProduct(barcode.trim(), quantity, notes || undefined);
    setLoading(false);

    if (result.success) {
      toast.success(`Restocked ${quantity} units successfully!`);
      setBarcode("");
      setQuantity(1);
      setNotes("");
      setProduct(null);
      barcodeInputRef.current?.focus();
    } else {
      toast.error(result.error || "Restock failed");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanBarcode className="h-5 w-5" />
            Scan Barcode to Restock
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="barcode">Barcode</Label>
              <Input
                ref={barcodeInputRef}
                id="barcode"
                value={barcode}
                onChange={(e) => {
                  setBarcode(e.target.value);
                }}
                onBlur={() => lookupProduct(barcode)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    lookupProduct(barcode);
                  }
                }}
                placeholder="Scan or enter barcode"
                className="font-mono"
              />
            </div>

            {product && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <Package className="h-8 w-8 text-flipkart-blue" />
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-gray-500">
                      Current Stock: <strong>{product.quantity}</strong>
                    </p>
                    <p className="text-sm text-gray-500">
                      Price: {formatCurrency(product.selling_price)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="quantity">Quantity to Add</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Restock notes"
              />
            </div>

            <Button type="submit" variant="flipkart" className="w-full" disabled={loading || !barcode}>
              {loading ? "Adding Stock..." : "Add Stock"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Restock Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="bg-flipkart-blue text-white rounded-full w-6 h-6 flex items-center justify-center shrink-0 text-xs">1</span>
              <span>Scan barcode using USB scanner or enter manually</span>
            </li>
            <li className="flex gap-3">
              <span className="bg-flipkart-blue text-white rounded-full w-6 h-6 flex items-center justify-center shrink-0 text-xs">2</span>
              <span>System finds the product automatically</span>
            </li>
            <li className="flex gap-3">
              <span className="bg-flipkart-blue text-white rounded-full w-6 h-6 flex items-center justify-center shrink-0 text-xs">3</span>
              <span>Enter quantity to add</span>
            </li>
            <li className="flex gap-3">
              <span className="bg-flipkart-blue text-white rounded-full w-6 h-6 flex items-center justify-center shrink-0 text-xs">4</span>
              <span>Stock updated instantly with inventory log & history</span>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
