import { readFile } from "node:fs/promises";

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

export function addCors(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}

export function sendJson(response, status, data) {
  addCors(response);
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(data));
}

export async function readJson(request) {
  let body = "";

  for await (const chunk of request) {
    body += chunk;
    if (body.length > 100_000) throw new Error("Requête trop volumineuse.");
  }

  return JSON.parse(body || "{}");
}

export async function sendFile(response, filePath) {
  const extension = filePath.slice(filePath.lastIndexOf("."));
  const content = await readFile(filePath);
  response.writeHead(200, { "Content-Type": CONTENT_TYPES[extension] ?? "application/octet-stream" });
  response.end(content);
}
