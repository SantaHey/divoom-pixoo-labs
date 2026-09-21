import readline from "readline";
import { display, connect } from "./index.js";

function clamp01(n) { return Math.max(0, Math.min(1, n)); }
function lerp(a, b, t) { return a + (b - a) * t; }

function hex2(n) {
  return n.toString(16).padStart(2, "0");
}
function rgbToHex(r, g, b) {
  return `${hex2(r)}${hex2(g)}${hex2(b)}`.toLowerCase();
}

function hslToRgb(h, s, l) {
  // h: 0..360, s/l: 0..1
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0, g1 = 0, b1 = 0;

  if (hp >= 0 && hp < 1) { r1 = c; g1 = x; b1 = 0; }
  else if (hp >= 1 && hp < 2) { r1 = x; g1 = c; b1 = 0; }
  else if (hp >= 2 && hp < 3) { r1 = 0; g1 = c; b1 = x; }
  else if (hp >= 3 && hp < 4) { r1 = 0; g1 = x; b1 = c; }
  else if (hp >= 4 && hp < 5) { r1 = x; g1 = 0; b1 = c; }
  else { r1 = c; g1 = 0; b1 = x; }

  const m = l - c / 2;
  const r = Math.round((r1 + m) * 255);
  const g = Math.round((g1 + m) * 255);
  const b = Math.round((b1 + m) * 255);
  return [r, g, b];
}

async function main() {
  const deviceAddress = process.argv[2];
  if (!deviceAddress) {
    console.error("Veuillez fournir l'adresse Bluetooth du périphérique.");
    process.exit(1);
  }

  const connection = await connect(deviceAddress);

  // --------- Paramètres dégradé via x,y ----------
  const W = 16, H = 16;
  const N = 30; // nb de couleurs

  // Palette calculée (indices 0..N-1), et pixels contiennent des indices
  // Fonction de couleur : arc-en-ciel modulé par x et y
  // pixels(x,y) -> idx
  const colors = new Array(N).fill(0).map((_, i) => {
    // pour faire beau : on fait une "vague" horizontale
    // mais la palette elle-même reste linéaire en hue
    const t = i / (N - 1);       // 0..1
    const h = lerp(330, 30, t);  // rouge->orange->...->rouge
    const s = 1.0;
    const l = 0.45;
    const [r, g, b] = hslToRgb(h, s, l);
    return rgbToHex(r, g, b);
  });

  // ajoute un fond noir en index 0 (si tu veux ABSOLUMENT garder 0 noir)
  // (optionnel) : remplace colors[0]

  const pixels = new Array(W * H).fill(0);

  // Exemple de motif dégradé: hue dépend de x, et on ajoute une variation douce avec y
  // idx(x,y) = int( (x/W + 0.25*sin(y*...))* (N-1) )
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const nx = x / (W - 1); // 0..1
      const ny = y / (H - 1); // 0..1

      const t = clamp01(nx + 0.12 * (ny - 0.5)); 

      let idx = Math.floor(t * (N - 1));
      idx = Math.max(0, Math.min(N - 1, idx));

      // Pour garder du "noir" au début : si tu veux un fond plus noir, décommente:
      // if (t < 0.05) idx = 0;

      pixels[y * W + x] = idx;
    }
  }

  await display({ colors, pixels }, (buffer) => connection.write(buffer));
}

main().catch(console.error);
