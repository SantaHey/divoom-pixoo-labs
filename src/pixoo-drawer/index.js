import { toImageBuffers } from "./protocol.js";
import { connect, probeConnection } from "./bluetooth.js";

export async function display(colorsAndPixels, bluetoothWrite) {
  const buffers = toImageBuffers(colorsAndPixels);

  for (const buffer of buffers) {
    await bluetoothWrite(buffer);
  }
}

export { connect, probeConnection, toImageBuffers };