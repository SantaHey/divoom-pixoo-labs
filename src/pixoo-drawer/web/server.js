import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { readJson, sendFile, sendJson } from "../shared/http.js";
import { validateDisplay } from "../shared/display-data.js";

const PORT = Number(process.env.WEB_PORT ?? 3000);
const files = {
  "/": fileURLToPath(new URL("index.html", import.meta.url)),
  "/app.js": fileURLToPath(new URL("app.js", import.meta.url)),
  "/style.css": fileURLToPath(new URL("style.css", import.meta.url)),
};
const targets = {
  simulator: process.env.SIMULATOR_URL ?? "http://localhost:3001/display",
  bluetooth: process.env.BLUETOOTH_URL ?? "http://localhost:3002/display",
};

// ==== TARGET PROXY ====
async function pushDisplay(request, response, targetName) {
  const targetUrl = targets[targetName];
  if (!targetUrl) return sendJson(response, 400, { error: "Cible inconnue." });

  const display = validateDisplay(await readJson(request));
  const targetResponse = await fetch(targetUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(display),
  });
  const result = await targetResponse.json();
  sendJson(response, targetResponse.status, result);
}

// ==== HTTP SERVER ====
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === "POST" && url.pathname === "/display") {
      await pushDisplay(request, response, url.searchParams.get("target") ?? "simulator");
    } else if (request.method === "GET" && files[url.pathname]) {
      await sendFile(response, files[url.pathname]);
    } else {
      sendJson(response, 404, { error: "Route introuvable." });
    }
  } catch (error) {
    sendJson(response, 502, { error: error.message });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Éditeur : http://localhost:${PORT}`);
});
