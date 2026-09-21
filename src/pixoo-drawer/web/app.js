const SIZE = 16;
const canvas = document.querySelector("#grid");
const context = canvas.getContext("2d");
const paletteElement = document.querySelector("#palette");
const statusElement = document.querySelector("#status");
const targetElement = document.querySelector("#target");

let colors = ["000000", "ff4057", "40d978", "4e7cff", "ffffff"];
let pixels = new Array(SIZE * SIZE).fill(0);
let selectedColor = 1;
let drawing = false;
let sendTimer;

// ==== CANVAS ====
function drawCanvas() {
  const cell = canvas.width / SIZE;
  pixels.forEach((colorIndex, index) => {
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
  const bounds = canvas.getBoundingClientRect();
  const x = Math.floor(((event.clientX - bounds.left) / bounds.width) * SIZE);
  const y = Math.floor(((event.clientY - bounds.top) / bounds.height) * SIZE);
  const index = y * SIZE + x;

  if (index < 0 || index >= pixels.length || pixels[index] === selectedColor) return;
  pixels[index] = selectedColor;
  drawCanvas();
  schedulePush();
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
  statusElement.textContent = "Envoi…";

  try {
    const response = await fetch(`/display?target=${targetElement.value}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ colors, pixels }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    statusElement.textContent = `Envoyé à ${targetElement.selectedOptions[0].text}.`;
  } catch (error) {
    statusElement.textContent = `Erreur : ${error.message}`;
  }
}

function schedulePush() {
  clearTimeout(sendTimer);
  sendTimer = setTimeout(pushDisplay, 80);
}

canvas.addEventListener("pointerdown", (event) => { drawing = true; canvas.setPointerCapture(event.pointerId); paint(event); });
canvas.addEventListener("pointermove", (event) => { if (drawing) paint(event); });
canvas.addEventListener("pointerup", () => { drawing = false; });
document.querySelector("#send").onclick = pushDisplay;
document.querySelector("#clear").onclick = () => { pixels.fill(0); drawCanvas(); schedulePush(); };
document.querySelector("#add-color").onclick = () => {
  const color = document.querySelector("#color").value.slice(1).toLowerCase();
  const existingIndex = colors.indexOf(color);
  selectedColor = existingIndex >= 0 ? existingIndex : colors.push(color) - 1;
  drawPalette();
};

drawPalette();
drawCanvas();
