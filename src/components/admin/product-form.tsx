"use client";

import { useCallback, useEffect, useState } from "react";
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
import { BarcodePreview } from "@/components/admin/barcode-preview";
import { createProductsBulk, generateNextBcnRange } from "@/actions/products";
import { downloadBarcodePng, downloadBarcodesPdf } from "@/lib/barcode-label";
import { toast } from "sonner";
import { Download, Plus, Trash2 } from "lucide-react";
import type { Category, CreatedProductBarcode } from "@/types";

interface ProductFormProps {
  categories: Category[];
}

interface ProductRow {
  key: string;
  name: string;
  brand: string;
  cost_price: string;
  selling_price: string;
  mrp: string;
  quantity: string;
  previewBcn: string;
}

function emptyRow(previewBcn = ""): ProductRow {
  return {
    key: crypto.randomUUID(),
    name: "",
    brand: "",
    cost_price: "0",
    selling_price: "0",
    mrp: "0",
    quantity: "0",
    previewBcn,
  };
}

export function ProductForm({ categories }: ProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [gstRate, setGstRate] = useState("18");
  const [hsnCode, setHsnCode] = useState("");
  const [rows, setRows] = useState<ProductRow[]>([emptyRow()]);
  const [createdProducts, setCreatedProducts] = useState<CreatedProductBarcode[]>([]);

  const refreshPreviewBcns = useCallback(async (rowCount: number) => {
    const bcns = await generateNextBcnRange(rowCount);
    setRows((prev) =>
      prev.map((row, index) => ({
        ...row,
        previewBcn: bcns[index] || row.previewBcn,
      }))
    );
  }, []);

  useEffect(() => {
    refreshPreviewBcns(rows.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length, refreshPreviewBcns]);

  const updateRow = (key: string, field: keyof ProductRow, value: string) => {
    setRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, [field]: value } : row))
    );
  };

  const addRow = () => {
    if (rows.length >= 50) {
      toast.error("Maximum 50 products at once");
      return;
    }
    setRows((prev) => [...prev, emptyRow()]);
  };

  const removeRow = (key: string) => {
    if (rows.length === 1) return;
    setRows((prev) => prev.filter((row) => row.key !== key));
  };

  const handleDownloadRow = (row: ProductRow) => {
    if (!row.previewBcn) return;
    downloadBarcodePng(row.previewBcn, row.name.trim() || "product");
    toast.success("Barcode downloaded");
  };

  const handleDownloadAllPreview = async () => {
    const items = rows
      .filter((row) => row.previewBcn)
      .map((row) => ({
        barcode: row.previewBcn,
        name: row.name.trim() || `Product ${row.previewBcn}`,
      }));
    if (items.length === 0) return;
    await downloadBarcodesPdf(items, "bcn-labels-preview.pdf");
    toast.success("All barcodes downloaded");
  };

  const handleDownloadCreated = async () => {
    if (createdProducts.length === 0) return;
    await downloadBarcodesPdf(createdProducts, "product-barcodes.pdf");
    toast.success("Barcodes PDF downloaded");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = rows.filter((row) => row.name.trim());
    if (validRows.length === 0) {
      toast.error("Enter at least one product name");
      return;
    }

    setLoading(true);
    const result = await createProductsBulk(
      validRows.map((row) => ({
        name: row.name.trim(),
        brand: row.brand.trim() || undefined,
        category_id: categoryId || undefined,
        cost_price: parseFloat(row.cost_price) || 0,
        selling_price: parseFloat(row.selling_price) || 0,
        mrp: parseFloat(row.mrp) || parseFloat(row.selling_price) || 0,
        quantity: parseInt(row.quantity, 10) || 0,
        gst_rate: parseFloat(gstRate) || 18,
        hsn_code: hsnCode.trim() || undefined,
        barcode: row.previewBcn,
      }))
    );
    setLoading(false);

    if (result.success && result.data) {
      setCreatedProducts(result.data.products);
      toast.success(`${result.data.products.length} product(s) created!`);
      await downloadBarcodesPdf(result.data.products, "product-barcodes.pdf");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to create products");
    }
  };

  const handleAddMore = () => {
    setCreatedProducts([]);
    setRows([emptyRow()]);
  };

  if (createdProducts.length > 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Products Created — Download Barcodes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            {createdProducts.length} product(s) saved. Barcode PDF was downloaded automatically.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {createdProducts.map((product) => (
              <div key={product.id} className="border rounded-lg p-3 bg-gray-50">
                <p className="font-medium text-sm truncate">{product.name}</p>
                <p className="text-xs font-mono text-gray-500 mb-2">BCN: {product.barcode}</p>
                <BarcodePreview code={product.barcode} className="max-w-full h-auto bg-white border rounded-sm" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => downloadBarcodePng(product.barcode, product.name)}
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Download PNG
                </Button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="flipkart" onClick={handleDownloadCreated}>
              <Download className="h-4 w-4 mr-1" />
              Download All (PDF)
            </Button>
            <Button type="button" variant="outline" onClick={handleAddMore}>
              Add More Products
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/admin/products")}>
              View Products List
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Shared Settings</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Category</Label>
            <Select value={categoryId || undefined} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="gst_rate">GST Rate (%)</Label>
            <Input
              id="gst_rate"
              type="number"
              step="0.01"
              value={gstRate}
              onChange={(e) => setGstRate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="hsn_code">HSN Code</Label>
            <Input
              id="hsn_code"
              value={hsnCode}
              onChange={(e) => setHsnCode(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Add Products (Bulk)</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              BCN auto-generates as scannable CODE128 barcode — download anytime before or after save
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleDownloadAllPreview}>
            <Download className="h-4 w-4 mr-1" />
            Download All Labels
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-2 font-medium w-8">#</th>
                  <th className="text-left p-2 font-medium min-w-[160px]">Product Name *</th>
                  <th className="text-left p-2 font-medium min-w-[100px]">Brand</th>
                  <th className="text-left p-2 font-medium w-24">Cost</th>
                  <th className="text-left p-2 font-medium w-24">Sell</th>
                  <th className="text-left p-2 font-medium w-24">MRP</th>
                  <th className="text-left p-2 font-medium w-20">Stock</th>
                  <th className="text-left p-2 font-medium w-24">BCN</th>
                  <th className="text-left p-2 font-medium min-w-[190px]">Barcode</th>
                  <th className="p-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.key} className="border-b align-top">
                    <td className="p-2 text-gray-500">{index + 1}</td>
                    <td className="p-2">
                      <Input
                        value={row.name}
                        onChange={(e) => updateRow(row.key, "name", e.target.value)}
                        placeholder="Product name"
                        required={index === 0}
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={row.brand}
                        onChange={(e) => updateRow(row.key, "brand", e.target.value)}
                        placeholder="Brand"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={row.cost_price}
                        onChange={(e) => updateRow(row.key, "cost_price", e.target.value)}
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={row.selling_price}
                        onChange={(e) => updateRow(row.key, "selling_price", e.target.value)}
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={row.mrp}
                        onChange={(e) => updateRow(row.key, "mrp", e.target.value)}
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        value={row.quantity}
                        onChange={(e) => updateRow(row.key, "quantity", e.target.value)}
                      />
                    </td>
                    <td className="p-2">
                      <Input value={row.previewBcn} readOnly className="font-mono text-xs bg-gray-50" />
                    </td>
                    <td className="p-2">
                      <div className="flex flex-col items-start gap-1">
                        <BarcodePreview code={row.previewBcn} />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleDownloadRow(row)}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          PNG
                        </Button>
                      </div>
                    </td>
                    <td className="p-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500"
                        onClick={() => removeRow(row.key)}
                        disabled={rows.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button type="button" variant="outline" onClick={addRow}>
            <Plus className="h-4 w-4 mr-1" />
            Add Another Product
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="flipkart" disabled={loading}>
          {loading ? "Creating..." : `Create ${rows.filter((r) => r.name.trim()).length || ""} Product(s)`}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
