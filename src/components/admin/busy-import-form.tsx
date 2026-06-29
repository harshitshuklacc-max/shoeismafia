"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { importBusyBatch, finalizeBusyImport } from "@/actions/inventory";
import { parseBusyFile } from "@/lib/busy-parser";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, FileText, FileType2 } from "lucide-react";
import type { BusyImportRow } from "@/types";

const BATCH_SIZE = 50;

export function BusyImportForm() {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<BusyImportRow[]>([]);
  const [allRows, setAllRows] = useState<BusyImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState("");
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    setFileType(ext);
    setLoading(true);
    setProgress(0);
    setProgressLabel("");

    try {
      const rows = await parseBusyFile(file);
      setAllRows(rows);
      setPreview(rows.slice(0, 10));

      if (rows.length === 0) {
        toast.error("No valid product rows found in file");
      } else {
        toast.success(`Found ${rows.length} products ready to import`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to parse file");
      setAllRows([]);
      setPreview([]);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (allRows.length === 0) {
      toast.error("No data to import");
      return;
    }

    setLoading(true);
    setProgress(0);

    let totalImported = 0;
    let totalFailed = 0;
    const totalBatches = Math.ceil(allRows.length / BATCH_SIZE);

    try {
      for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const batch = allRows.slice(i, i + BATCH_SIZE);

        setProgressLabel(`Importing batch ${batchNumber} of ${totalBatches}...`);
        setProgress(Math.round((i / allRows.length) * 100));

        const result = await importBusyBatch(batch, fileName);

        if (!result.success || !result.data) {
          await finalizeBusyImport(
            fileName,
            fileType,
            allRows.length,
            totalImported,
            totalFailed + (allRows.length - i)
          );
          toast.error(result.error || `Import stopped at batch ${batchNumber}`);
          return;
        }

        totalImported += result.data.imported;
        totalFailed += result.data.failed;
        setProgress(Math.round(((i + batch.length) / allRows.length) * 100));
      }

      await finalizeBusyImport(fileName, fileType, allRows.length, totalImported, totalFailed);

      toast.success(`Imported ${totalImported} products (${totalFailed} failed)`);
      setPreview([]);
      setAllRows([]);
      setFileName("");
      setFileType("");
      setProgress(0);
      setProgressLabel("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import from BUSY
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <input
              ref={fileRef}
              id="busy-file"
              type="file"
              accept=".csv,.xls,.xlsx,.pdf"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <label htmlFor="busy-file" className="cursor-pointer">
              <div className="flex justify-center gap-4 mb-4">
                <FileSpreadsheet className="h-10 w-10 text-green-600" />
                <FileText className="h-10 w-10 text-blue-600" />
                <FileType2 className="h-10 w-10 text-red-600" />
              </div>
              <p className="font-medium">Drop file or click to upload</p>
              <p className="text-sm text-gray-500 mt-1">
                Supports CSV, Excel (XLS/XLSX), and PDF
              </p>
            </label>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            <p className="font-medium mb-2">Expected BUSY BCN Stock Details format:</p>
            <p>
              Item Details, BCN, P1 (ART NO), P2 (Size), P3 (Colour), Sales Price, Unit,
              Op. Qty., Qty. In, Qty. Out, Cl. Qty.
            </p>
            <p className="mt-1 text-xs">
              Large imports are uploaded in batches of {BATCH_SIZE} so they work on Vercel without timing out.
            </p>
          </div>

          {loading && !allRows.length && (
            <p className="mt-4 text-sm text-flipkart-blue">Parsing file...</p>
          )}

          {fileName && allRows.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium">File: {fileName}</p>
              <p className="text-sm text-gray-500">
                {allRows.length} products found • Showing preview of first {Math.min(preview.length, 10)}
              </p>
            </div>
          )}

          {loading && progressLabel && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-flipkart-blue">{progressLabel}</p>
              <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full bg-flipkart-blue"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">{progress}% complete</p>
            </div>
          )}

          {preview.length > 0 && (
            <>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-xs border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left">BCN</th>
                      <th className="p-2 text-left">Art No</th>
                      <th className="p-2 text-left">Size</th>
                      <th className="p-2 text-left">Colour</th>
                      <th className="p-2 text-right">Sales Price</th>
                      <th className="p-2 text-left">Unit</th>
                      <th className="p-2 text-right">Cl. Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2 font-mono">{row.barcode}</td>
                        <td className="p-2">{row.art_no || row.name}</td>
                        <td className="p-2">{row.size || "-"}</td>
                        <td className="p-2">{row.colour || "-"}</td>
                        <td className="p-2 text-right">{row.selling_price}</td>
                        <td className="p-2">{row.unit || "PAIR"}</td>
                        <td className="p-2 text-right">{row.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button
                variant="flipkart"
                className="mt-4"
                disabled={loading}
                onClick={handleImport}
              >
                {loading ? "Importing..." : `Import All ${allRows.length} Records`}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
