import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { getOrder } from "@/actions/orders";
import { formatCurrency, formatDateTime, ORDER_STATUS_COLORS } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const order = await getOrder(id);
  if (!order || order.customer_id !== user.id) notFound();

  const address = order.shipping_address as {
    full_name?: string;
    address_line1?: string;
    city?: string;
    state?: string;
    pincode?: string;
    phone?: string;
  } | null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link href="/account" className="text-flipkart-blue hover:underline text-sm mb-4 inline-block">
        ← Back to Orders
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{order.order_number}</h1>
          <p className="text-gray-500 text-sm">{formatDateTime(order.created_at)}</p>
        </div>
        <Badge className={ORDER_STATUS_COLORS[order.status]}>{order.status}</Badge>
      </div>

      <div className="space-y-6">
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-3">Items</h2>
          {(order.order_items || []).map((item) => (
            <div key={item.id} className="flex justify-between py-2 border-b last:border-0">
              <div>
                <p className="font-medium">{item.product_name}</p>
                <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
              </div>
              <p className="font-medium">{formatCurrency(item.total_price)}</p>
            </div>
          ))}
        </div>

        {address && (
          <div className="border rounded-lg p-4">
            <h2 className="font-semibold mb-3">Delivery Address</h2>
            <p>{address.full_name}</p>
            <p className="text-gray-600">{address.address_line1}</p>
            <p className="text-gray-600">{address.city}, {address.state} - {address.pincode}</p>
            <p className="text-gray-500 text-sm">{address.phone}</p>
          </div>
        )}

        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-3">Payment</h2>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Method</span>
              <span>{order.payment_method}</span>
            </div>
            <div className="flex justify-between">
              <span>Status</span>
              <span>{order.payment_status}</span>
            </div>
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-{formatCurrency(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>{order.shipping === 0 ? "FREE" : formatCurrency(order.shipping)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
