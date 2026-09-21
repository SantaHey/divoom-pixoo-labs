import readline from "readline";
import { display, connect } from "./index.js";

async function main() {
  const deviceAddress = process.argv[2];
  if (!deviceAddress) {
    console.error("Veuillez fournir l'adresse Bluetooth du périphérique.");
    process.exit(1);
  }

  const connection = await connect(deviceAddress);

  // Palette de couleurs (0: noir/éteint, 1: rouge, 2: vert, 3: bleu, 4: blanc)
  const colors = ["000000", "ff0000", "00ff00", "0000ff", "ffffff"];
  let currentColor = 1;

  let x = 8;
  let y = 8;
  const grid = new Array(256).fill(0);

  async function render() {
    const pixels = [...grid];
    const cursorIdx = y * 16 + x;
    pixels[cursorIdx] = currentColor;

    await display({ colors, pixels }, (buffer) => connection.write(buffer));
    console.log("Colors : ", colors);
    console.log("Pixels : ", pixels);
  }

  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  console.log("--- Contrôle en direct ---");
  console.log("Flèches : Déplacer le curseur");
  console.log("Espace  : Allumer/Éteindre le pixel");
  console.log("1 à 4   : Changer de couleur");
  console.log("C       : Effacer tout");
  console.log("Ctrl+C  : Quitter\n");

  await render();

  process.stdin.on("keypress", async (str, key) => {
    if (key.ctrl && key.name === "c") {
      connection.close();
      process.exit();
    }

    let shouldRender = false;

    if (key.name === "up" && y > 0) { y--; shouldRender = true; }
    else if (key.name === "down" && y < 15) { y++; shouldRender = true; }
    else if (key.name === "left" && x > 0) { x--; shouldRender = true; }
    else if (key.name === "right" && x < 15) { x++; shouldRender = true; }
    else if (key.name === "space") {
      const idx = y * 16 + x;
      grid[idx] = grid[idx] === currentColor ? 0 : currentColor;
      shouldRender = true;
    } else if (["1", "2", "3", "4"].includes(str)) {
      currentColor = parseInt(str, 10);
      shouldRender = true;
    } else if (key.name === "c") {
      grid.fill(0);
      shouldRender = true;
    }

    if (shouldRender) {
      await render();
    }
  });
}

main().catch(console.error);