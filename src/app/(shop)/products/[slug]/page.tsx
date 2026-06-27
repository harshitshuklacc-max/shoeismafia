import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getProduct } from "@/actions/products";
import { Badge } from "@/components/ui/badge";
import {
  formatCurrency,
  getDiscountPercent,
  getPrimaryImage,
  isOutOfStock,
} from "@/lib/utils";
import { ProductActions } from "@/components/products/product-actions";

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Product Not Found" };

  return {
    title: product.name,
    description: product.description || `Buy ${product.name} at Shoe Mafia`,
    openGraph: {
      title: product.name,
      description: product.description || undefined,
      images: [getPrimaryImage(product.product_images)],
    },
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) notFound();

  const outOfStock = isOutOfStock(product.quantity);
  const discount = getDiscountPercent(product.mrp, product.selling_price);
  const images = product.product_images || [];
  const primaryImage = getPrimaryImage(images);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: primaryImage,
    brand: { "@type": "Brand", name: product.brand },
    offers: {
      "@type": "Offer",
      price: product.selling_price,
      priceCurrency: "INR",
      availability: outOfStock
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="container mx-auto px-4 py-8">
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-flipkart-blue">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/products" className="hover:text-flipkart-blue">Products</Link>
          {product.category && (
            <>
              <span className="mx-2">/</span>
              <Link
                href={`/products?category=${product.category.slug}`}
                className="hover:text-flipkart-blue"
              >
                {product.category.name}
              </Link>
            </>
          )}
          <span className="mx-2">/</span>
          <span className="text-gray-900">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          <div className="space-y-4">
            <div className="relative aspect-square bg-gray-50 rounded-lg overflow-hidden border">
              <Image
                src={primaryImage}
                alt={product.name}
                fill
                className="object-contain p-4"
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              {outOfStock && (
                <Badge className="absolute top-4 left-4 bg-red-600 text-white text-sm px-3 py-1">
                  OUT OF STOCK
                </Badge>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className="relative w-20 h-20 shrink-0 border rounded overflow-hidden"
                  >
                    <Image
                      src={img.image_url}
                      alt={img.alt_text || product.name}
                      fill
                      className="object-contain p-1"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            {product.brand && (
              <p className="text-sm text-gray-500 uppercase tracking-wide">{product.brand}</p>
            )}
            <h1 className="text-2xl md:text-3xl font-bold mt-1">{product.name}</h1>

            <div className="flex items-center gap-3 mt-4">
              <span className="text-3xl font-bold">{formatCurrency(product.selling_price)}</span>
              {product.mrp > product.selling_price && (
                <>
                  <span className="text-lg text-gray-400 line-through">
                    {formatCurrency(product.mrp)}
                  </span>
                  <Badge className="bg-green-100 text-green-800">{discount}% off</Badge>
                </>
              )}
            </div>

            <div className="mt-6 space-y-3 text-sm">
              <div className="flex gap-2">
                <span className="text-gray-500 w-24">Availability:</span>
                <span className={outOfStock ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                  {outOfStock ? "Out of Stock" : `In Stock (${product.quantity} available)`}
                </span>
              </div>
              {product.barcode && (
                <div className="flex gap-2">
                  <span className="text-gray-500 w-24">Barcode:</span>
                  <span className="font-mono">{product.barcode}</span>
                </div>
              )}
              {product.hsn_code && (
                <div className="flex gap-2">
                  <span className="text-gray-500 w-24">HSN:</span>
                  <span>{product.hsn_code}</span>
                </div>
              )}
              <div className="flex gap-2">
                <span className="text-gray-500 w-24">GST:</span>
                <span>{product.gst_rate}%</span>
              </div>
            </div>

            <ProductActions product={product} outOfStock={outOfStock} />

            {product.description && (
              <div className="mt-8 border-t pt-6">
                <h2 className="font-semibold text-lg mb-3">Description</h2>
                <p className="text-gray-600 leading-relaxed">{product.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
