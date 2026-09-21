import { createServer } from "node:http";
import { display, connect, probeConnection } from "../index.js";
import { validateDisplay } from "../shared/display-data.js";
import { addCors, readJson, sendJson } from "../shared/http.js";
import { PORTS } from "../config.js";

const PORT = Number(process.env.BLUETOOTH_PORT ?? PORTS.bluetooth);
const DEVICE_ADDRESS = process.env.PIXOO_ADDRESS;
const READY_DELAY_MS = Number(process.env.PIXOO_READY_DELAY_MS ?? 900);
const FRAME_DELAY_MS = Number(process.env.PIXOO_FRAME_DELAY_MS ?? 20);

let connection;
let connectionState = "idle"; // idle | connecting | connected | error
let connectionError = "";
let writeQueue = Promise.resolve();
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function setConnectionState(state, error = "") {
  connectionState = state;
  connectionError = error;
  // Retour à la ligne après "connecting" pour aérer le bloc de liens (Éditeur / Simulateur / Passerelle)
  const separator = state === "connecting" ? "\n" : "";
  console.log(`[bluetooth] état : ${state}${error ? ` (${error})` : ""}${separator}`);
}

// ==== BLUETOOTH LINK ====
function requireDeviceAddress() {
  if (!DEVICE_ADDRESS) throw new Error("Ajoutez pixooAddress dans config.local.json.");
}

async function getConnection() {
  requireDeviceAddress();
  if (!connection) {
    connection = await connect(DEVICE_ADDRESS);
    setConnectionState("connected");
    await sleep(READY_DELAY_MS); // Laisse RFCOMM se stabiliser.
  }
  return connection;
}

async function pushToPixoo(frame) {
  const activeConnection = await getConnection();
  await display(frame, async (buffer) => {
    await activeConnection.write(buffer);
    await sleep(FRAME_DELAY_MS);
  });
}

async function testConnection() {
  if (connectionState === "connecting") {
    throw new Error("Un test de connexion est déjà en cours.");
  }
  requireDeviceAddress();
  setConnectionState("connecting");
  try {
    await probeConnection(DEVICE_ADDRESS);
    setConnectionState("ok");
    return { ok: true, address: DEVICE_ADDRESS };
  } catch (error) {
    setConnectionState("error", error.message);
    throw error;
  }
}

// ==== HTTP API ====
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === "OPTIONS") {
      addCors(response);
      response.writeHead(204).end();
    } else if (request.method === "POST" && url.pathname === "/display") {
      const frame = validateDisplay(await readJson(request));
      writeQueue = writeQueue.then(() => pushToPixoo(frame));
      await writeQueue;
      sendJson(response, 200, { ok: true });
    } else if (request.method === "GET" && url.pathname === "/status") {
      sendJson(response, 200, {
        ok: true,
        address: DEVICE_ADDRESS ?? "",
        configured: Boolean(DEVICE_ADDRESS),
        state: connectionState,
        error: connectionError,
        connected: Boolean(connection),
      });
    } else if ((request.method === "GET" || request.method === "POST") && url.pathname === "/test") {
      try {
        sendJson(response, 200, await testConnection());
      } catch (error) {
        sendJson(response, 502, { ok: false, error: error.message });
      }
    } else if (request.method === "GET" && url.pathname === "/") {
      sendJson(response, 200, {
        ok: true,
        service: "Passerelle Bluetooth Pixoo",
        display: "POST /display",
        status: "GET /status",
        test: "GET|POST /test",
        pixoo: DEVICE_ADDRESS ?? "non configuré",
        port: PORT,
      });
    } else {
      sendJson(response, 404, { error: "Route introuvable.", routes: ["POST /display", "GET /status", "GET|POST /test", "GET /"] });
    }
  } catch (error) {
    connection?.close();
    connection = undefined;
    writeQueue = Promise.resolve();
    setConnectionState("idle", error.message);
    sendJson(response, 502, { error: error.message });
    // L'envoi a échoué (connexion morte ou Pixoo injoignable) : on relance la relecture en boucle.
    scheduleStartupRetry();
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Pixoo : ${DEVICE_ADDRESS ?? "non configuré"}`);

  scheduleStartupRetry();
});

// ==== RELECTURE EN BOUCLE TANT QUE LE PIXOO EST INJOIGNABLE ====
const STARTUP_RETRY_MS = Number(process.env.PIXOO_RETRY_MS ?? 5000);

async function scheduleStartupRetry() {
  if (connectionState === "connected") return;

  try {
    await testConnection();
    console.log(`✅ Pixoo joignable (${DEVICE_ADDRESS}).`);
    return; // On arrête la boucle une fois connecté.
  } catch (error) {
    if (error.message === "Ajoutez pixooAddress dans config.local.json.") {
      console.log("⚠️  Aucune adresse Pixoo configurée, connexion Bluetooth désactivée.");
      return;
    }
    console.log(`❌ Test de connexion : ${error.message}. Nouvel essai dans ${STARTUP_RETRY_MS / 1000}s…`);
  }

  // Ne pas empiler plusieurs boucles si un appel survient pendant un retry déjà programmé.
  setTimeout(() => {
    if (connectionState === "connected") return;
    scheduleStartupRetry();
  }, STARTUP_RETRY_MS);
}
