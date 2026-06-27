import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { getWishlistItems } from "@/actions/wishlist";
import { ProductCard } from "@/components/products/product-card";

export default async function WishlistPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/wishlist");

  const items = await getWishlistItems();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">My Wishlist</h1>
      {items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg mb-4">Your wishlist is empty</p>
          <Link href="/products" className="text-flipkart-blue hover:underline">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {items.map((item) => (
            <ProductCard key={item.id} product={item.product!} />
          ))}
        </div>
      )}
    </div>
  );
}
