"use client";

import { useCallback, useEffect, useState } from "react";
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
import { savePrinterSettings } from "@/actions/printer-settings";
import {
  autoDetectTvsPrinter,
  isPrintServiceAvailable,
  printSetupHint,
} from "@/lib/tvs-print";
import { toast } from "sonner";
import { Printer, RefreshCw } from "lucide-react";
import type { BarcodePrinterSettings, BarcodeSymbology, LabelSize } from "@/types";

interface PrinterSettingsPanelProps {
  initialSettings: BarcodePrinterSettings;
}

export function PrinterSettingsPanel({ initialSettings }: PrinterSettingsPanelProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [printers, setPrinters] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [serviceReady, setServiceReady] = useState<boolean | null>(null);

  const scanPrinters = useCallback(async () => {
    setScanning(true);
    try {
      const ready = await isPrintServiceAvailable();
      setServiceReady(ready);
      if (!ready) {
        toast.error("Print service not running. Restart with: npm run dev");
        return;
      }
      const { printers: found, detected } = await autoDetectTvsPrinter(settings.printerName);
      setPrinters(found);
      if (detected) {
        setSettings((s) => ({ ...s, printerName: detected }));
        toast.success(`Detected: ${detected}`);
      } else if (found.length === 0) {
        toast.error("No printers found — check USB connection");
      } else {
        toast.message(`${found.length} printer(s) found — select your TVS LP 46`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Scan failed");
      setServiceReady(false);
    } finally {
      setScanning(false);
    }
  }, [settings.printerName]);

  useEffect(() => {
    isPrintServiceAvailable().then(setServiceReady).catch(() => setServiceReady(false));
  }, []);

  const handleSave = async () => {
    setLoading(true);
    const result = await savePrinterSettings(settings);
    setLoading(false);
    if (result.success) {
      toast.success("Printer settings saved");
    } else {
      toast.error(result.error || "Save failed");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Printer className="h-5 w-5" />
          TVS LP 46 DLite Plus — Barcode Printer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Direct TSPL printing to TVS LP 46 via USB. No extra software — print service runs with the app.
        </p>

        <div className="rounded-lg bg-gray-50 border p-3 text-xs text-gray-600">
          Print service:{" "}
          {serviceReady === null
            ? "Checking…"
            : serviceReady
              ? "Running (built-in)"
              : "Not running — restart with npm run dev"}
          {!serviceReady && serviceReady !== null && (
            <p className="mt-1">{printSetupHint()}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={scanPrinters} disabled={scanning}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Auto-detect TVS Printer
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Default Printer</Label>
            {printers.length > 0 ? (
              <Select
                value={settings.printerName || undefined}
                onValueChange={(v) => setSettings((s) => ({ ...s, printerName: v }))}
              >
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
                value={settings.printerName}
                onChange={(e) => setSettings((s) => ({ ...s, printerName: e.target.value }))}
                placeholder="TVS LP 46 DLite Plus"
              />
            )}
          </div>

          <div>
            <Label>Connection</Label>
            <Select
              value={settings.connectionType}
              onValueChange={(v) =>
                setSettings((s) => ({ ...s, connectionType: v as BarcodePrinterSettings["connectionType"] }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="usb">USB (default)</SelectItem>
                <SelectItem value="ethernet">Ethernet</SelectItem>
                <SelectItem value="serial">Serial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Label Size</Label>
            <Select
              value={settings.labelSize}
              onValueChange={(v) => setSettings((s) => ({ ...s, labelSize: v as LabelSize }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50x25">50 × 25 mm</SelectItem>
                <SelectItem value="100x50">100 × 50 mm</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Barcode Type</Label>
            <Select
              value={settings.barcodeType}
              onValueChange={(v) =>
                setSettings((s) => ({ ...s, barcodeType: v as BarcodeSymbology }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="128">Code 128 (default)</SelectItem>
                <SelectItem value="EAN13">EAN-13</SelectItem>
                <SelectItem value="EAN8">EAN-8</SelectItem>
                <SelectItem value="UPCA">UPC-A</SelectItem>
                <SelectItem value="39">Code 39</SelectItem>
                <SelectItem value="QRCODE">QR Code</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Default Copies</Label>
            <Input
              type="number"
              min={1}
              max={500}
              value={settings.copiesDefault}
              onChange={(e) =>
                setSettings((s) => ({ ...s, copiesDefault: parseInt(e.target.value, 10) || 1 }))
              }
            />
          </div>

          <div className="flex flex-col gap-2 justify-end">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.showLogo}
                onChange={(e) => setSettings((s) => ({ ...s, showLogo: e.target.checked }))}
              />
              Show Shoe Mafia logo text
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.showMrp}
                onChange={(e) => setSettings((s) => ({ ...s, showMrp: e.target.checked }))}
              />
              Show MRP on label
            </label>
          </div>
        </div>

        <Button type="button" variant="flipkart" onClick={handleSave} disabled={loading}>
          {loading ? "Saving…" : "Save Printer Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
