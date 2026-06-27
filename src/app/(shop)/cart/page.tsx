import Link from "next/link";
import Image from "next/image";
import { getCartItems } from "@/actions/cart";
import { formatCurrency, getPrimaryImage, isOutOfStock } from "@/lib/utils";
import { CartActions } from "@/components/cart/cart-actions";
import { Button } from "@/components/ui/button";

export default async function CartPage() {
  const cartItems = await getCartItems();

  const subtotal = cartItems.reduce((sum, item) => {
    const price = item.product?.selling_price || 0;
    return sum + price * item.quantity;
  }, 0);

  const shipping = subtotal >= 999 ? 0 : subtotal > 0 ? 49 : 0;
  const total = subtotal + shipping;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Shopping Cart</h1>

      {cartItems.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg mb-4">Your cart is empty</p>
          <Link href="/products">
            <Button variant="flipkart">Continue Shopping</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => {
              const product = item.product!;
              const outOfStock = isOutOfStock(product.quantity);
              return (
                <div
                  key={item.id}
                  className="flex gap-4 bg-white border rounded-lg p-4"
                >
                  <div className="relative w-24 h-24 shrink-0 bg-gray-50 rounded">
                    <Image
                      src={getPrimaryImage(product.product_images)}
                      alt={product.name}
                      fill
                      className="object-contain p-2"
                    />
                  </div>
                  <div className="flex-1">
                    <Link
                      href={`/products/${product.slug}`}
                      className="font-medium hover:text-flipkart-blue"
                    >
                      {product.name}
                    </Link>
                    {outOfStock && (
                      <p className="text-red-600 text-sm mt-1">Out of Stock</p>
                    )}
                    <p className="text-lg font-bold mt-2">
                      {formatCurrency(product.selling_price)}
                    </p>
                    <CartActions
                      cartItemId={item.id}
                      quantity={item.quantity}
                      maxQuantity={product.quantity}
                    />
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      {formatCurrency(product.selling_price * item.quantity)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white border rounded-lg p-6 h-fit sticky top-24">
            <h2 className="font-semibold text-lg mb-4">Price Details</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal ({cartItems.length} items)</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{shipping === 0 ? "FREE" : formatCurrency(shipping)}</span>
              </div>
              {subtotal > 0 && subtotal < 999 && (
                <p className="text-green-600 text-xs">
                  Add {formatCurrency(999 - subtotal)} more for free shipping
                </p>
              )}
              <div className="border-t pt-2 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
            <Link href="/checkout" className="block mt-6">
              <Button variant="flipkart" className="w-full" size="lg">
                Proceed to Checkout
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
