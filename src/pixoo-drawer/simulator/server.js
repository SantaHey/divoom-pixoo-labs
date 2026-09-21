import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { createEmptyDisplay, validateDisplay } from "../shared/display-data.js";
import { addCors, readJson, sendFile, sendJson } from "../shared/http.js";
import { PORTS } from "../config.js";

const PORT = Number(process.env.SIMULATOR_PORT ?? PORTS.simulator);
const viewerPath = fileURLToPath(new URL("viewer.html", import.meta.url));
const listeners = new Set();
let display = createEmptyDisplay();

// ==== LIVE VIEW ====
function publish(nextDisplay) {
  const event = `data: ${JSON.stringify(nextDisplay)}\n\n`;
  for (const response of listeners) response.write(event);
}

// ==== HTTP API ====
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === "OPTIONS") {
      addCors(response);
      response.writeHead(204).end();
    } else if (request.method === "POST" && url.pathname === "/display") {
      display = validateDisplay(await readJson(request));
      publish(display);
      sendJson(response, 200, { ok: true });
    } else if (request.method === "GET" && url.pathname === "/display") {
      sendJson(response, 200, display);
    } else if (request.method === "GET" && url.pathname === "/events") {
      addCors(response);
      response.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      listeners.add(response);
      response.write(`data: ${JSON.stringify(display)}\n\n`);
      request.on("close", () => listeners.delete(response));
    } else if (request.method === "GET" && url.pathname === "/") {
      await sendFile(response, viewerPath);
    } else {
      sendJson(response, 404, { error: "Route introuvable." });
    }
  } catch (error) {
    sendJson(response, 400, { error: error.message });
  }
});

server.listen(PORT, "0.0.0.0", () => {});
