import { verifyAdminSession } from "@/actions/admin-auth";
import { getCategories } from "@/actions/products";
import { redirect } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";

export default async function NewProductPage() {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) redirect("/admin/login");

  const categories = await getCategories();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Add New Product</h1>
      <ProductForm categories={categories} />
    </div>
  );
}
