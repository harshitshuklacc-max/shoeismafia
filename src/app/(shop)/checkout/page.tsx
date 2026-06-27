import { redirect } from "next/navigation";
import { getCartItems } from "@/actions/cart";
import { getAddresses } from "@/actions/addresses";
import { getCurrentUser } from "@/actions/auth";
import { CheckoutForm } from "@/components/checkout/checkout-form";

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/checkout");

  const [cartItems, addresses] = await Promise.all([
    getCartItems(),
    getAddresses(),
  ]);

  if (cartItems.length === 0) redirect("/cart");

  const subtotal = cartItems.reduce((sum, item) => {
    return sum + (item.product?.selling_price || 0) * item.quantity;
  }, 0);
  const shipping = subtotal >= 999 ? 0 : 49;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Checkout</h1>
      <CheckoutForm
        cartItems={cartItems}
        addresses={addresses}
        subtotal={subtotal}
        shipping={shipping}
      />
    </div>
  );
}
