import { Suspense } from "react";
import { getProducts, getCategories } from "@/actions/products";
import { ProductCard } from "@/components/products/product-card";
import { ProductFilters } from "@/components/products/product-filters";

interface ProductsPageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    sort?: string;
    page?: string;
    featured?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const categorySlug = params.category;

  const categories = await getCategories();
  const categoryId = categorySlug
    ? categories.find((c) => c.slug === categorySlug)?.id
    : undefined;

  const { products, total } = await getProducts({
    search: params.search,
    category: categoryId,
    sort: params.sort,
    page,
    limit: 20,
    featured: params.featured === "true",
  });

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-64 shrink-0">
          <Suspense fallback={<div className="h-64 bg-gray-100 rounded animate-pulse" />}>
            <ProductFilters categories={categories} />
          </Suspense>
        </aside>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">
                {params.search
                  ? `Results for "${params.search}"`
                  : categorySlug
                  ? categories.find((c) => c.slug === categorySlug)?.name || "Products"
                  : "All Products"}
              </h1>
              <p className="text-gray-500 text-sm mt-1">{total} products found</p>
            </div>
          </div>

          {products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <a
                      key={p}
                      href={`?${new URLSearchParams({ ...params, page: String(p) }).toString()}`}
                      className={`px-4 py-2 rounded border ${
                        p === page
                          ? "bg-flipkart-blue text-white border-flipkart-blue"
                          : "bg-white hover:bg-gray-50"
                      }`}
                    >
                      {p}
                    </a>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 bg-gray-50 rounded-lg">
              <p className="text-gray-500 text-lg">No products found</p>
              <p className="text-gray-400 text-sm mt-2">Try adjusting your filters or search</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
