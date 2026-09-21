const SIZE = 16;
const canvas = document.querySelector("#grid");
const context = canvas.getContext("2d");
const paletteElement = document.querySelector("#palette");
const statusElement = document.querySelector("#status");
const syncElement = document.querySelector("#sync-info");

const BASE_COLORS = ["000000", "ffffff", "ff4057", "ff1744", "ff6d00", "ff8a00", "ffcc00", "fff176", "40d978", "00c853", "00c9a7", "00b8d4", "4e7cff", "2979ff", "651fff", "8b5cf6", "d500f9", "ff66c4", "ff80ab", "8b4513", "c08457", "808080", "bdbdbd", "424242"];

let colors = [...BASE_COLORS];
let pixels = new Array(SIZE * SIZE).fill(0);
let selectedColor = 1;
let tool = "pencil";
let drawing = false;
let startCell;
let previewPixels;
let sendTimer;
let realtime;
let reconnectTimer;
let revision = -1;
let serverStateReady = false;

// Le serveur est la seule source des pixels, jamais le stockage du navigateur.
function applySharedDisplay(display, nextRevision) {
  if (!Array.isArray(display?.colors) || !Array.isArray(display?.pixels) || display.pixels.length !== SIZE * SIZE) return;
  if (Number.isInteger(nextRevision) && nextRevision < revision) return;
  colors = [...display.colors];
  for (const color of BASE_COLORS) if (!colors.includes(color)) colors.push(color);
  pixels = [...display.pixels];
  revision = Number.isInteger(nextRevision) ? nextRevision : revision;
  serverStateReady = true;
  if (selectedColor >= colors.length) selectedColor = 1;
  previewPixels = null;
  drawPalette();
  drawCanvas();
  const coloredPixels = pixels.filter((pixel) => pixel !== 0).length;
  syncElement.textContent = `Serveur chargé : version ${revision}, ${coloredPixels} pixel(s) coloré(s).`;
}

function connectRealtime() {
  clearTimeout(reconnectTimer);
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  realtime = new WebSocket(`${protocol}//${location.host}/realtime`);
  realtime.onopen = () => { statusElement.textContent = "WebSocket connecté."; };
  realtime.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.type === "state") applySharedDisplay(message.display, message.revision);
      if (message.type === "error") statusElement.textContent = `Erreur : ${message.error}`;
    } catch (error) {
      console.error("[pixoo] mise à jour temps réel invalide", error);
    }
  };
  realtime.onclose = () => {
    statusElement.textContent = "Reconnexion temps réel…";
    syncElement.textContent = "Serveur non joignable : nouvelle tentative…";
    reconnectTimer = setTimeout(connectRealtime, 1000);
  };
}

// Chargement explicite : même sans WebSocket, un nouveau navigateur lit le
// fichier permanent du serveur avant toute action.
async function loadSharedState() {
  try {
    syncElement.textContent = "Chargement du dessin serveur…";
    const response = await fetch("/state", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const state = await response.json();
    applySharedDisplay(state.display, state.revision);
  } catch (error) {
    console.error("[pixoo] chargement de l'image partagée impossible", error);
    syncElement.textContent = `Chargement serveur échoué : ${error.message}`;
  }
}

// ==== CANVAS ====
function drawCanvas() {
  const cell = canvas.width / SIZE;
  (previewPixels || pixels).forEach((colorIndex, index) => {
    context.fillStyle = `#${colors[colorIndex]}`;
    context.fillRect((index % SIZE) * cell, Math.floor(index / SIZE) * cell, cell, cell);
  });

  context.strokeStyle = "#ffffff18";
  for (let line = 1; line < SIZE; line += 1) {
    context.beginPath();
    context.moveTo(line * cell, 0);
    context.lineTo(line * cell, canvas.height);
    context.moveTo(0, line * cell);
    context.lineTo(canvas.width, line * cell);
    context.stroke();
  }
}

function paint(event) {
  if (!serverStateReady) {
    statusElement.textContent = "Attente du dessin partagé…";
    return;
  }
  const cell = getCell(event);
  if (!cell) return;
  if (tool !== "pencil") return preview(cell);
  const bounds = canvas.getBoundingClientRect();
  const x = Math.floor(((event.clientX - bounds.left) / bounds.width) * SIZE);
  const y = Math.floor(((event.clientY - bounds.top) / bounds.height) * SIZE);
  const index = y * SIZE + x;

  if (index < 0 || index >= pixels.length || pixels[index] === selectedColor) return;
  pixels[index] = selectedColor;
  drawCanvas();
  schedulePush();
}

function getCell(event) {
  const bounds = canvas.getBoundingClientRect();
  const x = Math.floor(((event.clientX - bounds.left) / bounds.width) * SIZE);
  const y = Math.floor(((event.clientY - bounds.top) / bounds.height) * SIZE);
  return x >= 0 && x < SIZE && y >= 0 && y < SIZE ? { x, y } : null;
}

function preview(cell) {
  previewPixels = [...pixels];
  if (tool === "fill") return floodFill(cell.x, cell.y, previewPixels), drawCanvas();
  const left = Math.min(startCell.x, cell.x), right = Math.max(startCell.x, cell.x);
  const top = Math.min(startCell.y, cell.y), bottom = Math.max(startCell.y, cell.y);
  const centerX = (left + right) / 2, centerY = (top + bottom) / 2;
  const radiusX = Math.max((right - left) / 2, 0.5), radiusY = Math.max((bottom - top) / 2, 0.5);
  for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) {
    const ellipseDistance = ((x - centerX) / radiusX) ** 2 + ((y - centerY) / radiusY) ** 2;
    const edge = tool === "square" ? (x === left || x === right || y === top || y === bottom) :
      Math.abs(ellipseDistance - 1) <= 1.35 / Math.max(radiusX, radiusY);
    if (edge) previewPixels[y * SIZE + x] = selectedColor;
  }
  drawCanvas();
}

