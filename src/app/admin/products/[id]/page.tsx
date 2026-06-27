import { verifyAdminSession } from "@/actions/admin-auth";
import { createServiceClient } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import { ProductEditForm } from "@/components/admin/product-edit-form";
import { getCategories } from "@/actions/products";

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) redirect("/admin/login");

  const { id } = await params;
  const serviceClient = createServiceClient();
  const { data: product } = await serviceClient
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (!product) notFound();

  const categories = await getCategories();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Edit Product</h1>
      <ProductEditForm product={product} categories={categories} />
    </div>
  );
}
