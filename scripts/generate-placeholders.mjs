import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const CATEGORIES = [
  ["cake", [232, 168, 124]],
  ["muffin", [201, 146, 99]],
  ["bread", [196, 150, 108]],
  ["cookie", [176, 122, 82]],
  ["dessert", [214, 157, 176]],
  ["pasta", [230, 198, 110]],
  ["rice", [232, 220, 176]],
  ["soup", [214, 122, 90]],
  ["salad", [122, 168, 106]],
  ["breakfast", [232, 196, 124]],
  ["meat", [168, 82, 74]],
  ["fish", [106, 154, 176]],
  ["vegetarian", [124, 168, 116]],
  ["drink", [124, 168, 196]],
  ["snack", [196, 154, 106]],
  ["other", [140, 148, 156]],
];

const SIZE = 256;

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function png(r, g, b) {
  const raw = Buffer.alloc((SIZE * 3 + 1) * SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    const row = y * (SIZE * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < SIZE; x += 1) {
      const i = row + 1 + x * 3;
      const vignette = 1 - Math.hypot(x - SIZE / 2, y - SIZE / 2) / SIZE;
      raw[i] = Math.min(255, Math.round(r * (0.65 + 0.35 * vignette)));
      raw[i + 1] = Math.min(255, Math.round(g * (0.65 + 0.35 * vignette)));
      raw[i + 2] = Math.min(255, Math.round(b * (0.65 + 0.35 * vignette)));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../apps/mobile/assets/categories");
await mkdir(outDir, { recursive: true });
for (const [name, color] of CATEGORIES) {
  await writeFile(path.join(outDir, `${name}.webp`), png(color[0], color[1], color[2]));
}
console.log(`Wrote ${CATEGORIES.length} placeholder category images to ${outDir}`);
