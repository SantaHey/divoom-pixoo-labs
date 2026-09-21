import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
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
//         pnpm run dev -- --online
// NB : pnpm/npm passe le séparateur "--" au script ; on le retire.
const rawArgs = process.argv.slice(2).filter((value) => value !== "--");
const online = rawArgs.includes("--online");
const args = rawArgs.filter((value) => value !== "--online");
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
function loadEnvFile(file) {
  if (!existsSync(file)) return {};
  return Object.fromEntries(readFileSync(file, "utf8").split(/\r?\n/).filter((line) => line && !line.trim().startsWith("#")).map((line) => {
    const [key, ...rest] = line.split("=");
    return [key.trim(), rest.join("=").trim().replace(/^['\"]|['\"]$/g, "")];
  }));
}
const fileEnvironment = loadEnvFile(new URL(".env.local", import.meta.url));
const environmentFile = { ...fileEnvironment, ...process.env };
for (const key of Object.keys(fileEnvironment)) {
  if (!environmentFile[key]?.trim() || /^<[^>]+>$/.test(environmentFile[key].trim())) environmentFile[key] = fileEnvironment[key];
}
const cloudflaredToken = environmentFile.CLOUDFLARED_TUNNEL_TOKEN;
const environment = {
  ...environmentFile,
  PIXOO_ADDRESS: config.pixooAddress || "",
  PIXOO_READY_DELAY_MS: String(config.readyDelayMs ?? 900),
  PIXOO_FRAME_DELAY_MS: String(config.frameDelayMs ?? 20),
  // Priorité : argument CLI > variable d'env > config.js
  WEB_PORT: String(argPorts.web ?? process.env.WEB_PORT ?? PORTS.web),
  SIMULATOR_PORT: String(argPorts.simulator ?? process.env.SIMULATOR_PORT ?? PORTS.simulator),
  BLUETOOTH_PORT: String(argPorts.bluetooth ?? process.env.BLUETOOTH_PORT ?? PORTS.bluetooth),
};

console.log(
  `Ports : web ${environment.WEB_PORT}, simulateur ${environment.SIMULATOR_PORT}, bluetooth ${environment.BLUETOOTH_PORT}\n`
);

let stopping = false;

// ==== START SERVICES ====
const services = [
  ["web", "web/server.js", environment.WEB_PORT],
  ["simulator", "simulator/server.js", environment.SIMULATOR_PORT],
  ["bluetooth", "bluetooth/server.js", environment.BLUETOOTH_PORT],
];

// Petit délai pour laisser les serveurs écouter, puis afficher le bloc de liens.
setTimeout(() => {
  console.log(
    `Éditeur : http://localhost:${environment.WEB_PORT}\n` +
    `Simulateur : http://localhost:${environment.SIMULATOR_PORT}\n` +
    `Passerelle Bluetooth : http://localhost:${environment.BLUETOOTH_PORT}\n`
  );
}, 300);

const children = services.map(([name, script, port]) => {
  const child = spawn(process.execPath, [script], { env: environment, stdio: "inherit" });
  child.on("exit", (code) => {
    // Si un service échoue (port déjà pris, etc.), on arrête tout proprement.
    if (code) {
      console.error(`${name} s'est arrêté avec le code ${code}.`);
      for (const other of children) {
        if (other !== child && other.exitCode === null) other.kill();
      }
    }
  });
  // Détection EADDRINUSE : le process enfant imprime l'erreur sur stderr,
  // on la capte pour afficher un message clair avec le port et le PID occupant.
  child.stderr?.on("data", (chunk) => {
    const text = chunk.toString();
    if (text.includes("EADDRINUSE")) {
      console.error(
        `\n❌ Port ${port} déjà utilisé par un autre processus. ` +
          `Sur Windows : Stop-Process -Name node -Force | Sur Linux : fuser -k ${port}/tcp`
      );
    }
  });
  return child;
});

let tunnel;
if (online) {
  if (!cloudflaredToken?.trim() || /^<[^>]+>$/.test(cloudflaredToken.trim())) {
    console.error("❌ --online nécessite CLOUDFLARED_TUNNEL_TOKEN dans .env.local. Refus de lancer un Quick Tunnel trycloudflare.com.");
    stop();
    process.exitCode = 1;
  } else {
    console.log("Cloudflared : tunnel nommé du compte → pixel.turiste.ch (.env.local)");
    tunnel = spawn(
      "cloudflared",
      ["tunnel", "run", "--token", cloudflaredToken],
      { env: environment, stdio: "inherit" }
    );
    tunnel.on("error", (error) => {
      console.error(`❌ Impossible de lancer cloudflared : ${error.message}`);
      stop();
    });
    tunnel.on("exit", (code) => {
      if (code && !stopping) {
        console.error(`cloudflared s'est arrêté avec le code ${code}.`);
        stop();
      }
    });
  }
}

function stop() {
  stopping = true;
  for (const child of children) child.kill();
  tunnel?.kill();
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
