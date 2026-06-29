import { verifyAdminSession } from "@/actions/admin-auth";
import { getCategories } from "@/actions/products";
import { getParties } from "@/actions/parties";
import { redirect } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";

export default async function NewProductPage() {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) redirect("/admin/login");

  const [categories, parties] = await Promise.all([getCategories(), getParties()]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Add Products</h1>
      <p className="text-sm text-gray-500 mb-6">
        Add one or many products at once. BCN barcodes auto-generate and party tracks who supplied the stock.
      </p>
      <ProductForm categories={categories} parties={parties} />
    </div>
  );
}
