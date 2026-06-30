"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
import { PrintLabelButton } from "@/components/admin/print-label-button";
import { toast } from "sonner";
import type { Category, Product } from "@/types";

interface ProductEditFormProps {
  product: Product;
  categories: Category[];
}

export function ProductEditForm({ product, categories }: ProductEditFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const primaryImage = product.product_images?.find((img) => img.is_primary)?.image_url
    || product.product_images?.[0]?.image_url;

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
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <CardTitle>{product.name}</CardTitle>
        <div className="flex gap-2 shrink-0">
          <PrintLabelButton product={product} quickPrint label="Print Label" />
          <PrintLabelButton product={product} label="Options" />
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>BCN / Barcode</Label>
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
          <div className="md:col-span-2">
            <Label>Current Image</Label>
            {primaryImage ? (
              <div className="mt-2 relative h-32 w-32 rounded-lg overflow-hidden border">
                <Image src={primaryImage} alt={product.name} fill className="object-cover" />
              </div>
            ) : (
              <p className="text-sm text-gray-500 mt-1">No image uploaded</p>
            )}
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="image">Upload New Image</Label>
            <Input id="image" name="image" type="file" accept="image/*" />
            <p className="text-xs text-gray-500 mt-1">New image becomes the primary product photo</p>
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
