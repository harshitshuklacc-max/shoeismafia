import { verifyAdminSession } from "@/actions/admin-auth";
import { getParties } from "@/actions/parties";
import { redirect } from "next/navigation";
import { RestockForm } from "@/components/admin/restock-form";
import { LatestStockSection } from "@/components/admin/latest-stock-section";

export default async function RestockPage() {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) redirect("/admin/login");

  const parties = await getParties();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Restock Products</h1>
      <RestockForm parties={parties} />
      <div className="mt-8">
        <LatestStockSection />
      </div>
    </div>
  );
}
