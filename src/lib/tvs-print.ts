"use client";

import { TVS_PRINTER_PATTERNS } from "@/lib/tspl";

const AGENT_BASE = "http://127.0.0.1:9283";

export function detectTvsPrinter(
  printers: string[],
  savedName?: string
): string | null {
  if (savedName && printers.includes(savedName)) return savedName;

  for (const pattern of TVS_PRINTER_PATTERNS) {
    const match = printers.find((p) => pattern.test(p));
    if (match) return match;
  }

  return printers[0] || null;
}

export async function isPrintServiceAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${AGENT_BASE}/health`, {
      signal: AbortSignal.timeout(2500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** @deprecated use isPrintServiceAvailable */
export const isQzAvailable = isPrintServiceAvailable;

export async function listInstalledPrinters(): Promise<string[]> {
  const res = await fetch(`${AGENT_BASE}/printers`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error ||
        "Print service not running. Run: npm run dev"
    );
  }
  const data = (await res.json()) as { printers?: string[] };
  return data.printers || [];
}

export async function autoDetectTvsPrinter(savedName?: string): Promise<{
  printers: string[];
  detected: string | null;
}> {
  const res = await fetch(`${AGENT_BASE}/printers`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    throw new Error("Print service not running. Restart with: npm run dev");
  }
  const data = (await res.json()) as { printers?: string[]; detected?: string | null };
  const printers = data.printers || [];
  return {
    printers,
    detected: detectTvsPrinter(printers, savedName) || data.detected || null,
  };
}

export async function printRawTspl(
  printerName: string,
  tspl: string
): Promise<{ method: "agent" }> {
  const res = await fetch(`${AGENT_BASE}/print`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ printerName, tspl }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error || "Print failed — check TVS printer is on and selected in Settings"
    );
  }

  return { method: "agent" };
}

export function downloadTsplFile(tspl: string, filename = "label.tspl"): void {
  const blob = new Blob([tspl], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function printSetupHint(): string {
  return "Print service runs automatically with npm run dev. Plug in TVS LP 46 via USB, then click Auto-detect TVS Printer.";
}

/** @deprecated */
export const qzSetupHint = printSetupHint;
