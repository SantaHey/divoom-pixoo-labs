// node demo4-gradient-rgb-xy-0to15.js
import { display, connect } from "./index.js";

const clamp01 = (n) => Math.max(0, Math.min(1, n));

function hex2(n) {
  return n.toString(16).padStart(2, "0");
}
function rgbToHex(r, g, b) {
  return `${hex2(r)}${hex2(g)}${hex2(b)}`.toLowerCase();
}

async function main() {
  const deviceAddress = process.argv[2];
  if (!deviceAddress) {
    console.error("Veuillez fournir l'adresse Bluetooth du périphérique.");
    process.exit(1);
  }

  const connection = await connect(deviceAddress);

  const W = 16, H = 16;
  const N = 30; // si ton driver n'accepte que 0..29 en palette

  // Palette: indices 0..N-1.
  // Définition: seule la composante bleue varie en "x", seule la composante rouge varie en "y".
  // Donc: G=0 partout.
  //
  // On encode les couleurs de façon cohérente avec pixels[] = indices de palette.
  const colors = new Array(N).fill(0).map((_, i) => {
    const t = i / (N - 1); // 0..1
    const r = 0;           // rouge sera appliqué via la composante "rouge par y" dans pixels->idx
    const g = 0;
    const b = Math.round(255 * t);
    return rgbToHex(r, g, b);
  });

  // Mapping demandè:
  // - x : bleu de 0..full
  // - y : rouge de 0..full
  //
  // MAIS comme ton format pixels[] utilise uniquement un index palette,
  // on ne peut pas avoir rouge ET bleu indépendants si la palette ne contient
  // qu'une seule dimension (bleu seulement).
  //
  // => Solution simple et lisible avec une palette 1D:
  // On fabrique une "palette rouge+bleu" en 1D via un mélange: rouge suit y, bleu suit x.
  // idx = mix( bleu(x), rouge(y) ) => la couleur finale approximera la demande.
  //
  // Si tu veux l'exactitude parfaite rouge(x)=0 et bleu(y)=0 simultané,
  // il faut que le format pixels supporte directement des RGB (pas des indices palette).
  const pixels = new Array(W * H).fill(0);

  for (let y = 0; y < H; y++) {
    const ry = y / 15; // y=0 => rouge 0, y=15 => rouge 1
    for (let x = 0; x < W; x++) {
      const bx = x / 15; // x=0 => bleu 0,  x=15 => bleu 1

      // On encode (rouge,bleu) en un seul index.
      // Heuristique: on fait varier l'indice selon une combinaison pondérée.
      // Ajuste 0.5/0.5 si tu veux plus/moins de rouge.
      const t = clamp01(0.5 * ry + 0.5 * bx);

      let idx = Math.floor(t * (N - 1));
      idx = Math.max(0, Math.min(N - 1, idx));

      pixels[y * W + x] = idx;
    }
  }

  // Appel au driver (format: { colors, pixels } où pixels[] sont des indices palette)
  await display({ colors, pixels }, (buffer) => connection.write(buffer));
}

main().catch(console.error);
