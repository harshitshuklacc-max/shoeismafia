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
import { createParty } from "@/actions/parties";
import { downloadBarcodePng, downloadBarcodesPdf, printBarcodeLabelsWithSettings } from "@/lib/barcode-label";
import { printLabelsDirect } from "@/lib/label-print";
import { parseSizeColorFromName } from "@/lib/label-data";
import { PrintLabelButton } from "@/components/admin/print-label-button";
import { toast } from "sonner";
import { Download, Plus, Printer, Trash2 } from "lucide-react";
import type { Category, CreatedProductBarcode, LabelProductData, Party } from "@/types";

interface ProductFormProps {
  categories: Category[];
  parties: Party[];
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

function cloneRowFrom(source: ProductRow): ProductRow {
  return {
    key: crypto.randomUUID(),
    name: source.name,
    brand: source.brand,
    cost_price: source.cost_price,
    selling_price: source.selling_price,
    mrp: source.mrp,
    quantity: source.quantity,
    previewBcn: "",
  };
}

function rowToLabelData(row: ProductRow): LabelProductData {
  const parsed = parseSizeColorFromName(row.name);
  return {
    name: row.name.trim() || `Product ${row.previewBcn}`,
    barcode: row.previewBcn,
    sku: row.previewBcn,
    size: parsed.size,
    color: parsed.color,
    sellingPrice: parseFloat(row.selling_price) || 0,
    mrp: parseFloat(row.mrp) || parseFloat(row.selling_price) || 0,
  };
}

function createdToPrintItem(product: CreatedProductBarcode): LabelProductData {
  const parsed = parseSizeColorFromName(product.name);
  return {
    name: product.name,
    barcode: product.barcode,
    sku: product.barcode,
    size: parsed.size,
    color: parsed.color,
    sellingPrice: product.selling_price,
    mrp: product.mrp,
  };
}

export function ProductForm({ categories, parties: initialParties }: ProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [gstRate, setGstRate] = useState("18");
  const [hsnCode, setHsnCode] = useState("");
  const [partyName, setPartyName] = useState("");
  const [newPartyName, setNewPartyName] = useState("");
  const [parties, setParties] = useState(initialParties);
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
    setRows((prev) => {
      const last = prev[prev.length - 1];
      return [...prev, last ? cloneRowFrom(last) : emptyRow()];
    });
  };

  const removeRow = (key: string) => {
    if (rows.length === 1) return;
    setRows((prev) => prev.filter((row) => row.key !== key));
  };

  const handleAddParty = async () => {
    if (!newPartyName.trim()) {
      toast.error("Enter party name");
      return;
    }
    const result = await createParty(newPartyName);
    if (result.success && result.data) {
      setParties((prev) => [...prev, result.data!].sort((a, b) => a.name.localeCompare(b.name)));
      setPartyName(result.data.name);
      setNewPartyName("");
      toast.success("Party added");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to add party");
    }
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

  const printToTvs = async (items: ReturnType<typeof rowToLabelData>[]) => {
    try {
      const result = await printLabelsDirect(items);
      toast.success(`Sent ${result.count} label(s) to TVS LP 46`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "TVS print failed");
      try {
        await printBarcodeLabelsWithSettings(items);
        toast.message("Fallback: Chrome print opened — select TVS LP 46, scale 100%");
      } catch {
        // ignore
      }
    }
  };

  const handlePrintRow = async (row: ProductRow) => {
    if (!row.previewBcn) return;
    await printToTvs([rowToLabelData(row)]);
  };

  const handlePrintAllPreview = async () => {
    const items = rows
      .filter((row) => row.previewBcn && row.name.trim())
      .map(rowToLabelData);
    if (items.length === 0) {
      toast.error("Add at least one product with a name");
      return;
    }
    await printToTvs(items);
  };

  const handlePrintAllCreated = async () => {
    if (createdProducts.length === 0) return;
    await printToTvs(createdProducts.map(createdToPrintItem));
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
      })),
      partyName || undefined
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
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Products Created — Print Barcodes</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              PDF downloaded automatically. Print all aligned labels directly to TVS LP 46 DLite Plus.
            </p>
          </div>
          <Button type="button" variant="flipkart" onClick={handlePrintAllCreated}>
            <Printer className="h-4 w-4 mr-1" />
            Print All to TVS
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            {createdProducts.length} product(s) saved.
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
                <PrintLabelButton
                  product={{
                    name: product.name,
                    barcode: product.barcode,
                    sellingPrice: product.selling_price,
                    mrp: product.mrp,
                  }}
                  quickPrint
                  label="TVS Print"
                  variant="flipkart"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full mt-1"
                  onClick={() => printToTvs([createdToPrintItem(product)])}
                >
                  <Printer className="h-3.5 w-3.5 mr-1" />
                  Print to TVS
                </Button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="flipkart" onClick={handlePrintAllCreated}>
              <Printer className="h-4 w-4 mr-1" />
              Print All to TVS
            </Button>
            <Button type="button" variant="outline" onClick={handleDownloadCreated}>
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
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <Label>Received From (Party)</Label>
            <Select value={partyName || undefined} onValueChange={setPartyName}>
              <SelectTrigger>
                <SelectValue placeholder="Select supplier / party" />
              </SelectTrigger>
              <SelectContent>
                {parties.map((party) => (
                  <SelectItem key={party.id} value={party.name}>
                    {party.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2 mt-2">
              <Input
                value={newPartyName}
                onChange={(e) => setNewPartyName(e.target.value)}
                placeholder="Add new party name"
              />
              <Button type="button" variant="outline" onClick={handleAddParty}>
                Add
              </Button>
            </div>
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
              BCN auto-generates as scannable CODE128. Add Another Product copies the row above — edit as needed.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="flipkart" size="sm" onClick={handlePrintAllPreview}>
              <Printer className="h-4 w-4 mr-1" />
              Print All to TVS
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleDownloadAllPreview}>
              <Download className="h-4 w-4 mr-1" />
              Download All (PDF)
            </Button>
          </div>
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
                  <th className="text-left p-2 font-medium min-w-[190px]">Barcode / Print</th>
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
                        <div className="flex flex-wrap gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => handlePrintRow(row)}
                            disabled={!row.previewBcn}
                          >
                            <Printer className="h-3 w-3 mr-1" />
                            TVS
                          </Button>
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
                        {row.previewBcn && row.name.trim() && (
                          <PrintLabelButton
                            product={rowToLabelData(row)}
                            quickPrint
                            label="TVS"
                            variant="ghost"
                            size="sm"
                          />
                        )}
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
            Add Another Product (copies row above)
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
