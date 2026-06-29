import Link from "next/link";
import Image from "next/image";
import { getProducts, getBanners, getCategories } from "@/actions/products";
import { ProductCard } from "@/components/products/product-card";
import { ChevronRight } from "lucide-react";

export const revalidate = 60;

export default async function HomePage() {
  const [{ products: featuredProducts }, banners, categories, { products: latestProducts }] =
    await Promise.all([
      getProducts({ featured: true, limit: 8 }),
      getBanners(),
      getCategories(),
      getProducts({ limit: 12 }),
    ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: "Shoe Mafia",
    description: "Premium footwear store",
    url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero Banner */}
      <section className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] text-white">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
            <div className="shrink-0">
              <Image
                src="/logo.png"
                alt="Shoe Mafia"
                width={180}
                height={180}
                className="rounded-full shadow-2xl ring-4 ring-white/20"
                priority
              />
            </div>
            <div className="max-w-2xl text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Step Into Style with <span className="text-[#2D8664]">Shoe Mafia</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-300 mb-8">
                Premium footwear for every occasion. Best prices, fastest delivery.
              </p>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 bg-[#2D8664] text-white font-bold px-8 py-3 rounded-sm hover:bg-[#236b4f]"
              >
                Shop Now
                <ChevronRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Banners */}
      {banners.length > 0 && (
        <section className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {banners.map((banner) => (
              <Link
                key={banner.id}
                href={banner.link_url || "/products"}
                className="relative aspect-[16/7] rounded-lg overflow-hidden group"
              >
                <Image
                  src={banner.image_url}
                  alt={banner.title}
                  fill
                  className="object-cover group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                  <div>
                    <h3 className="text-white font-bold text-lg">{banner.title}</h3>
                    {banner.subtitle && (
                      <p className="text-white/80 text-sm">{banner.subtitle}</p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">Shop by Category</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/products?category=${category.slug}`}
              className="flex flex-col items-center p-4 bg-white border rounded-lg hover:shadow-md hover:border-flipkart-blue group"
            >
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-3 group-hover:bg-blue-100">
                <span className="text-2xl">👟</span>
              </div>
              <span className="text-sm font-medium text-center">{category.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Featured Products</h2>
            <Link href="/products?featured=true" className="text-flipkart-blue hover:underline flex items-center gap-1">
              View All <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Latest Products */}
      <section className="container mx-auto px-4 py-8 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Latest Arrivals</h2>
          <Link href="/products" className="text-flipkart-blue hover:underline flex items-center gap-1">
            View All <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        {latestProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {latestProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-gray-50 rounded-lg">
            <p className="text-gray-500 text-lg">Products coming soon!</p>
            <p className="text-gray-400 text-sm mt-2">
              Admin can add products from the Admin Portal
            </p>
            <Link
              href="/admin"
              className="inline-block mt-4 text-flipkart-blue hover:underline"
            >
              Go to Admin Portal →
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
