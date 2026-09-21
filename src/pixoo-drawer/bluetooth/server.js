import { createServer } from "node:http";
import { display, connect } from "../index.js";
import { validateDisplay } from "../shared/display-data.js";
import { addCors, readJson, sendJson } from "../shared/http.js";
import { PORTS } from "../config.js";

const PORT = Number(process.env.BLUETOOTH_PORT ?? PORTS.bluetooth);
const DEVICE_ADDRESS = process.env.PIXOO_ADDRESS;
const READY_DELAY_MS = Number(process.env.PIXOO_READY_DELAY_MS ?? 900);
const FRAME_DELAY_MS = Number(process.env.PIXOO_FRAME_DELAY_MS ?? 20);

let connection;
let writeQueue = Promise.resolve();
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

// ==== BLUETOOTH LINK ====
async function getConnection() {
  if (!DEVICE_ADDRESS) throw new Error("Ajoutez pixooAddress dans config.local.json.");

  if (!connection) {
    connection = await connect(DEVICE_ADDRESS);
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
    } else if (request.method === "GET" && url.pathname === "/") {
      sendJson(response, 200, {
        ok: true,
        service: "Passerelle Bluetooth Pixoo",
        display: "POST /display",
        pixoo: DEVICE_ADDRESS ?? "non configuré",
        port: PORT,
      });
    } else {
      sendJson(response, 404, { error: "Route introuvable.", routes: ["POST /display", "GET /"] });
    }
  } catch (error) {
    connection?.close();
    connection = undefined;
    writeQueue = Promise.resolve();
    sendJson(response, 502, { error: error.message });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Passerelle Bluetooth : http://localhost:${PORT}`);
  console.log(`Pixoo : ${DEVICE_ADDRESS ?? "non configuré"}`);
});
