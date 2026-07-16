/**
 * Built-in TVS LP 46 print service — no QZ Tray required.
 * Starts automatically with npm run dev / npm start.
 */
import http from "http";
import { execSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const PORT = 9283;

const TVS_PATTERNS = [/tvs/i, /lp\s*46/i, /dlite/i, /tsc/i, /barcode/i, /label/i];

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function json(res, status, body) {
  cors(res);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function listWindowsPrinters() {
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
      shell: true,
    });
    return out.split("\n").map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function detectTvs(printers, savedName) {
  if (savedName && printers.includes(savedName)) return savedName;
  for (const pattern of TVS_PATTERNS) {
    const match = printers.find((p) => pattern.test(p));
    if (match) return match;
  }
  return printers[0] || null;
}

function sendRawToPrinter(printerName, filePath) {
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

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    cors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    json(res, 200, { ok: true, service: "shoe-mafia-tvs-print" });
    return;
  }

  if (req.method === "GET" && req.url === "/printers") {
    try {
      const printers = listWindowsPrinters();
      const detected = detectTvs(printers);
      json(res, 200, { printers, detected });
    } catch (error) {
      json(res, 500, {
        error: error instanceof Error ? error.message : "Failed to list printers",
      });
    }
    return;
  }

  if (req.method === "POST" && req.url === "/print") {
    let body = "";
    for await (const chunk of req) body += chunk;

    try {
      const { printerName, tspl } = JSON.parse(body);
      if (!tspl) throw new Error("Missing tspl");
      if (!printerName) throw new Error("Select a printer in Settings first");

      const file = join(tmpdir(), `shoe-mafia-${Date.now()}.tspl`);
      writeFileSync(file, tspl, "utf8");

      try {
        sendRawToPrinter(printerName, file);
      } catch {
        // Fallback: Windows copy to printer name
        if (process.platform === "win32") {
          execSync(`copy /b "${file}" "${printerName}"`, { stdio: "pipe", shell: true });
        } else {
          throw new Error("Print failed");
        }
      } finally {
        try {
          unlinkSync(file);
        } catch {
          // ignore
        }
      }

      json(res, 200, { ok: true });
    } catch (error) {
      json(res, 500, {
        error: error instanceof Error ? error.message : "Print failed",
      });
    }
    return;
  }

  json(res, 404, { error: "Not found" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`TVS print service ready → http://127.0.0.1:${PORT}`);
});

server.on("error", (err) => {
  if (err && "code" in err && err.code === "EADDRINUSE") {
    console.log(`TVS print service already on port ${PORT}`);
    process.exit(0);
  }
  console.error(err);
  process.exit(1);
});
