"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProductByBarcode, uploadProductImageByBarcode } from "@/actions/products";
import { formatCurrency, getPrimaryImage } from "@/lib/utils";
import { toast } from "sonner";
import { Camera, ScanBarcode, Upload, ImageIcon } from "lucide-react";
import type { Product } from "@/types";

export function ProductPhotoUploadForm() {
  const [barcode, setBarcode] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [setPrimary, setSetPrimary] = useState(true);
  const [loading, setLoading] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const lookupProduct = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    setLookingUp(true);
    const found = await getProductByBarcode(trimmed);
    setProduct(found);
    setLookingUp(false);

    if (!found) {
      toast.error(`No product found for BCN ${trimmed}`);
    }
  };

  const handleFileChange = (selected: FileList | null) => {
    if (!selected?.length) {
      setFiles([]);
      setPreviews([]);
      return;
    }

    const imageFiles = Array.from(selected).filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      toast.error("Please select image files only");
      return;
    }

    previews.forEach((url) => URL.revokeObjectURL(url));
    setFiles(imageFiles);
    setPreviews(imageFiles.map((file) => URL.createObjectURL(file)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!barcode.trim()) {
      toast.error("Enter a BCN number");
      return;
    }

    if (!product) {
      toast.error("Product not found — scan or enter a valid BCN first");
      return;
    }

    if (!files?.length) {
      toast.error("Select at least one photo");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.set("is_primary", setPrimary ? "true" : "false");
    for (const file of files) {
      formData.append("files", file);
    }

    const result = await uploadProductImageByBarcode(barcode.trim(), formData);
    setLoading(false);

    if (result.success && result.data) {
      toast.success(
        `Uploaded ${result.data.uploaded} photo(s) for ${result.data.productName}`
      );
      setBarcode("");
      setProduct(null);
      setFiles([]);
      setPreviews([]);
      setSetPrimary(true);
      if (fileInputRef.current) fileInputRef.current.value = "";
      barcodeInputRef.current?.focus();
    } else {
      toast.error(result.error || "Upload failed");
    }
  };

  const currentImage = product ? getPrimaryImage(product.product_images) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanBarcode className="h-5 w-5" />
            Upload by BCN
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="bcn">BCN / Barcode</Label>
              <Input
                ref={barcodeInputRef}
                id="bcn"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onBlur={() => lookupProduct(barcode)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    lookupProduct(barcode);
                  }
                }}
                placeholder="Scan or enter BCN number"
                className="font-mono"
              />
              {lookingUp && (
                <p className="text-xs text-gray-500 mt-1">Looking up product...</p>
              )}
            </div>

            {product && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-4">
                <div className="relative h-20 w-20 shrink-0 bg-white rounded border overflow-hidden">
                  <Image
                    src={currentImage || "/placeholder-shoe.svg"}
                    alt={product.name}
                    fill
                    className="object-contain p-1"
                  />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm">{product.name}</p>
                  <p className="text-xs text-gray-500 font-mono mt-1">BCN: {product.barcode}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatCurrency(product.selling_price)} • Stock: {product.quantity}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Current photos: {product.product_images?.length || 0}
                  </p>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="photos">Product Photos</Label>
              <Input
                ref={fileInputRef}
                id="photos"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                onChange={(e) => handleFileChange(e.target.files)}
              />
              <p className="text-xs text-gray-500 mt-1">
                JPG, PNG, WebP or GIF. You can select multiple photos at once.
              </p>
            </div>

            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {previews.map((url, index) => (
                  <div
                    key={url}
                    className="relative aspect-square rounded border bg-gray-50 overflow-hidden"
                  >
                    <Image
                      src={url}
                      alt={`Preview ${index + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ))}
              </div>
            )}

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={setPrimary}
                onChange={(e) => setSetPrimary(e.target.checked)}
                className="rounded border-gray-300"
              />
              Set first uploaded photo as main product image
            </label>

            <Button
              type="submit"
              variant="flipkart"
              className="w-full"
              disabled={loading || !product || !files?.length}
            >
              {loading ? "Uploading..." : "Upload Photos"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            How it works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="bg-flipkart-blue text-white rounded-full w-6 h-6 flex items-center justify-center shrink-0 text-xs">
                1
              </span>
              <span>Scan or type the product BCN (same number from BUSY import)</span>
            </li>
            <li className="flex gap-3">
              <span className="bg-flipkart-blue text-white rounded-full w-6 h-6 flex items-center justify-center shrink-0 text-xs">
                2
              </span>
              <span>System finds the matching product automatically</span>
            </li>
            <li className="flex gap-3">
              <span className="bg-flipkart-blue text-white rounded-full w-6 h-6 flex items-center justify-center shrink-0 text-xs">
                3
              </span>
              <span>Select one or more photos from your computer or phone</span>
            </li>
            <li className="flex gap-3">
              <span className="bg-flipkart-blue text-white rounded-full w-6 h-6 flex items-center justify-center shrink-0 text-xs">
                4
              </span>
              <span>Photos appear on the customer shop for that product</span>
            </li>
          </ol>

          <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-lg text-sm text-amber-900">
            <p className="font-medium flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Supabase storage required
            </p>
            <p className="mt-1 text-xs text-amber-800">
              Create a public <strong>products</strong> bucket in Supabase Storage if uploads fail.
            </p>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
            <ImageIcon className="h-4 w-4" />
            Tip: USB barcode scanner works the same as Restock and POS
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
