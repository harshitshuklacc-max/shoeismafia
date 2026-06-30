/**
 * Optional local print agent for TVS LP 46 DLite Plus (TSPL raw).
 * Run: node scripts/tvs-print-agent.mjs
 * Sends raw TSPL to Windows default printer or named printer via copy /b
 */
import http from "http";
import { execSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const PORT = 9283;

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  if (req.method !== "POST" || req.url !== "/print") {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  let body = "";
  for await (const chunk of req) body += chunk;

  try {
    const { printerName, tspl } = JSON.parse(body);
    if (!tspl) throw new Error("Missing tspl");

    const file = join(tmpdir(), `shoe-mafia-${Date.now()}.tspl`);
    writeFileSync(file, tspl, "utf8");

    if (process.platform === "win32") {
      const target = printerName ? `"${printerName}"` : "PRN";
      execSync(`copy /b "${file}" ${target}`, { stdio: "pipe" });
    } else {
      execSync(`lp ${printerName ? `-d "${printerName}"` : ""} -o raw "${file}"`, {
        stdio: "pipe",
      });
    }

    unlinkSync(file);
    res.writeHead(200, { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
  } catch (error) {
    res.writeHead(500, { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Print failed" }));
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`TVS TSPL print agent listening on http://127.0.0.1:${PORT}/print`);
});
