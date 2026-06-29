import Link from "next/link";
import { verifyAdminSession } from "@/actions/admin-auth";
import { getAllProductsAdmin } from "@/actions/products";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteAllProductsButton } from "@/components/admin/delete-all-products-button";
import { Plus } from "lucide-react";

export default async function AdminProductsPage() {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) redirect("/admin/login");

  const products = await getAllProductsAdmin();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <div className="flex items-center gap-2">
          <DeleteAllProductsButton productCount={products.length} />
          <Link href="/admin/products/new">
            <Button variant="flipkart">
              <Plus className="h-4 w-4 mr-1" />
              Add Products
            </Button>
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3 font-medium">Barcode</th>
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Brand</th>
                <th className="text-left p-3 font-medium">Category</th>
                <th className="text-right p-3 font-medium">Cost</th>
                <th className="text-right p-3 font-medium">Price</th>
                <th className="text-right p-3 font-medium">Stock</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-500">
                    No products yet. Add your first product.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-mono text-xs">{product.barcode}</td>
                    <td className="p-3 font-medium max-w-[200px] truncate">{product.name}</td>
                    <td className="p-3">{product.brand || "-"}</td>
                    <td className="p-3">{(product.category as { name: string })?.name || "-"}</td>
                    <td className="p-3 text-right">{formatCurrency(product.cost_price)}</td>
                    <td className="p-3 text-right">{formatCurrency(product.selling_price)}</td>
                    <td className="p-3 text-right">
                      <span className={product.quantity <= 0 ? "text-red-600 font-medium" : ""}>
                        {product.quantity}
                      </span>
                    </td>
                    <td className="p-3">
                      {product.quantity <= 0 ? (
                        <Badge variant="destructive">Out of Stock</Badge>
                      ) : product.quantity <= 5 ? (
                        <Badge className="bg-yellow-100 text-yellow-800">Low Stock</Badge>
                      ) : (
                        <Badge variant="success">In Stock</Badge>
                      )}
                    </td>
                    <td className="p-3">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="text-flipkart-blue hover:underline"
                      >
                        Edit
                      </Link>
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
