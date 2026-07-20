import { execSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { TVS_PRINTER_PATTERNS } from "@/lib/tspl";

const AGENT_BASE = "http://127.0.0.1:9283";

export function detectTvsPrinterOnServer(
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

export function listInstalledPrintersOnServer(): string[] {
  if (process.platform === "win32") {
    const out = execSync(
      'powershell -NoProfile -Command "Get-Printer | Select-Object -ExpandProperty Name"',
      { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
    );
    return out
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  try {
    const out = execSync("lpstat -a 2>/dev/null | awk '{print $1}'", {
      encoding: "utf8",
      shell: process.env.ComSpec || "/bin/sh",
    });
    return out.split("\n").map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function sendRawToPrinter(printerName: string, filePath: string): void {
  if (process.platform === "win32") {
    const name = printerName.replace(/'/g, "''");
    const file = filePath.replace(/'/g, "''");
    execSync(
      `powershell -NoProfile -Command "$p = Get-Printer -Name '${name}' -ErrorAction Stop; $port = $p.PortName; Copy-Item -LiteralPath '${file}' -Destination ('\\\\.\\' + $port) -Force"`,
      { stdio: "pipe" }
    );
    return;
  }

  execSync(`lp ${printerName ? `-d "${printerName}"` : ""} -o raw "${filePath}"`, {
    stdio: "pipe",
  });
}

export function printTsplOnServer(printerName: string, tspl: string): void {
  const file = join(tmpdir(), `shoe-mafia-${Date.now()}.tspl`);
  writeFileSync(file, tspl, "utf8");

  try {
    sendRawToPrinter(printerName, file);
  } catch {
    if (process.platform === "win32") {
      execSync(`copy /b "${file}" "${printerName}"`, {
        stdio: "pipe",
        shell: process.env.ComSpec || "cmd.exe",
      });
    } else {
      throw new Error("Print failed — check TVS printer is on and selected in Settings");
    }
  } finally {
    try {
      unlinkSync(file);
    } catch {
      // ignore cleanup errors
    }
  }
}

async function fetchFromLocalAgent<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${AGENT_BASE}${path}`, {
      ...init,
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function getPrintersFromServer(savedName?: string): Promise<{
  printers: string[];
  detected: string | null;
}> {
  const agentData = await fetchFromLocalAgent<{
    printers?: string[];
    detected?: string | null;
  }>("/printers");

  if (agentData) {
    const printers = agentData.printers || [];
    return {
      printers,
      detected:
        detectTvsPrinterOnServer(printers, savedName) || agentData.detected || null,
    };
  }

  const printers = listInstalledPrintersOnServer();
  return {
    printers,
    detected: detectTvsPrinterOnServer(printers, savedName),
  };
}

export async function isPrintServiceReadyOnServer(): Promise<boolean> {
  const agentHealth = await fetchFromLocalAgent<{ ok?: boolean }>("/health");
  if (agentHealth?.ok) return true;

  try {
    listInstalledPrintersOnServer();
    return true;
  } catch {
    return false;
  }
}

export async function printTsplViaServer(printerName: string, tspl: string): Promise<void> {
  const agentResult = await fetch(`${AGENT_BASE}/print`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ printerName, tspl }),
    signal: AbortSignal.timeout(30000),
  }).catch(() => null);

  if (agentResult?.ok) return;

  if (!printerName) throw new Error("Select a printer in Settings first");
  if (!tspl) throw new Error("Missing print data");

  printTsplOnServer(printerName, tspl);
}
