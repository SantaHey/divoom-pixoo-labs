import readline from "readline";
import { display, connect } from "./index.js";

async function main() {
  const deviceAddress = process.argv[2];
  if (!deviceAddress) {
    console.error("Veuillez fournir l'adresse Bluetooth du périphérique.");
    process.exit(1);
  }

  const connection = await connect(deviceAddress);
const colors = [
  "4c0019","610012","77000c","8c0000","a30000",
  "ba2a00","d24e00","e16f00","ea8d00","eaab00",
  "d6c700","bea800","a3c500","88d300","6fdcdd",
  "5cd5f0","4dbeff","4991ff","5a6dff","6f4dff",
  "7f2eff","8d12ff","8f00ff","7700e8","5f00cc",
  "4800b5","30009c","180083","00006a","00143a"
];

// pixels 16x16 : dégradé gauche->droite sur 30 couleurs
const pixels = [
  0,0,1,1,2,2,3,3,4,4,5,6,7,8,9,10,
  0,0,1,1,2,2,3,3,4,4,5,6,7,8,9,10,
  1,1,2,2,3,3,4,4,5,6,7,8,9,10,11,12,
  1,1,2,2,3,3,4,4,5,6,7,8,9,10,11,12,

  2,2,3,3,4,4,5,6,7,8,9,10,11,12,13,14,
  2,2,3,3,4,4,5,6,7,8,9,10,11,12,13,14,
  3,3,4,4,5,6,7,8,9,10,11,12,13,14,15,16,
  3,3,4,4,5,6,7,8,9,10,11,12,13,14,15,16,

  4,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,
  4,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,
  5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,
  5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,

  6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,
  6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,
  7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,
  7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22
];

  await display({ colors, pixels }, (buffer) => connection.write(buffer));

}

main().catch(console.error);