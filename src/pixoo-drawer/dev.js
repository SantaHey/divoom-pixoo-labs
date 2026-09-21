import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { PORTS } from "./config.js";

// ==== LOCAL CONFIG ====
async function readConfig() {
  try {
    return JSON.parse(await readFile(new URL("config.local.json", import.meta.url), "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
}

// ==== PORTS EN ARGUMENTS ====
// Usage : pnpm run dev -- 3010 3011 3012  (web, simulateur, bluetooth)
//         pnpm run dev -- --web 3010 --simulator 3011 --bluetooth 3012
const args = process.argv.slice(2);
const argPorts = { web: undefined, simulator: undefined, bluetooth: undefined };

if (args.length >= 3 && args.slice(0, 3).every((value) => /^\d+$/.test(value))) {
  [argPorts.web, argPorts.simulator, argPorts.bluetooth] = args.slice(0, 3).map(Number);
} else {
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i]?.replace(/^--?/, "");
    const value = Number(args[i + 1]);
    if (flag in argPorts && Number.isInteger(value)) argPorts[flag] = value;
  }
}

const config = await readConfig();
const environment = {
  ...process.env,
  PIXOO_ADDRESS: config.pixooAddress || "",
  PIXOO_READY_DELAY_MS: String(config.readyDelayMs ?? 900),
  PIXOO_FRAME_DELAY_MS: String(config.frameDelayMs ?? 20),
  // Priorité : argument CLI > variable d'env > config.js
  WEB_PORT: String(argPorts.web ?? process.env.WEB_PORT ?? PORTS.web),
  SIMULATOR_PORT: String(argPorts.simulator ?? process.env.SIMULATOR_PORT ?? PORTS.simulator),
  BLUETOOTH_PORT: String(argPorts.bluetooth ?? process.env.BLUETOOTH_PORT ?? PORTS.bluetooth),
};

console.log(
  `Ports : web ${environment.WEB_PORT}, simulateur ${environment.SIMULATOR_PORT}, bluetooth ${environment.BLUETOOTH_PORT}`
);

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
