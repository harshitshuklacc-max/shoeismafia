import { verifyAdminSession } from "@/actions/admin-auth";
import { redirect } from "next/navigation";
import { RestockForm } from "@/components/admin/restock-form";

export default async function RestockPage() {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) redirect("/admin/login");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Restock Products</h1>
      <RestockForm />
    </div>
  );
}
