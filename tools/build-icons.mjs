/*
 * Rasterise the Context Capsule mark to PNG icons.
 *
 * The mark is defined analytically here to match brand/mark.svg exactly, so the
 * icons need no design tooling and regenerate deterministically.
 */
import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";

const OUT = path.join(
  path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1"),
  "..",
  "extension",
  "icons"
);

const SS = 4; // supersampling factor per axis

const hex = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16)
];

const YELLOW = hex("#FFE047");
const INK = hex("#0A0A0A");

const over = (dst, src, alpha) =>
  dst.map((v, i) => v * (1 - alpha) + src[i] * alpha);

/* Signed distance helpers, all in the 128-unit design space. */
function sdRoundRect(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - (hw - r);
  const qy = Math.abs(py - cy) - (hh - r);

  return (
    Math.min(Math.max(qx, qy), 0) +
    Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) -
    r
  );
}


/**
 * Colour + coverage at a design-space point. Returns [r,g,b,a].
 *
 * The mark is a solid yellow tile carrying a black disc with a wedge taken out
 * of it: a capsule with its contents extracted, pointing at what it took. Two
 * flat colours and hard edges, so it survives being 16 pixels wide in a toolbar.
 */
function sample(x, y) {
  // Field — an almost-square tile, matching the panel's hard-edged cards.
  const field = sdRoundRect(x, y, 64, 64, 64, 64, 10);

  if (field > 0.75) {
    return [0, 0, 0, 0];
  }

  let rgb = YELLOW;
  const alpha = clampCoverage(-field);

  // Disc
  const disc = Math.hypot(x - 64, y - 64) - 41;

  /*
   * The bite. Binary rather than a signed distance, because the wedge apex is
   * exactly at the centre where an SDF degenerates; 4x4 supersampling carries
   * the antialiasing.
   */
  let angle = (Math.atan2(y - 64, x - 64) * 180) / Math.PI;

  if (angle < 0) {
    angle += 360;
  }

  const bitten = angle > 118 && angle < 192;

  if (!bitten) {
    rgb = over(rgb, INK, clampCoverage(-disc));
  }

  // Reticle — the point being made.
  const dot = Math.hypot(x - 64, y - 64) - 11;

  rgb = over(rgb, YELLOW, clampCoverage(-dot));

  return [...rgb, alpha];
}

function clampCoverage(d) {
  return Math.min(1, Math.max(0, d + 0.5));
}

function render(size) {
  const rgba = Buffer.alloc(size * size * 4);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = ((px + (sx + 0.5) / SS) / size) * 128;
          const y = ((py + (sy + 0.5) / SS) / size) * 128;

          const [sr, sg, sb, sa] = sample(x, y);

          r += sr * sa;
          g += sg * sa;
          b += sb * sa;
          a += sa;
        }
      }

      const n = SS * SS;
      const off = (py * size + px) * 4;

      rgba[off] = a ? Math.round(r / a) : 0;
      rgba[off + 1] = a ? Math.round(g / a) : 0;
      rgba[off + 2] = a ? Math.round(b / a) : 0;
      rgba[off + 3] = Math.round((a / n) * 255);
    }
  }

  return rgba;
}

function png(size, rgba) {
  const raw = Buffer.alloc(size * (size * 4 + 1));

  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    rgba.copy(
      raw,
      y * (size * 4 + 1) + 1,
      y * size * 4,
      (y + 1) * size * 4
    );
  }

  const chunk = (type, data) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);

    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);

    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);

    return Buffer.concat([length, body, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // truecolour + alpha
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

let TABLE = null;

function crc32(buf) {
  if (!TABLE) {
    TABLE = new Int32Array(256);

    for (let n = 0; n < 256; n++) {
      let c = n;

      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }

      TABLE[n] = c;
    }
  }

  let c = 0xffffffff;

  for (const byte of buf) {
    c = TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  }

  return c ^ 0xffffffff;
}

fs.mkdirSync(OUT, { recursive: true });

for (const size of [16, 32, 48, 128]) {
  const file = path.join(OUT, `icon-${size}.png`);

  fs.writeFileSync(file, png(size, render(size)));

  console.log(`${file}  ${fs.statSync(file).size} bytes`);
}
