import { verifyAdminSession } from "@/actions/admin-auth";
import { getPortalDataCounts } from "@/actions/admin-reset";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetPortalButton } from "@/components/admin/reset-portal-button";

export default async function AdminSettingsPage() {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) redirect("/admin/login");

  const counts = await getPortalDataCounts();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Settings</h1>
      <p className="text-sm text-gray-500 mb-6">Manage admin portal data and dangerous actions.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current data</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-gray-50 p-3">
                <dt className="text-gray-500">Products</dt>
                <dd className="text-xl font-semibold mt-1">{counts.products}</dd>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <dt className="text-gray-500">Orders</dt>
                <dd className="text-xl font-semibold mt-1">{counts.orders}</dd>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <dt className="text-gray-500">POS Sales</dt>
                <dd className="text-xl font-semibold mt-1">{counts.posSales}</dd>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <dt className="text-gray-500">Inventory Logs</dt>
                <dd className="text-xl font-semibold mt-1">{counts.inventoryLogs}</dd>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <dt className="text-gray-500">Import History</dt>
                <dd className="text-xl font-semibold mt-1">{counts.importLogs}</dd>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <dt className="text-gray-500">Customers</dt>
                <dd className="text-xl font-semibold mt-1">{counts.customers}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-lg text-red-600">Danger zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Reset the entire portal in one step — products, photos, orders, POS bills, inventory
              history, BUSY imports, customers, carts, coupons, and banners. Admin login is kept.
              Default shoe categories are restored automatically.
            </p>
            <ResetPortalButton counts={counts} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
