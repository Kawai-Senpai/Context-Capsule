/*
 * Minimal, deterministic ZIP writer.
 *
 * The Chrome Web Store wants a plain deflate zip whose entries sit at the root.
 * No dependency is worth pulling in for that, and a hand-rolled writer lets us
 * pin the timestamps so two builds of the same source produce byte-identical
 * archives — which is what makes "did this upload change?" answerable.
 */

import zlib from "node:zlib";

/* Fixed DOS timestamp: 1980-01-01 00:00, the epoch of the format itself. */
const DOS_TIME = 0;
const DOS_DATE = (1 << 5) | 1;

let TABLE = null;

export function crc32(buffer) {
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

  for (const byte of buffer) {
    c = TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  }

  return (c ^ 0xffffffff) >>> 0;
}

/**
 * @param {{ name: string, data: Buffer }[]} entries
 *   `name` must be a forward-slash relative path with no leading slash.
 * @returns {Buffer}
 */
export function createZip(entries) {
  const locals = [];
  const centrals = [];

  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");

    if (entry.name.startsWith("/") || entry.name.includes("..")) {
      throw new Error(`Unsafe zip entry name: ${entry.name}`);
    }

    /*
     * Raw deflate at max level. If deflate would grow the file (already
     * compressed PNGs, tiny files), store it instead.
     */
    const deflated = zlib.deflateRawSync(entry.data, { level: 9 });

    const stored = deflated.length >= entry.data.length;

    const payload = stored ? entry.data : deflated;

    const method = stored ? 0 : 8;

    const checksum = crc32(entry.data);

    const local = Buffer.alloc(30);

    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(payload.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28); // extra length

    locals.push(local, name, payload);

    const central = Buffer.alloc(46);

    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(0x031e, 4); // made by: unix, spec 3.0
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(payload.length, 20);
    central.writeUInt32LE(entry.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30); // extra
    central.writeUInt16LE(0, 32); // comment
    central.writeUInt16LE(0, 34); // disk
    central.writeUInt16LE(0, 36); // internal attrs
    central.writeUInt32LE(0o644 << 16, 38); // external attrs
    central.writeUInt32LE(offset, 42);

    centrals.push(central, name);

    offset += local.length + name.length + payload.length;
  }

  const centralBuffer = Buffer.concat(centrals);

  const end = Buffer.alloc(22);

  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4); // this disk
  end.writeUInt16LE(0, 6); // disk with central directory
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([
    Buffer.concat(locals),
    centralBuffer,
    end
  ]);
}
