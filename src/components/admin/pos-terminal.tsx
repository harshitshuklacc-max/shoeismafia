"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { searchPosProducts, processPosSale } from "@/actions/pos";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
  Search,
  ScanBarcode,
  Trash2,
  Minus,
  Plus,
  CreditCard,
  Banknote,
  Smartphone,
} from "lucide-react";
import type { Product, PosSaleItem } from "@/types";
import { generateInvoicePDF, printInvoicePDF } from "@/lib/invoice";

export function PosTerminal() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [cart, setCart] = useState<PosSaleItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [loading, setLoading] = useState(false);
  const [lastSale, setLastSale] = useState<{ saleNumber: string; items: PosSaleItem[]; total: number } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeBufferRef = useRef("");
  const barcodeTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const addToCart = useCallback((product: Product) => {
    if (product.quantity <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) {
          toast.error("Not enough stock");
          return prev;
        }
        return prev.map((item) =>
          item.product_id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total_price: (item.quantity + 1) * item.unit_price,
              }
            : item
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          barcode: product.barcode,
          name: product.name,
          quantity: 1,
          unit_price: product.selling_price,
          total_price: product.selling_price,
        },
      ];
    });
    setSearchQuery("");
    setSearchResults([]);
  }, []);

  const handleBarcodeScan = useCallback(
    async (barcode: string) => {
      const results = await searchPosProducts(barcode);
      const exact = results.find((p) => p.barcode === barcode);
      if (exact) {
        addToCart(exact);
        toast.success(`Added: ${exact.name}`);
      } else if (results.length === 1) {
        addToCart(results[0]);
      } else {
        toast.error("Product not found");
      }
    },
    [addToCart]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement && e.target !== searchInputRef.current) return;

      if (e.key === "Enter" && barcodeBufferRef.current.length > 3) {
        handleBarcodeScan(barcodeBufferRef.current);
        barcodeBufferRef.current = "";
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        clearTimeout(barcodeTimeoutRef.current);
        barcodeBufferRef.current += e.key;
        barcodeTimeoutRef.current = setTimeout(() => {
          barcodeBufferRef.current = "";
        }, 100);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleBarcodeScan]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      const results = await searchPosProducts(query);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product_id !== productId) return item;
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          return {
            ...item,
            quantity: newQty,
            total_price: newQty * item.unit_price,
          };
        })
        .filter(Boolean) as PosSaleItem[]
    );
  };

  const removeItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product_id !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.total_price, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    setLoading(true);
    const result = await processPosSale(cart, paymentMethod);
    setLoading(false);

    if (result.success && result.data) {
      toast.success(`Sale completed: ${result.data.saleNumber}`);
      setLastSale({
        saleNumber: result.data.saleNumber,
        items: [...cart],
        total: subtotal,
      });
      setCart([]);
      searchInputRef.current?.focus();
    } else {
      toast.error(result.error || "Sale failed");
    }
  };

  const getInvoiceData = () => {
    if (!lastSale) return null;
    return {
      invoiceNumber: lastSale.saleNumber,
      type: "pos" as const,
      items: lastSale.items,
      subtotal: lastSale.total,
      total: lastSale.total,
      paymentMethod,
    };
  };

  const handlePrintInvoice = () => {
    const data = getInvoiceData();
    if (data) printInvoicePDF(data);
  };

  const handleDownloadInvoice = () => {
    const data = getInvoiceData();
    if (data) generateInvoicePDF(data);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ScanBarcode className="h-5 w-5" />
              Scan or Search Product
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                ref={searchInputRef}
                placeholder="Scan barcode or search by name, barcode, category..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              USB scanner ready • Camera scan via manual input • Repeat scan increases quantity
            </p>

            {searchResults.length > 0 && (
              <div className="mt-3 border rounded-lg max-h-60 overflow-y-auto">
                {searchResults.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 border-b last:border-0 text-left"
                  >
                    <div>
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-gray-500 font-mono">{product.barcode}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(product.selling_price)}</p>
                      <p className="text-xs text-gray-500">Stock: {product.quantity}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Cart ({cart.length} items)</CardTitle>
          </CardHeader>
          <CardContent>
            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Scan or search products to add</p>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div
                    key={item.product_id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-gray-500 font-mono">{item.barcode}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.product_id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.product_id, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <span className="font-bold w-20 text-right">
                        {formatCurrency(item.total_price)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500"
                        onClick={() => removeItem(item.product_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">
                  <span className="flex items-center gap-2"><Banknote className="h-4 w-4" /> Cash</span>
                </SelectItem>
                <SelectItem value="UPI">
                  <span className="flex items-center gap-2"><Smartphone className="h-4 w-4" /> UPI</span>
                </SelectItem>
                <SelectItem value="Card">
                  <span className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> Card</span>
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-lg">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-2xl font-bold">
                <span>Total</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
            </div>

            <Button
              variant="flipkart"
              className="w-full"
              size="lg"
              disabled={cart.length === 0 || loading}
              onClick={handleCheckout}
            >
              {loading ? "Processing..." : "Complete Sale"}
            </Button>
          </CardContent>
        </Card>

        {lastSale && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Last Sale</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="mb-2">{lastSale.saleNumber}</Badge>
              <p className="font-bold text-xl">{formatCurrency(lastSale.total)}</p>
              <div className="flex gap-2 mt-3">
                <Button variant="outline" size="sm" onClick={handlePrintInvoice}>
                  Print Receipt
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadInvoice}>
                  Download PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
