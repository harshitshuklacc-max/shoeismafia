"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  formatCurrency,
  getDiscountPercent,
  getPrimaryImage,
  isOutOfStock,
} from "@/lib/utils";
import type { Product } from "@/types";
import { addToCart } from "@/actions/cart";
import { addToWishlist } from "@/actions/wishlist";
import { toast } from "sonner";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const outOfStock = isOutOfStock(product.quantity);
  const discount = getDiscountPercent(product.mrp, product.selling_price);
  const imageUrl = getPrimaryImage(product.product_images);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const result = await addToCart(product.id);
    if (result.success) {
      toast.success("Added to cart");
    } else {
      toast.error(result.error || "Failed to add to cart");
    }
  };

  const handleAddToWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const result = await addToWishlist(product.id);
    if (result.success) {
      toast.success("Added to wishlist");
    } else {
      toast.error(result.error || "Failed to add to wishlist");
    }
  };

  return (
    <div className="group h-full">
      <Link href={`/products/${product.slug}`} className="block h-full">
        <div className="flex h-full flex-col bg-white border border-gray-200 rounded-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
          <div className="relative aspect-[4/5] bg-white p-3 flex items-center justify-center">
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              className="object-contain p-2 group-hover:scale-[1.03] transition-transform duration-200"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
            {outOfStock && (
              <Badge className="absolute top-2 left-2 rounded-sm bg-red-600 text-white text-[10px]">
                OUT OF STOCK
              </Badge>
            )}
            {discount > 0 && !outOfStock && (
              <span className="absolute top-2 left-2 rounded-sm bg-[#388e3c] text-white text-[10px] font-semibold px-1.5 py-0.5">
                {discount}% off
              </span>
            )}
            <Button
              size="icon"
              variant="secondary"
              className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleAddToWishlist}
            >
              <Heart className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-1 flex-col p-3 pt-2 border-t border-gray-100">
            {product.brand && (
              <p className="text-[11px] text-gray-500 uppercase tracking-wide truncate">
                {product.brand}
              </p>
            )}
            <h3 className="mt-1 text-sm text-gray-800 line-clamp-2 min-h-[2.5rem] leading-snug">
              {product.name}
            </h3>

            <div className="mt-2 flex items-baseline gap-2 flex-wrap">
              <span className="text-base font-semibold text-gray-900">
                {formatCurrency(product.selling_price)}
              </span>
              {product.mrp > product.selling_price && (
                <>
                  <span className="text-xs text-gray-400 line-through">
                    {formatCurrency(product.mrp)}
                  </span>
                  {discount > 0 && (
                    <span className="text-xs font-medium text-[#388e3c]">{discount}% off</span>
                  )}
                </>
              )}
            </div>

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
          </div>
        </div>
      </Link>
    </div>
  );
}
