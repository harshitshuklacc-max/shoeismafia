import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const AGENT_HEALTH = "http://127.0.0.1:9283/health";

async function isAgentRunning() {
  try {
    const res = await fetch(AGENT_HEALTH, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

let agent = null;

async function startAgent() {
  if (await isAgentRunning()) {
    console.log("TVS print service already running → http://127.0.0.1:9283");
    return;
  }

  agent = spawn(process.execPath, [join(root, "scripts/tvs-print-agent.mjs")], {
    stdio: "inherit",
    cwd: root,
  });

  agent.on("exit", (code) => {
    if (code && code !== 0) {
      console.warn("TVS print service stopped (port may already be in use — OK if another instance is running)");
    }
  });
}

const nextCmd = process.argv[2] || "dev";
const nextArgs = process.argv.slice(3);

await startAgent();

const child = spawn(
  process.execPath,
  [join(root, "node_modules/next/dist/bin/next"), nextCmd, ...nextArgs],
  { stdio: "inherit", cwd: root }
);

function shutdown() {
  agent?.kill();
  child.kill();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

child.on("exit", (code) => {
  agent?.kill();
  process.exit(code ?? 0);
});
