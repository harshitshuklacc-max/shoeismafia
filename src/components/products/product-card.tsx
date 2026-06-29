import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import {
  formatCurrency,
  getDiscountPercent,
  getPrimaryImage,
  isOutOfStock,
} from "@/lib/utils";
import type { Product } from "@/types";
import { ProductCardActions } from "@/components/products/product-card-actions";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const outOfStock = isOutOfStock(product.quantity);
  const discount = getDiscountPercent(product.mrp, product.selling_price);
  const imageUrl = getPrimaryImage(product.product_images);

  return (
    <div className="group h-full">
      <div className="flex h-full flex-col bg-white border border-gray-200 rounded-sm overflow-hidden hover:shadow-md">
        <Link href={`/products/${product.slug}`} className="block">
          <div className="relative aspect-[4/5] bg-white p-3 flex items-center justify-center">
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              className="object-contain p-2"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              loading="lazy"
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
          </div>
        </Link>

        <div className="flex flex-1 flex-col p-3 pt-2 border-t border-gray-100">
          <Link href={`/products/${product.slug}`} className="block flex-1">
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
          </Link>

          <ProductCardActions productId={product.id} outOfStock={outOfStock} />
        </div>
      </div>
    </div>
  );
}
