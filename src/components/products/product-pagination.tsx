interface ProductPaginationProps {
  currentPage: number;
  totalPages: number;
  searchParams: Record<string, string | undefined>;
}

function buildPageHref(page: number, params: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "page") query.set(key, value);
  }
  query.set("page", String(page));
  return `/products?${query.toString()}`;
}

function getVisiblePages(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [1];

  if (current > 3) pages.push("ellipsis");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let p = start; p <= end; p++) pages.push(p);

  if (current < total - 2) pages.push("ellipsis");

  pages.push(total);
  return pages;
}

export function ProductPagination({
  currentPage,
  totalPages,
  searchParams,
}: ProductPaginationProps) {
  if (totalPages <= 1) return null;

  const visiblePages = getVisiblePages(currentPage, totalPages);

  const linkClass = (active: boolean) =>
    `min-w-[2.25rem] h-9 px-3 inline-flex items-center justify-center rounded-sm border text-sm font-medium transition-colors ${
      active
        ? "bg-flipkart-blue text-white border-flipkart-blue"
        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
    }`;

  return (
    <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-6">
      <p className="text-sm text-gray-500">
        Page <span className="font-medium text-gray-800">{currentPage}</span> of{" "}
        <span className="font-medium text-gray-800">{totalPages}</span>
      </p>

      <nav className="flex items-center gap-1.5 flex-wrap justify-center" aria-label="Pagination">
        {currentPage > 1 ? (
          <a href={buildPageHref(currentPage - 1, searchParams)} className={linkClass(false)}>
            Prev
          </a>
        ) : (
          <span className={`${linkClass(false)} opacity-40 pointer-events-none`}>Prev</span>
        )}

        {visiblePages.map((page, index) =>
          page === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
              …
            </span>
          ) : (
            <a
              key={page}
              href={buildPageHref(page, searchParams)}
              className={linkClass(page === currentPage)}
              aria-current={page === currentPage ? "page" : undefined}
            >
              {page}
            </a>
          )
        )}

        {currentPage < totalPages ? (
          <a href={buildPageHref(currentPage + 1, searchParams)} className={linkClass(false)}>
            Next
          </a>
        ) : (
          <span className={`${linkClass(false)} opacity-40 pointer-events-none`}>Next</span>
        )}
      </nav>
    </div>
  );
}
