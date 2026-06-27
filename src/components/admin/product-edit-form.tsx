"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateProduct, deleteProduct } from "@/actions/products";
import { toast } from "sonner";
import type { Category, Product } from "@/types";

interface ProductEditFormProps {
  product: Product;
  categories: Category[];
}

export function ProductEditForm({ product, categories }: ProductEditFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await updateProduct(product.id, formData);
    setLoading(false);

    if (result.success) {
      toast.success("Product updated!");
      router.push("/admin/products");
    } else {
      toast.error(result.error || "Failed to update");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this product?")) return;
    setLoading(true);
    const result = await deleteProduct(product.id);
    setLoading(false);
    if (result.success) {
      toast.success("Product deleted");
      router.push("/admin/products");
    } else {
      toast.error(result.error || "Failed to delete");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{product.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Barcode</Label>
            <Input value={product.barcode} disabled />
          </div>
          <div>
            <Label htmlFor="name">Product Name</Label>
            <Input id="name" name="name" defaultValue={product.name} required />
          </div>
          <div>
            <Label htmlFor="brand">Brand</Label>
            <Input id="brand" name="brand" defaultValue={product.brand || ""} />
          </div>
          <div>
            <Label htmlFor="category_id">Category</Label>
            <Select name="category_id" defaultValue={product.category_id || undefined}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" defaultValue={product.description || ""} />
          </div>
          <div>
            <Label htmlFor="cost_price">Cost Price</Label>
            <Input id="cost_price" name="cost_price" type="number" step="0.01" defaultValue={product.cost_price} />
          </div>
          <div>
            <Label htmlFor="selling_price">Selling Price</Label>
            <Input id="selling_price" name="selling_price" type="number" step="0.01" defaultValue={product.selling_price} />
          </div>
          <div>
            <Label htmlFor="mrp">MRP</Label>
            <Input id="mrp" name="mrp" type="number" step="0.01" defaultValue={product.mrp} />
          </div>
          <div>
            <Label htmlFor="quantity">Stock</Label>
            <Input id="quantity" name="quantity" type="number" defaultValue={product.quantity} />
          </div>
          <div className="md:col-span-2 flex gap-3">
            <Button type="submit" variant="flipkart" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
              Delete
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
