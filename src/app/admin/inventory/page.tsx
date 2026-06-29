import { verifyAdminSession } from "@/actions/admin-auth";
import { getInventoryLogs, getLowStockProducts, getRestockLogs } from "@/actions/inventory";
import { redirect } from "next/navigation";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LatestStockSection } from "@/components/admin/latest-stock-section";

export default async function InventoryPage() {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) redirect("/admin/login");

  const [logs, lowStock, restockLogs] = await Promise.all([
    getInventoryLogs(50),
    getLowStockProducts(5),
    getRestockLogs(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Inventory Management</h1>

      {lowStock.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-yellow-800 mb-2">
            Low Stock Alert ({lowStock.length} products)
          </h2>
          <div className="flex flex-wrap gap-2">
            {lowStock.map((p) => (
              <Badge key={p.id} className="bg-yellow-100 text-yellow-800">
                {p.name} ({p.quantity})
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="mb-8">
        <LatestStockSection />
      </div>

      <Tabs defaultValue="logs">
        <TabsList>
          <TabsTrigger value="logs">Inventory Logs</TabsTrigger>
          <TabsTrigger value="restock">Restock History</TabsTrigger>
        </TabsList>

        <TabsContent value="logs">
          <div className="bg-white rounded-lg border overflow-hidden mt-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Product</th>
                  <th className="text-left p-3">Barcode</th>
                  <th className="text-left p-3">Action</th>
                  <th className="text-right p-3">Change</th>
                  <th className="text-right p-3">Before</th>
                  <th className="text-right p-3">After</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">No inventory logs yet</td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-xs">{formatDateTime(log.created_at)}</td>
                      <td className="p-3">{(log.product as { name: string })?.name || "-"}</td>
                      <td className="p-3 font-mono text-xs">{log.barcode}</td>
                      <td className="p-3">
                        <Badge variant="outline">{log.action}</Badge>
                      </td>
                      <td className={`p-3 text-right font-medium ${log.quantity_change > 0 ? "text-green-600" : "text-red-600"}`}>
                        {log.quantity_change > 0 ? "+" : ""}{log.quantity_change}
                      </td>
                      <td className="p-3 text-right">{log.quantity_before}</td>
                      <td className="p-3 text-right">{log.quantity_after}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="restock">
          <div className="bg-white rounded-lg border overflow-hidden mt-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Party</th>
                  <th className="text-left p-3">Product</th>
                  <th className="text-left p-3">Barcode</th>
                  <th className="text-right p-3">Added</th>
                  <th className="text-right p-3">Before</th>
                  <th className="text-right p-3">After</th>
                </tr>
              </thead>
              <tbody>
                {restockLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">No restock logs yet</td>
                  </tr>
                ) : (
                  restockLogs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-xs">{formatDateTime(log.created_at)}</td>
                      <td className="p-3">
                        <Badge variant="outline">{log.party_name || "—"}</Badge>
                      </td>
                      <td className="p-3">{(log.product as { name: string })?.name || "-"}</td>
                      <td className="p-3 font-mono text-xs">{log.barcode}</td>
                      <td className="p-3 text-right text-green-600 font-medium">+{log.quantity_added}</td>
                      <td className="p-3 text-right">{log.quantity_before}</td>
                      <td className="p-3 text-right">{log.quantity_after}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
