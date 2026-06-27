"use client";

import { useState } from "react";
import { ShoppingCart, Heart, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addToCart } from "@/actions/cart";
import { addToWishlist } from "@/actions/wishlist";
import { toast } from "sonner";
import type { Product } from "@/types";

interface ProductActionsProps {
  product: Product;
  outOfStock: boolean;
}

export function ProductActions({ product, outOfStock }: ProductActionsProps) {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleAddToCart = async () => {
    setLoading(true);
    const result = await addToCart(product.id, quantity);
    setLoading(false);
    if (result.success) {
      toast.success("Added to cart");
    } else {
      toast.error(result.error || "Failed to add to cart");
    }
  };

  const handleWishlist = async () => {
    const result = await addToWishlist(product.id);
    if (result.success) {
      toast.success("Added to wishlist");
    } else {
      toast.error(result.error || "Please login first");
    }
  };

  return (
    <div className="mt-8 space-y-4">
      {!outOfStock && (
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Quantity:</span>
          <div className="flex items-center border rounded">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-12 text-center font-medium">{quantity}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={() => setQuantity(Math.min(product.quantity, quantity + 1))}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant="flipkart"
          size="lg"
          className="flex-1"
          disabled={outOfStock || loading}
          onClick={handleAddToCart}
        >
          <ShoppingCart className="h-5 w-5 mr-2" />
          {outOfStock ? "Out of Stock" : "Add to Cart"}
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={handleWishlist}
        >
          <Heart className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
