/*
 * Build and package.
 *
 * There is no bundler here on purpose — the extension ships the sources it was
 * written in. So "build" means: prove the tests pass, regenerate the icons from
 * the brand geometry, check the two version numbers agree, and write a
 * store-shaped zip plus the companion tarball into dist/.
 *
 * Every gate is fatal. A package that skipped its tests is worse than no
 * package, because it looks finished.
 *
 * Usage:
 *   node tools/package.mjs                 tests + icons + verify + zip
 *   node tools/package.mjs --skip-tests    for iterating on the packaging itself
 *   node tools/package.mjs --crx           also sign a CRX with keys/*.pem
 */

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createZip } from "./lib/zip.mjs";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

const extensionDir = path.join(root, "extension");
const companionDir = path.join(root, "companion");
const distDir = path.join(root, "dist");
const keyPath = path.join(root, "keys", "context-capsule.pem");

const skipTests = process.argv.includes("--skip-tests");
const wantCrx = process.argv.includes("--crx");

/* Never ship editor droppings, sourcemaps or OS metadata. */
const EXCLUDE = [
  /(^|\/)\./,
  /\.map$/,
  /(^|\/)Thumbs\.db$/,
  /(^|\/)desktop\.ini$/,
  /~$/
];

const steps = [];

function step(name, fn) {
  process.stdout.write(`  ${name} ... `);

  try {
    const detail = fn();

    console.log(detail ? `ok — ${detail}` : "ok");

    steps.push({ name, ok: true });
  } catch (error) {
    console.log("FAILED");

    console.error(`\n${error.message}\n`);

    process.exit(1);
  }
}

function walk(dir, base = "") {
  const files = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const relative = base ? `${base}/${entry.name}` : entry.name;

    if (EXCLUDE.some((pattern) => pattern.test(relative))) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...walk(path.join(dir, entry.name), relative));
    } else {
      files.push(relative);
    }
  }

  return files.sort();
}

console.log("\nContext Capsule — build and package\n");

const pkg = JSON.parse(
  fs.readFileSync(path.join(root, "package.json"), "utf8")
);

let manifest;

step("read manifest", () => {
  manifest = JSON.parse(
    fs.readFileSync(path.join(extensionDir, "manifest.json"), "utf8")
  );

  return `v${manifest.version}`;
});

step("version sync", () => {
  if (manifest.version !== pkg.version) {
    throw new Error(
      `extension/manifest.json is ${manifest.version} but ` +
        `package.json is ${pkg.version}. The store rejects an upload ` +
        "whose version has not increased, so keep these equal."
    );
  }

  const companion = JSON.parse(
    fs.readFileSync(path.join(companionDir, "package.json"), "utf8")
  );

  if (companion.version !== pkg.version) {
    throw new Error(
      `companion/package.json is ${companion.version}, ` +
        `expected ${pkg.version}.`
    );
  }

  /* The store requires a plain dotted numeric version, 1-4 parts. */
  if (!/^\d+(\.\d+){0,3}$/.test(manifest.version)) {
    throw new Error(
      `"${manifest.version}" is not a valid extension version.`
    );
  }

  return `all three at ${pkg.version}`;
});

step("pinned extension id", () => {
  if (!manifest.key) {
    throw new Error(
      "manifest.json has no \"key\", so the extension ID changes " +
        "between an unpacked load and a published build, and the " +
        "native messaging host stops matching.\n" +
        "  Fix: node tools/make-key.mjs --write"
    );
  }

  const spki = Buffer.from(manifest.key, "base64");

  const id = Array.from(
    crypto.createHash("sha256").update(spki).digest().subarray(0, 16)
  )
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .split("")
    .map((character) =>
      String.fromCharCode("a".charCodeAt(0) + parseInt(character, 16))
    )
    .join("");

  return id;
});

