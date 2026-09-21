export const GRID_SIZE = 16;
export const PIXEL_COUNT = GRID_SIZE * GRID_SIZE;

export function createEmptyDisplay() {
  return {
    colors: ["000000"],
    pixels: new Array(PIXEL_COUNT).fill(0),
  };
}

export function validateDisplay(input) {
  if (!input || !Array.isArray(input.colors) || !Array.isArray(input.pixels)) {
    throw new Error("Le format attendu est { colors, pixels }.");
  }

  const colors = input.colors.map((color) => String(color).replace("#", "").toLowerCase());
  if (colors.length === 0 || colors.length > 256 || colors.some((color) => !/^[0-9a-f]{6}$/.test(color))) {
    throw new Error("La palette doit contenir entre 1 et 256 couleurs hexadécimales.");
  }

  if (input.pixels.length !== PIXEL_COUNT) {
    throw new Error(`Le dessin doit contenir exactement ${PIXEL_COUNT} pixels.`);
  }

  const pixels = input.pixels.map(Number);
  if (pixels.some((pixel) => !Number.isInteger(pixel) || pixel < 0 || pixel >= colors.length)) {
    throw new Error("Chaque pixel doit référencer une couleur existante.");
  }

  return { colors, pixels };
}
