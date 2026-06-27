import { verifyAdminSession } from "@/actions/admin-auth";
import { getAllOrdersAdmin, updateOrderStatus } from "@/actions/orders";
import { redirect } from "next/navigation";
import { formatCurrency, formatDateTime, ORDER_STATUS_COLORS } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { OrderStatusSelect } from "@/components/admin/order-status-select";

export default async function AdminOrdersPage() {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) redirect("/admin/login");

  const orders = await getAllOrdersAdmin();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Orders</h1>

      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3">Order #</th>
                <th className="text-left p-3">Customer</th>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Payment</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Total</th>
                <th className="text-left p-3">Update Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">No orders yet</td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{order.order_number}</td>
                    <td className="p-3">
                      {(order.customer as { full_name?: string })?.full_name || "Guest"}
                    </td>
                    <td className="p-3 text-xs">{formatDateTime(order.created_at)}</td>
                    <td className="p-3">{order.payment_method}</td>
                    <td className="p-3">
                      <Badge className={ORDER_STATUS_COLORS[order.status]}>
                        {order.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-right font-medium">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="p-3">
                      <OrderStatusSelect orderId={order.id} currentStatus={order.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
