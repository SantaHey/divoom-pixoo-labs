import { createInterface } from "node:readline/promises";
import dns from "node:dns";
import { writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";

// Sur certaines configurations Windows, Node tente une route IPv6 qui expire
// alors que l'accès IPv4 à l'API Cloudflare fonctionne.
dns.setDefaultResultOrder("ipv4first");

const API = "https://api.cloudflare.com/client/v4";
const defaults = {
  tunnelName: "pixoo-editor",
  hostname: "pixel.turiste.ch",
  origin: "http://127.0.0.1:3020",
};

function loadEnvFile(file) {
  if (!existsSync(file)) return {};
  return Object.fromEntries(readFileSync(file, "utf8").split(/\r?\n/).filter((line) => line && !line.trim().startsWith("#")).map((line) => {
    const [key, ...rest] = line.split("=");
    return [key.trim(), rest.join("=").trim().replace(/^['\"]|['\"]$/g, "")];
  }));
}

const defaultEnvFile = fileURLToPath(new URL("../.env.local", import.meta.url));
const envFilePath = process.env.CLOUDFLARE_ENV_FILE || defaultEnvFile;
const fileEnv = loadEnvFile(envFilePath);
const env = { ...fileEnv, ...process.env };
for (const key of Object.keys(fileEnv)) {
  if (!env[key]?.trim() || /^<[^>]+>$/.test(env[key].trim())) env[key] = fileEnv[key];
}

function requiredEnv(name) {
  const value = env[name]?.trim();
  if (!value || /^<[^>]+>$/.test(value)) {
    throw new Error(`${name} est vide ou contient encore un placeholder. Vérifie .env.local.`);
  }
  return value;
}

const rl = createInterface({ input, output });
const ask = async (label, fallback = "") => {
  const answer = await rl.question(`${label}${fallback ? ` [${fallback}]` : ""}: `);
  return answer.trim() || fallback;
};

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API}${path}`, {
      ...options,
      headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json", ...options.headers },
    });
  } catch (error) {
    const cause = error.cause?.code || error.cause?.message || error.message;
    throw new Error(`Impossible de joindre l'API Cloudflare (${cause}). Vérifie Internet, le proxy ou TLS de Node.`);
  }
  const body = await response.json();
  if (!response.ok || !body.success) {
    const message = body.errors?.map((error) => error.message).join(", ") || response.statusText;
    throw new Error(`${response.status} ${message}`);
  }
  return body.result;
}

function zoneFromHostname(hostname) {
  const parts = hostname.split(".");
  if (parts.length < 2) throw new Error(`Hostname invalide : ${hostname}`);
  return parts.slice(-2).join(".");
}

async function main() {
  requiredEnv("CLOUDFLARE_API_TOKEN");

  const accountId = requiredEnv("CLOUDFLARE_ACCOUNT_ID");
  const tunnelName = await ask("Nom du tunnel", defaults.tunnelName);
  const hostname = await ask("Hostname public", defaults.hostname);
  const origin = await ask("Service local", defaults.origin);
  const zoneName = zoneFromHostname(hostname);

  console.log("\nRecherche du tunnel…");
  const tunnels = await request(`/accounts/${accountId}/cfd_tunnel?name=${encodeURIComponent(tunnelName)}&is_deleted=false`);
  const tunnel = tunnels[0] || await request(`/accounts/${accountId}/cfd_tunnel`, {
    method: "POST",
    body: JSON.stringify({ name: tunnelName, config_src: "cloudflare" }),
  });

  console.log(`Tunnel : ${tunnel.name} (${tunnel.id})`);
  await request(`/accounts/${accountId}/cfd_tunnel/${tunnel.id}/configurations`, {
    method: "PUT",
    body: JSON.stringify({ config: { ingress: [{ hostname, service: origin }, { service: "http_status:404" }] } }),
  });

  let zoneId = env.CLOUDFLARE_ZONE_ID;
  if (!zoneId) {
    const zones = await request(`/zones?name=${encodeURIComponent(zoneName)}&status=active`);
    zoneId = zones[0]?.id;
  }
  if (!zoneId) throw new Error(`Zone ID introuvable pour ${zoneName}. Définis CLOUDFLARE_ZONE_ID.`);

  const dnsRecords = await request(`/zones/${zoneId}/dns_records?name=${encodeURIComponent(hostname)}`);
  const conflicting = dnsRecords.find((record) => record.type !== "CNAME");
  if (conflicting) throw new Error(`Un enregistrement ${conflicting.type} existe déjà pour ${hostname}.`);

  const dnsBody = { type: "CNAME", name: hostname, content: `${tunnel.id}.cfargotunnel.com`, ttl: 1, proxied: true };
  if (dnsRecords[0]) {
    await request(`/zones/${zoneId}/dns_records/${dnsRecords[0].id}`, { method: "PUT", body: JSON.stringify(dnsBody) });
  } else {
    await request(`/zones/${zoneId}/dns_records`, { method: "POST", body: JSON.stringify(dnsBody) });
  }

  const tunnelToken = await request(`/accounts/${accountId}/cfd_tunnel/${tunnel.id}/token`);
  const envFile = process.env.CLOUDFLARE_ENV_FILE || defaultEnvFile;
  const currentEnv = existsSync(envFile) ? readFileSync(envFile, "utf8") : "";
  const tokenLine = `CLOUDFLARED_TUNNEL_TOKEN=${tunnelToken}`;
  const updatedEnv = currentEnv.match(/^CLOUDFLARED_TUNNEL_TOKEN=.*$/m)
    ? currentEnv.replace(/^CLOUDFLARED_TUNNEL_TOKEN=.*$/m, tokenLine)
    : `${currentEnv.trimEnd()}${currentEnv.trim() ? "\n" : ""}${tokenLine}\n`;
  await writeFile(envFile, updatedEnv);
  console.log("\n✅ Tunnel, configuration et DNS prêts.");
  console.log(`Token enregistré dans ${envFile} (ignoré par Git).`);
  console.log("\nLancer ensuite :");
  console.log("pnpm run dev -- --online 3020 3021 3022");
}

try {
  await main();
} catch (error) {
  console.error(`\n❌ ${error.message}`);
  process.exitCode = 1;
} finally {
  rl.close();
}
