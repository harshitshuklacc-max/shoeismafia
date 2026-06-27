"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
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
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Link href={`/products/${product.slug}`}>
        <div className="bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
          <div className="relative aspect-square bg-gray-50 p-4">
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              className="object-contain p-2 group-hover:scale-105 transition-transform"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
            {outOfStock && (
              <Badge className="absolute top-2 left-2 bg-red-600 text-white">
                OUT OF STOCK
              </Badge>
            )}
            {discount > 0 && !outOfStock && (
              <Badge className="absolute top-2 left-2 bg-green-600 text-white">
                {discount}% OFF
              </Badge>
            )}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 rounded-full shadow"
                onClick={handleAddToWishlist}
              >
                <Heart className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="p-4">
            {product.brand && (
              <p className="text-xs text-gray-500 uppercase tracking-wide">{product.brand}</p>
            )}
            <h3 className="font-medium text-sm line-clamp-2 mt-1 min-h-[2.5rem]">
              {product.name}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="font-bold text-lg">{formatCurrency(product.selling_price)}</span>
              {product.mrp > product.selling_price && (
                <span className="text-sm text-gray-400 line-through">
                  {formatCurrency(product.mrp)}
                </span>
              )}
            </div>
            {!outOfStock ? (
              <Button
                variant="flipkart"
                size="sm"
                className="w-full mt-3"
                onClick={handleAddToCart}
              >
                <ShoppingCart className="h-4 w-4 mr-1" />
                Add to Cart
              </Button>
            ) : (
              <Button size="sm" className="w-full mt-3" disabled>
                Out of Stock
              </Button>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