function floodFill(x, y, target) {
  const old = target[y * SIZE + x]; if (old === selectedColor) return;
  const todo = [[x, y]];
  while (todo.length) { const [cx, cy] = todo.pop();
    if (cx < 0 || cy < 0 || cx >= SIZE || cy >= SIZE || target[cy * SIZE + cx] !== old) continue;
    target[cy * SIZE + cx] = selectedColor;
    todo.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
}

function commit() {
  if (!previewPixels) return;
  pixels = previewPixels; previewPixels = null; drawCanvas(); schedulePush();
}

// ==== PALETTE ====
function drawPalette() {
  paletteElement.replaceChildren();
  colors.forEach((color, index) => {
    const button = document.createElement("button");
    button.className = `swatch${index === selectedColor ? " selected" : ""}`;
    button.style.background = `#${color}`;
    button.title = index === 0 ? "Gomme" : `#${color}`;
    button.onclick = () => { selectedColor = index; drawPalette(); };
    paletteElement.append(button);
  });
}

// ==== PUSH DATA ====
async function pushDisplay() {
  clearTimeout(sendTimer);
  if (!serverStateReady) {
    statusElement.textContent = "Dessin partagé pas encore chargé : envoi bloqué.";
    return;
  }
  const display = { colors, pixels };

  if (realtime?.readyState === WebSocket.OPEN) {
    realtime.send(JSON.stringify({ type: "display", display }));
    statusElement.textContent = "Partagé en temps réel.";
    return;
  }

  statusElement.textContent = "Envoi HTTP de secours…";

  try {
    const response = await withTimeout(
      fetch("/display", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(display),
      }),
      4000,
      "Délai d'attente dépassé."
    );
    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error);
    }
    // Le serveur répond dès que le simulateur a reçu le dessin.
    statusElement.textContent = "Envoyé au simulateur. (Pixoo en arrière-plan)";
  } catch (error) {
    console.error("[pixoo] échec d'envoi", error);
    statusElement.textContent = `Erreur : ${error.message}`;
  }
}

function withTimeout(promise, milliseconds, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), milliseconds)),
  ]);
}

function schedulePush() {
  clearTimeout(sendTimer);
  sendTimer = setTimeout(pushDisplay, 80);
}

canvas.addEventListener("pointerdown", (event) => { startCell = getCell(event); drawing = true; canvas.setPointerCapture(event.pointerId); paint(event); if (tool === "fill") { commit(); drawing = false; } });
canvas.addEventListener("pointermove", (event) => { if (drawing) paint(event); });
canvas.addEventListener("pointerup", () => { drawing = false; commit(); startCell = null; });
document.querySelector("#send").onclick = pushDisplay;
document.querySelector("#clear").onclick = () => { pixels.fill(0); drawCanvas(); schedulePush(); };
document.querySelector("#add-color").onclick = () => {
  const color = document.querySelector("#color").value.slice(1).toLowerCase();
  const existingIndex = colors.indexOf(color);
  selectedColor = existingIndex >= 0 ? existingIndex : colors.push(color) - 1;
  drawPalette();
};
document.querySelector("#color").oninput = (event) => {
  const color = event.target.value.slice(1).toLowerCase();
  const existingIndex = colors.indexOf(color);
  selectedColor = existingIndex >= 0 ? existingIndex : colors.push(color) - 1;
  drawPalette();
};
document.querySelector("#tools").onclick = (event) => {
  const button = event.target.closest("button"); if (!button) return;
  tool = button.dataset.tool;
  document.querySelectorAll("#tools button").forEach((item) => item.classList.toggle("selected", item === button));
};

drawPalette();
drawCanvas();
loadSharedState();
connectRealtime();
