import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const agent = spawn(process.execPath, [join(root, "scripts/tvs-print-agent.mjs")], {
  stdio: "inherit",
  cwd: root,
});

const nextCmd = process.argv[2] || "dev";
const nextArgs = process.argv.slice(3);

const child = spawn("npx", ["next", nextCmd, ...nextArgs], {
  stdio: "inherit",
  cwd: root,
  shell: process.platform === "win32",
});

function shutdown() {
  agent.kill();
  child.kill();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

child.on("exit", (code) => {
  agent.kill();
  process.exit(code ?? 0);
});

agent.on("exit", (code) => {
  if (code && code !== 0) {
    console.error("TVS print service exited unexpectedly");
  }
});
