/**
 * Print the extension id the companion host must allow.
 *
 * extension/manifest.json carries a signing `key`, so the id is not whatever
 * Chrome felt like assigning to an unpacked folder - it is sha256 of the
 * decoded key, first 16 bytes, hex digits mapped 0-f -> a-p. Deriving it beats
 * asking the user to copy it out of chrome://extensions, which is the step
 * people get wrong.
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export function deriveExtensionId(
  manifestPath = path.join(here, "..", "extension", "manifest.json")
) {
  const { key } = JSON.parse(readFileSync(manifestPath, "utf8"));

  if (!key) {
    throw new Error(
      "extension/manifest.json has no `key`, so the id is assigned by Chrome " +
        "and cannot be derived. Pass the id from chrome://extensions instead."
    );
  }

  return createHash("sha256")
    .update(Buffer.from(key, "base64"))
    .digest("hex")
    .slice(0, 32)
    .replace(/[0-9a-f]/g, (c) => String.fromCharCode(97 + parseInt(c, 16)));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(deriveExtensionId());
}
