import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";

// ==== LOCAL CONFIG ====
async function readConfig() {
  try {
    return JSON.parse(await readFile(new URL("config.local.json", import.meta.url), "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
}

const config = await readConfig();
const environment = {
  ...process.env,
  PIXOO_ADDRESS: config.pixooAddress || "",
  PIXOO_READY_DELAY_MS: String(config.readyDelayMs ?? 900),
  PIXOO_FRAME_DELAY_MS: String(config.frameDelayMs ?? 20),
};

// ==== START SERVICES ====
const services = [
  ["web", "web/server.js"],
  ["simulator", "simulator/server.js"],
  ["bluetooth", "bluetooth/server.js"],
];

const children = services.map(([name, script]) => {
  const child = spawn(process.execPath, [script], { env: environment, stdio: "inherit" });
  child.on("exit", (code) => {
    if (code) console.error(`${name} s'est arrêté avec le code ${code}.`);
  });
  return child;
});

function stop() {
  for (const child of children) child.kill();
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
