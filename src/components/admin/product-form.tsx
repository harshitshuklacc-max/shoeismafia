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
import { createProduct } from "@/actions/products";
import { slugify } from "@/lib/utils";
import { toast } from "sonner";
import type { Category } from "@/types";

interface ProductFormProps {
  categories: Category[];
}

export function ProductForm({ categories }: ProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("slug", slugify(name));

    const result = await createProduct(formData);
    setLoading(false);

    if (result.success) {
      toast.success("Product created!");
      router.push("/admin/products");
    } else {
      toast.error(result.error || "Failed to create product");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="barcode">Barcode *</Label>
            <Input id="barcode" name="barcode" required />
          </div>
          <div>
            <Label htmlFor="name">Product Name *</Label>
            <Input id="name" name="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="brand">Brand</Label>
            <Input id="brand" name="brand" />
          </div>
          <div>
            <Label htmlFor="category_id">Category</Label>
            <Select name="category_id">
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
            <Input id="description" name="description" />
          </div>
          <div>
            <Label htmlFor="cost_price">Cost Price</Label>
            <Input id="cost_price" name="cost_price" type="number" step="0.01" defaultValue="0" />
          </div>
          <div>
            <Label htmlFor="selling_price">Selling Price</Label>
            <Input id="selling_price" name="selling_price" type="number" step="0.01" defaultValue="0" />
          </div>
          <div>
            <Label htmlFor="mrp">MRP</Label>
            <Input id="mrp" name="mrp" type="number" step="0.01" defaultValue="0" />
          </div>
          <div>
            <Label htmlFor="quantity">Initial Stock</Label>
            <Input id="quantity" name="quantity" type="number" defaultValue="0" />
          </div>
          <div>
            <Label htmlFor="gst_rate">GST Rate (%)</Label>
            <Input id="gst_rate" name="gst_rate" type="number" step="0.01" defaultValue="18" />
          </div>
          <div>
            <Label htmlFor="hsn_code">HSN Code</Label>
            <Input id="hsn_code" name="hsn_code" />
          </div>
          <div className="md:col-span-2 flex gap-3">
            <Button type="submit" variant="flipkart" disabled={loading}>
              {loading ? "Creating..." : "Create Product"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
