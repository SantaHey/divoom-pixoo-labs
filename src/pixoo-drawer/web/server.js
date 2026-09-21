import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import WebSocket, { WebSocketServer } from "ws";
import { readJson, sendFile, sendJson } from "../shared/http.js";
import { createEmptyDisplay, validateDisplay } from "../shared/display-data.js";
import { PORTS } from "../config.js";

const PORT = Number(process.env.WEB_PORT ?? PORTS.web);
const files = {
  "/": fileURLToPath(new URL("index.html", import.meta.url)),
  "/app.js": fileURLToPath(new URL("app.js", import.meta.url)),
  "/style.css": fileURLToPath(new URL("style.css", import.meta.url)),
};
// Cibles dérivées des ports réels (env définie par dev.js, sinon config.js).
// NB : on utilise le port d'env, PAS TARGETS, sinon on relaie vers le mauvais port
// quand des ports personnalisés sont passés au lancement (ex. 3020/3021/3022).
const portOf = {
  simulator: process.env.SIMULATOR_PORT ?? PORTS.simulator,
  bluetooth: process.env.BLUETOOTH_PORT ?? PORTS.bluetooth,
};
const targets = {
  simulator: process.env.SIMULATOR_URL ?? `http://localhost:${portOf.simulator}/display`,
  bluetooth: process.env.BLUETOOTH_URL ?? `http://localhost:${portOf.bluetooth}/display`,
};
const BLUETOOTH_TIMEOUT_MS = 6000;
const STATE_FILE = fileURLToPath(new URL("../data/current-display.json", import.meta.url));
const STATE_DIRECTORY = fileURLToPath(new URL("../data/", import.meta.url));

let revision = 0;

// Une seule image est partagée par tous les navigateurs connectés et écrite
// sur disque. Le format précédent (directement { colors, pixels }) reste lu.
async function loadSharedDisplay() {
  try {
    const stored = JSON.parse(await readFile(STATE_FILE, "utf8"));
    revision = Number.isInteger(stored.revision) ? stored.revision : 0;
    const display = validateDisplay(stored.display ?? stored);
    console.log(`[shared] chargé depuis le disque : version ${revision}`);
    return display;
  } catch (error) {
    if (error.code === "ENOENT") console.log("[shared] aucun dessin sauvegardé : grille vide initiale");
    else console.error("[shared] lecture impossible :", error.message);
    return createEmptyDisplay();
  }
}

let sharedDisplay = await loadSharedDisplay();
let saveQueue = Promise.resolve();

function persistSharedDisplay() {
  const content = JSON.stringify({ revision, display: sharedDisplay });
  saveQueue = saveQueue
    .catch((error) => console.error("[shared] sauvegarde précédente échouée :", error.message))
    .then(async () => {
      await mkdir(STATE_DIRECTORY, { recursive: true });
      await writeFile(STATE_FILE, content);
      console.log(`[shared] sauvegardé : version ${revision}`);
    });
  saveQueue.catch((error) => console.error("[shared] sauvegarde impossible :", error.message));
}

function broadcastDisplay() {
  const message = JSON.stringify({ type: "state", revision, display: sharedDisplay });
  for (const client of webSocketServer.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(message);
  }
}

function updateSharedDisplay(display) {
  sharedDisplay = validateDisplay(display);
  revision += 1;
  persistSharedDisplay();
  broadcastDisplay();
  return sharedDisplay;
}

// ==== FORWARD ====
async function forward(targetName, displayData) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), BLUETOOTH_TIMEOUT_MS);
    const targetResponse = await fetch(targets[targetName], {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(displayData),
      signal: controller.signal,
    });
    clearTimeout(timer);
    return { status: targetResponse.status, body: await targetResponse.json() };
  } catch (error) {
    const message = error?.name === "AbortError"
      ? `Pixoo injoignable (délai de ${BLUETOOTH_TIMEOUT_MS / 1000}s dépassé).`
      : error.message;
    return { status: 502, body: { ok: false, error: message } };
  }
}

// ==== HTTP SERVER ====
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === "POST" && url.pathname === "/display") {
      const display = updateSharedDisplay(await readJson(request));

      // On envoie TOUJOURS aux deux cibles, indépendamment l'une de l'autre.
      const simulatorPromise = forward("simulator", display);
      const bluetoothPromise = forward("bluetooth", display);

      // On répond dès que le simulateur a répondu (rapide) sans attendre le Bluetooth.
      const simulationResult = await simulatorPromise;
      // Bluetooth en arrière-plan : ne bloque ni le navigateur ni le simulateur.
      bluetoothPromise.then(
        (result) => { console.log(`[pixoo:web] bluetooth →`, result.status, result.body); },
        (error) => { console.log(`[pixoo:web] bluetooth échec →`, error.message); }
      );

      const responseBody = {
        ...simulationResult.body,
        bluetooth: "en arrière-plan",
      };
      sendJson(response, simulationResult.status, responseBody);
    } else if (request.method === "GET" && url.pathname === "/state") {
      sendJson(response, 200, { revision, display: sharedDisplay });
    } else if (request.method === "GET" && url.pathname === "/debug") {
      sendJson(response, 200, {
        storage: "data/current-display.json",
        revision,
        clients: [...webSocketServer.clients].filter((client) => client.readyState === WebSocket.OPEN).length,
        coloredPixels: sharedDisplay.pixels.filter((pixel) => pixel !== 0).length,
      });
    } else if (request.method === "GET" && files[url.pathname]) {
      await sendFile(response, files[url.pathname]);
    } else {
      sendJson(response, 404, { error: "Route introuvable." });
    }
  } catch (error) {
    sendJson(response, 502, { error: error.message });
  }
});

// ==== WEBSOCKET TEMPS RÉEL ==== 
const webSocketServer = new WebSocketServer({ server, path: "/realtime" });

webSocketServer.on("connection", (socket) => {
  console.log(`[shared] navigateur connecté (${webSocketServer.clients.size})`);
  socket.send(JSON.stringify({ type: "state", revision, display: sharedDisplay }));

  socket.on("close", () => console.log(`[shared] navigateur déconnecté (${webSocketServer.clients.size})`));

  socket.on("message", (rawMessage) => {
    try {
      const message = JSON.parse(rawMessage.toString());
      if (message.type !== "display") return;
      const display = updateSharedDisplay(message.display);
      console.log(`[shared] dessin reçu via WebSocket : version ${revision}`);

      // La synchro des navigateurs est immédiate. Les sorties physiques ne la
      // bloquent pas et peuvent échouer indépendamment.
      forward("simulator", display).then((result) => {
        if (result.status >= 400) console.log("[pixoo:web] simulateur →", result.status, result.body);
      });
      forward("bluetooth", display).then((result) => {
        if (result.status >= 400) console.log("[pixoo:web] bluetooth →", result.status, result.body);
      });
    } catch (error) {
      socket.send(JSON.stringify({ type: "error", error: error.message }));
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {});
