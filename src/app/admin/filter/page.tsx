import { verifyAdminSession } from "@/actions/admin-auth";
import { redirect } from "next/navigation";
import { ProductFilterSearch } from "@/components/admin/product-filter-search";

export default async function ProductFilterPage() {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) redirect("/admin/login");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Filter</h1>
      <p className="text-sm text-gray-500 mb-6">
        Search products by name to check availability and stock.
      </p>
      <ProductFilterSearch />
    </div>
  );
}
