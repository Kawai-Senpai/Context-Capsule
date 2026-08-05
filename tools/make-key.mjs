/*
 * Pin the extension ID.
 *
 * An unpacked extension's ID is derived from its directory path, while a
 * published one gets a store-assigned ID. The native messaging host is pinned
 * to a specific ID in `allowed_origins` (wildcards are not permitted there), so
 * without pinning, the host you registered in development silently stops
 * matching in production and the panel just reports a disconnected host.
 *
 * Setting `"key"` in the manifest to a public key makes the ID deterministic
 * everywhere, including unpacked loads. Chrome derives the ID from that key:
 *
 *   sha256(SubjectPublicKeyInfo DER)[0..16] -> hex -> digits mapped 0-f to a-p
 *
 * Usage:
 *   node tools/make-key.mjs           print the key, ID and next steps
 *   node tools/make-key.mjs --write   also write "key" into extension/manifest.json
 *
 * The private key is what signs a self-hosted CRX and what proves ownership of
 * the store listing. It is written to keys/ and must never be committed.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

const keyDir = path.join(root, "keys");

const keyPath = path.join(keyDir, "context-capsule.pem");

const manifestPath = path.join(
  root,
  "extension",
  "manifest.json"
);

const write = process.argv.includes("--write");

/**
 * Chrome's extension ID alphabet: hex digits shifted into a-p, so an ID can
 * never be mistaken for a hash.
 */
export function extensionIdFromSpki(spkiDer) {
  const digest = crypto
    .createHash("sha256")
    .update(spkiDer)
    .digest()
    .subarray(0, 16);

  return Array.from(digest)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .split("")
    .map((character) =>
      String.fromCharCode(
        "a".charCodeAt(0) + parseInt(character, 16)
      )
    )
    .join("");
}

export function loadOrCreateKey() {
  if (fs.existsSync(keyPath)) {
    return {
      privateKey: crypto.createPrivateKey(
        fs.readFileSync(keyPath, "utf8")
      ),
      created: false
    };
  }

  /*
   * 2048-bit RSA: what Chrome's own --pack-extension produces, and what the
   * CRX3 format expects.
   */
  const { privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048
  });

  fs.mkdirSync(keyDir, { recursive: true });

  fs.writeFileSync(
    keyPath,
    privateKey.export({ type: "pkcs8", format: "pem" }),
    { mode: 0o600 }
  );

  return { privateKey, created: true };
}

export function describeKey(privateKey) {
  const spkiDer = crypto
    .createPublicKey(privateKey)
    .export({ type: "spki", format: "der" });

  return {
    spkiDer,
    manifestKey: spkiDer.toString("base64"),
    extensionId: extensionIdFromSpki(spkiDer)
  };
}

/* Run only when invoked directly, so the test suite can import the helpers. */
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { privateKey, created } = loadOrCreateKey();

  const { manifestKey, extensionId } = describeKey(privateKey);

  console.log(
    created
      ? `Generated a new signing key: ${keyPath}`
      : `Using existing signing key: ${keyPath}`
  );

  console.log(`\nExtension ID : ${extensionId}`);
  console.log(`\nmanifest "key":\n${manifestKey}\n`);

  if (write) {
    const manifest = JSON.parse(
      fs.readFileSync(manifestPath, "utf8")
    );

    const previous = manifest.key;

    if (previous && previous !== manifestKey) {
      console.error(
        "manifest.json already pins a different key. Refusing to " +
          "overwrite it: changing the key changes the extension ID " +
          "and breaks every installed copy. Remove it by hand if " +
          "that is really what you want."
      );

      process.exit(1);
    }

    /* Keep "key" next to the identity fields rather than appended. */
    const ordered = {};

    for (const [field, value] of Object.entries(manifest)) {
      ordered[field] = value;

      if (field === "version") {
        ordered.key = manifestKey;
      }
    }

    fs.writeFileSync(
      manifestPath,
      `${JSON.stringify(ordered, null, 2)}\n`,
      "utf8"
    );

    console.log(`Wrote "key" into ${manifestPath}`);
  } else {
    console.log("Re-run with --write to pin it in the manifest.");
  }

  console.log(
    "\nNext: register the native host against this ID, " +
      "then reload the unpacked extension.\n" +
      `  cd companion && node install-host.mjs ${extensionId}`
  );

  if (created) {
    console.log(
      "\nBack up keys/context-capsule.pem somewhere safe. Losing it " +
        "means losing the ability to update the published extension."
    );
  }
}