if (!skipTests) {
  step("tests", () => {
    /*
     * Invoke vitest's entry script with the current node binary rather than the
     * .cmd shim: recent Node refuses to spawn .cmd without a shell, and adding
     * a shell would mean quoting paths by hand.
     */
    const vitest = path.join(
      root,
      "node_modules",
      "vitest",
      "vitest.mjs"
    );

    if (!fs.existsSync(vitest)) {
      throw new Error(
        "vitest is not installed. Run: npm install"
      );
    }

    const output = execFileSync(
      process.execPath,
      [vitest, "run", "--reporter=dot"],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    );

    /* The reporter colours its output; strip escapes before matching. */
    const count = output
      // eslint-disable-next-line no-control-regex
      .replace(/\[[0-9;]*m/g, "")
      .match(/Tests\s+(\d+) passed/);

    return count ? `${count[1]} passing` : "passing";
  });
} else {
  console.log("  tests ... SKIPPED (--skip-tests)");
}

step("icons", () => {
  execFileSync(
    process.execPath,
    [path.join(root, "tools", "build-icons.mjs")],
    { cwd: root, stdio: ["ignore", "pipe", "pipe"] }
  );

  return "regenerated from brand geometry";
});

let files;

step("collect extension files", () => {
  files = walk(extensionDir);

  if (!files.includes("manifest.json")) {
    throw new Error("manifest.json missing from the collected files.");
  }

  return `${files.length} files`;
});

step("referenced files present", () => {
  const referenced = [
    manifest.background?.service_worker,
    manifest.side_panel?.default_path,
    ...Object.values(manifest.icons || {}),
    ...Object.values(manifest.action?.default_icon || {})
  ].filter(Boolean);

  /* Anything reached by import or href has to be in the zip too. */
  for (const file of files) {
    if (!/\.(js|css|html)$/.test(file)) {
      continue;
    }

    const source = fs.readFileSync(
      path.join(extensionDir, file),
      "utf8"
    );

    for (const pattern of [
      /from "\.\/([\w./-]+)"/g,
      /href="([\w./-]+\.css)"/g,
      /src="([\w./-]+\.js)"/g,
      /@import url\("([\w./-]+)"\)/g,
      /files: \["([\w./-]+)"\]/g
    ]) {
      for (const match of source.matchAll(pattern)) {
        referenced.push(match[1]);
      }
    }
  }

  const missing = [...new Set(referenced)].filter(
    (file) => !files.includes(file)
  );

  if (missing.length) {
    throw new Error(
      `referenced but not packaged: ${missing.join(", ")}`
    );
  }

  return `${new Set(referenced).size} references resolved`;
});

let zipPath;

step("write extension zip", () => {
  fs.mkdirSync(distDir, { recursive: true });

  const entries = files.map((name) => ({
    name,
    data: fs.readFileSync(path.join(extensionDir, name))
  }));

  const zip = createZip(entries);

  zipPath = path.join(
    distDir,
    `context-capsule-extension-${manifest.version}.zip`
  );

  fs.writeFileSync(zipPath, zip);

  const digest = crypto
    .createHash("sha256")
    .update(zip)
    .digest("hex")
    .slice(0, 12);

  return `${(zip.length / 1024).toFixed(1)} KB · sha256:${digest}`;
});

step("verify zip", () => {
  /*
   * Read the archive back through a different implementation than the one that
   * wrote it, and confirm entries sit at the root — a wrapping directory is the
   * most common Web Store rejection.
   */
  const listed = execFileSync(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      "Add-Type -AssemblyName System.IO.Compression.FileSystem; " +
        "[System.IO.Compression.ZipFile]::OpenRead('" +
        zipPath.replaceAll("'", "''") +
        "').Entries | ForEach-Object { $_.FullName }"
    ],
    { encoding: "utf8" }
  )
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const missing = files.filter((file) => !listed.includes(file));

  if (missing.length) {
    throw new Error(`zip is missing: ${missing.join(", ")}`);
  }

  if (!listed.includes("manifest.json")) {
    throw new Error(
      "manifest.json is not at the zip root — the archive wraps a " +
        "directory and the store will reject it."
    );
  }

  return `${listed.length} entries, manifest at root`;
});

step("companion tarball", () => {
  /* Same .cmd problem as vitest: drive npm through its own cli script. */
  const npmCli = path.join(
    path.dirname(process.execPath),
    "node_modules",
    "npm",
    "bin",
    "npm-cli.js"
  );

  if (!fs.existsSync(npmCli)) {
    throw new Error(
      `could not locate npm-cli.js next to ${process.execPath}`
    );
  }

  const out = execFileSync(
    process.execPath,
    [npmCli, "pack", "--pack-destination", distDir],
    {
      cwd: companionDir,
      encoding: "utf8",
      /* npm writes its notices to stderr; keep them out of the log. */
      stdio: ["ignore", "pipe", "pipe"]
    }
  );

  return out.trim().split(/\r?\n/).at(-1);
});

if (wantCrx) {
  step("sign crx", () => {
    if (!fs.existsSync(keyPath)) {
      throw new Error(
        `no signing key at ${keyPath}. Run: node tools/make-key.mjs`
      );
    }

    const chrome = [
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
      "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/usr/bin/google-chrome"
    ].find((candidate) => fs.existsSync(candidate));

    if (!chrome) {
      throw new Error("could not find a Chrome binary to pack with.");
    }

    /* Chrome writes the crx beside the source directory. */
    execFileSync(
      chrome,
      [
        `--pack-extension=${extensionDir}`,
        `--pack-extension-key=${keyPath}`
      ],
      { stdio: ["ignore", "pipe", "pipe"] }
    );

    const produced = path.join(root, "extension.crx");

    const target = path.join(
      distDir,
      `context-capsule-${manifest.version}.crx`
    );

    fs.renameSync(produced, target);

    return path.basename(target);
  });
}

console.log(
  `\nDone. ${steps.length} checks passed. Artifacts in dist/\n`
);

for (const file of fs.readdirSync(distDir).sort()) {
  const { size } = fs.statSync(path.join(distDir, file));

  console.log(
    `  ${file}  ${(size / 1024).toFixed(1)} KB`
  );
}

console.log(
  "\nUpload the extension zip at " +
    "https://chrome.google.com/webstore/devconsole\n" +
    "A privacy policy is mandatory: this extension handles user data " +
    "even though it never leaves the machine.\n"
);
