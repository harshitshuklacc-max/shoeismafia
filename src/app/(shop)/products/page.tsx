import { Suspense } from "react";
import Link from "next/link";
import { getProducts, getCategories } from "@/actions/products";
import { ProductCard } from "@/components/products/product-card";
import { ProductFilters } from "@/components/products/product-filters";
import { ProductPagination } from "@/components/products/product-pagination";

const PRODUCTS_PER_PAGE = 20;

export const revalidate = 60;

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
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
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
    limit: PRODUCTS_PER_PAGE,
    featured: params.featured === "true",
  });

  const totalPages = Math.max(1, Math.ceil(total / PRODUCTS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const showingFrom = total === 0 ? 0 : (currentPage - 1) * PRODUCTS_PER_PAGE + 1;
  const showingTo = Math.min(currentPage * PRODUCTS_PER_PAGE, total);

  const paginationParams = {
    search: params.search,
    category: params.category,
    sort: params.sort,
    featured: params.featured,
  };

  return (
    <div className="bg-[#f1f3f6] min-h-screen">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <aside className="lg:w-56 shrink-0">
            <Suspense fallback={<div className="h-64 bg-white rounded-sm animate-pulse" />}>
              <ProductFilters categories={categories} />
            </Suspense>
          </aside>

          <div className="flex-1 min-w-0">
            <div className="bg-white border border-gray-200 rounded-sm p-4 mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h1 className="text-lg md:text-xl font-medium text-gray-800">
                    {params.search
                      ? `Results for "${params.search}"`
                      : categorySlug
                      ? categories.find((c) => c.slug === categorySlug)?.name || "Products"
                      : "All Products"}
                  </h1>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {total === 0
                      ? "No products found"
                      : `Showing ${showingFrom}–${showingTo} of ${total} products`}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500 whitespace-nowrap">Sort by:</span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "Newest", value: undefined },
                      { label: "Price: Low to High", value: "price_asc" },
                      { label: "Price: High to Low", value: "price_desc" },
                    ].map((option) => {
                      const query = new URLSearchParams();
                      if (params.search) query.set("search", params.search);
                      if (params.category) query.set("category", params.category);
                      if (option.value) query.set("sort", option.value);
                      const href = `/products?${query.toString()}`;
                      const active =
                        (option.value === undefined && !params.sort) || params.sort === option.value;

                      return (
                        <Link
                          key={option.label}
                          href={href}
                          className={`px-3 py-1.5 rounded-sm border text-xs font-medium whitespace-nowrap ${
                            active
                              ? "bg-flipkart-blue text-white border-flipkart-blue"
                              : "bg-white text-gray-700 border-gray-200 hover:border-flipkart-blue hover:text-flipkart-blue"
                          }`}
                        >
                          {option.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {products.length > 0 ? (
              <div className="bg-white border border-gray-200 rounded-sm p-3 md:p-4">
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                <ProductPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  searchParams={paginationParams}
                />
              </div>
            ) : (
              <div className="text-center py-16 bg-white border border-gray-200 rounded-sm">
                <p className="text-gray-600 text-lg">No products found</p>
                <p className="text-gray-400 text-sm mt-2">Try adjusting your filters or search</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
