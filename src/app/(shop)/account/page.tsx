import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { getOrders } from "@/actions/orders";
import { formatCurrency, formatDate, ORDER_STATUS_COLORS } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/account");

  const orders = await getOrders();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">My Account</h1>
      <p className="text-gray-500 mb-8">{user.email}</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <nav className="space-y-2">
          <Link href="/account" className="block py-2 px-4 bg-blue-50 text-flipkart-blue rounded font-medium">
            Orders
          </Link>
          <Link href="/account/profile" className="block py-2 px-4 hover:bg-gray-50 rounded">
            Profile
          </Link>
          <Link href="/account/addresses" className="block py-2 px-4 hover:bg-gray-50 rounded">
            Addresses
          </Link>
        </nav>

        <div className="md:col-span-3">
          <h2 className="text-xl font-semibold mb-4">Order History</h2>
          {orders.length === 0 ? (
            <p className="text-gray-500">No orders yet.</p>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/account/orders/${order.id}`}
                  className="block border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{order.order_number}</p>
                      <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <Badge className={ORDER_STATUS_COLORS[order.status]}>
                        {order.status}
                      </Badge>
                      <p className="font-bold mt-1">{formatCurrency(order.total)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
