"use client";

import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addToCart } from "@/actions/cart";
import { toast } from "sonner";

interface ProductCardActionsProps {
  productId: string;
  outOfStock: boolean;
}

export function ProductCardActions({ productId, outOfStock }: ProductCardActionsProps) {
  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const result = await addToCart(productId);
    if (result.success) {
      toast.success("Added to cart");
    } else {
      toast.error(result.error || "Failed to add to cart");
    }
  };

  return (
    <div className="mt-auto pt-3">
      {!outOfStock ? (
        <Button
          variant="flipkart"
          size="sm"
          className="w-full h-9 rounded-sm text-xs font-semibold uppercase tracking-wide"
          onClick={handleAddToCart}
        >
          <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
          Add to Cart
        </Button>
      ) : (
        <Button size="sm" className="w-full h-9 rounded-sm" disabled>
          Out of Stock
        </Button>
      )}
    </div>
  );
}
