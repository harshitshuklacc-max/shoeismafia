import { verifyAdminSession } from "@/actions/admin-auth";
import { redirect } from "next/navigation";
import { ProductPhotoUploadForm } from "@/components/admin/product-photo-upload-form";

export default async function ProductPhotosPage() {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) redirect("/admin/login");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Product Photos</h1>
      <p className="text-sm text-gray-500 mb-6">
        Upload product images using the BCN barcode number from BUSY.
      </p>
      <ProductPhotoUploadForm />
    </div>
  );
}
