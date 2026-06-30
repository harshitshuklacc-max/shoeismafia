"use client";

import { TVS_PRINTER_PATTERNS } from "@/lib/tspl";

const QZ_WS_URL = "ws://localhost:8181";
const LOCAL_AGENT_URL = "http://127.0.0.1:9283/print";

interface QzApi {
  websocket: {
    isActive(): boolean;
    connect(options?: { retries?: number; delay?: number }): Promise<void>;
  };
  printers: {
    find(): Promise<string[]>;
  };
  configs: {
    create(printerName: string): unknown;
  };
  print(config: unknown, jobs: Array<{
    type: string;
    format: string;
    flavor: string;
    data: string;
  }>): Promise<void>;
}

let qzModule: QzApi | null = null;

async function loadQz(): Promise<QzApi> {
  if (qzModule) return qzModule;
  const mod = await import("qz-tray");
  qzModule = (mod.default ?? mod) as QzApi;
  return qzModule;
}

export async function isQzAvailable(): Promise<boolean> {
  try {
    const qz = await loadQz();
    if (qz.websocket.isActive()) return true;
    await qz.websocket.connect({ retries: 1, delay: 0.5 });
    return qz.websocket.isActive();
  } catch {
    return false;
  }
}

export async function listInstalledPrinters(): Promise<string[]> {
  const qz = await loadQz();
  if (!qz.websocket.isActive()) {
    await qz.websocket.connect({ retries: 2, delay: 0.5 });
  }
  return qz.printers.find();
}

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

export async function autoDetectTvsPrinter(savedName?: string): Promise<{
  printers: string[];
  detected: string | null;
}> {
  const printers = await listInstalledPrinters();
  return {
    printers,
    detected: detectTvsPrinter(printers, savedName),
  };
}

export async function printRawTspl(
  printerName: string,
  tspl: string
): Promise<{ method: "qz" | "agent" }> {
  try {
    const qz = await loadQz();
    if (!qz.websocket.isActive()) {
      await qz.websocket.connect({ retries: 2, delay: 0.5 });
    }

    const config = qz.configs.create(printerName);
    await qz.print(config, [
      {
        type: "raw",
        format: "command",
        flavor: "plain",
        data: tspl,
      },
    ]);
    return { method: "qz" };
  } catch (qzError) {
    try {
      const res = await fetch(LOCAL_AGENT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ printerName, tspl }),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      return { method: "agent" };
    } catch {
      throw qzError instanceof Error
        ? qzError
        : new Error("Printer connection failed. Install QZ Tray or run the local print agent.");
    }
  }
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

export function qzSetupHint(): string {
  return `Install QZ Tray (free) from qz.io and allow Shoe Mafia to print. TVS LP 46 DLite Plus uses TSPL over USB. WebSocket: ${QZ_WS_URL}`;
}
