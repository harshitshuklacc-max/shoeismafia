"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getPrinterSettings } from "@/actions/printer-settings";
import { buildTsplBatch, buildTsplLabel, BATCH_PRINT_PRESETS, validateBarcodeForSymbology } from "@/lib/tspl";
import {
  autoDetectTvsPrinter,
  downloadTsplFile,
  printRawTspl,
} from "@/lib/qz-label-print";
import { toast } from "sonner";
import { Printer } from "lucide-react";
import type { BarcodePrinterSettings, BarcodeSymbology, LabelProductData, LabelSize } from "@/types";

interface LabelPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: LabelProductData[];
  title?: string;
}

export function LabelPrintDialog({
  open,
  onOpenChange,
  products,
  title = "Print Barcode Labels",
}: LabelPrintDialogProps) {
  const [settings, setSettings] = useState<BarcodePrinterSettings | null>(null);
  const [printerName, setPrinterName] = useState("");
  const [printers, setPrinters] = useState<string[]>([]);
  const [labelSize, setLabelSize] = useState<LabelSize>("50x25");
  const [barcodeType, setBarcodeType] = useState<BarcodeSymbology>("128");
  const [copies, setCopies] = useState(1);
  const [customCopies, setCustomCopies] = useState("");
  const [showLogo, setShowLogo] = useState(true);
  const [showMrp, setShowMrp] = useState(true);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!open) return;
    getPrinterSettings().then(async (saved) => {
      setSettings(saved);
      setLabelSize(saved.labelSize);
      setBarcodeType(saved.barcodeType);
      setCopies(saved.copiesDefault);
      setShowLogo(saved.showLogo);
      setShowMrp(saved.showMrp);
      try {
        const { printers: found, detected } = await autoDetectTvsPrinter(saved.printerName);
        setPrinters(found);
        setPrinterName(detected || saved.printerName || "");
      } catch {
        setPrinterName(saved.printerName);
      }
    });
  }, [open]);

  const effectiveCopies = customCopies.trim()
    ? parseInt(customCopies, 10) || 1
    : copies;

  const handlePrint = async () => {
    if (!printerName.trim()) {
      toast.error("Select a printer in Settings or scan for TVS LP 46");
      return;
    }
    if (products.length === 0) {
      toast.error("No products to print");
      return;
    }

    for (const p of products) {
      const err = validateBarcodeForSymbology(p.barcode, barcodeType);
      if (err) {
        toast.error(`${p.name}: ${err}`);
        return;
      }
    }

    const opts = {
      labelSize,
      barcodeType,
      showLogo,
      showMrp,
      copies: Math.min(Math.max(effectiveCopies, 1), 500),
    };

    const tspl =
      products.length === 1
        ? buildTsplLabel(products[0], opts)
        : buildTsplBatch(products, opts);

    setPrinting(true);
    try {
      const result = await printRawTspl(printerName, tspl);
      toast.success(
        `Sent ${products.length} label(s) × ${opts.copies} to ${printerName} via ${result.method.toUpperCase()}`
      );
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Print failed");
      downloadTsplFile(tspl, "labels.tspl");
      toast.message("TSPL file downloaded — send via QZ Tray or print agent");
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <p className="text-gray-600">
            {products.length} product(s) · TVS LP 46 DLite Plus · TSPL direct print
          </p>

          <div>
            <Label>Printer</Label>
            {printers.length > 0 ? (
              <Select value={printerName || undefined} onValueChange={setPrinterName}>
                <SelectTrigger>
                  <SelectValue placeholder="Select printer" />
                </SelectTrigger>
                <SelectContent>
                  {printers.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={printerName}
                onChange={(e) => setPrinterName(e.target.value)}
                placeholder="TVS LP 46 DLite Plus"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Label size</Label>
              <Select value={labelSize} onValueChange={(v) => setLabelSize(v as LabelSize)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50x25">50×25 mm</SelectItem>
                  <SelectItem value="100x50">100×50 mm</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Barcode</Label>
              <Select value={barcodeType} onValueChange={(v) => setBarcodeType(v as BarcodeSymbology)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="128">Code 128</SelectItem>
                  <SelectItem value="EAN13">EAN-13</SelectItem>
                  <SelectItem value="EAN8">EAN-8</SelectItem>
                  <SelectItem value="UPCA">UPC-A</SelectItem>
                  <SelectItem value="39">Code 39</SelectItem>
                  <SelectItem value="QRCODE">QR Code</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Quantity</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {BATCH_PRINT_PRESETS.map((n) => (
                <Button
                  key={n}
                  type="button"
                  size="sm"
                  variant={copies === n && !customCopies ? "default" : "outline"}
                  onClick={() => {
                    setCopies(n);
                    setCustomCopies("");
                  }}
                >
                  {n}
                </Button>
              ))}
            </div>
            <Input
              className="mt-2"
              type="number"
              min={1}
              max={500}
              placeholder="Custom quantity"
              value={customCopies}
              onChange={(e) => setCustomCopies(e.target.value)}
            />
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={showLogo} onChange={(e) => setShowLogo(e.target.checked)} />
              Logo
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={showMrp} onChange={(e) => setShowMrp(e.target.checked)} />
              MRP
            </label>
          </div>

          {settings && (
            <p className="text-xs text-gray-500">
              Default from Settings: {settings.printerName || "not set"}
            </p>
          )}

          <Button
            type="button"
            variant="flipkart"
            className="w-full"
            disabled={printing}
            onClick={handlePrint}
          >
            {printing ? "Sending to printer…" : `Print ${effectiveCopies} label(s) now`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
