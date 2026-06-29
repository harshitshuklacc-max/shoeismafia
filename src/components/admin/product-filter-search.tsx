"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { searchProductsAvailability } from "@/actions/products";
import { formatCurrency } from "@/lib/utils";
import { Search, Package } from "lucide-react";
import Image from "next/image";
import type { ProductAvailability } from "@/types";

export function ProductFilterSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductAvailability[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleSearch = (value: string) => {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    startTransition(async () => {
      const rows = await searchProductsAvailability(value);
      setResults(rows);
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search by Product Name
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Type product name, brand, or BCN..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            autoFocus
          />
          <p className="text-xs text-gray-500 mt-2">
            Check whether a product is in stock. Search by name, brand, or barcode.
          </p>
        </CardContent>
      </Card>

      {query.trim().length >= 2 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {isPending ? "Searching..." : `${results.length} result${results.length === 1 ? "" : "s"}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {results.length === 0 && !isPending ? (
              <p className="text-sm text-gray-500 py-6 text-center">No products found for &quot;{query}&quot;</p>
            ) : (
              <div className="divide-y">
                {results.map((product) => (
                  <div key={product.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                    <div className="h-14 w-14 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                      {product.image_url ? (
                        <Image
                          src={product.image_url}
                          alt={product.name}
                          width={56}
                          height={56}
                          className="object-cover h-full w-full"
                        />
                      ) : (
                        <Package className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.name}</p>
                      <p className="text-xs text-gray-500 font-mono">BCN: {product.barcode}</p>
                      {product.brand && (
                        <p className="text-xs text-gray-500">Brand: {product.brand}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold">{formatCurrency(product.selling_price)}</p>
                      <Badge
                        variant={product.quantity > 0 ? "default" : "destructive"}
                        className="mt-1"
                      >
                        {product.quantity > 0 ? `${product.quantity} in stock` : "Out of stock"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
