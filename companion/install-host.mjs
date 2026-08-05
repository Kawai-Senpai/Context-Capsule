import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";

import {
  fileURLToPath
} from "node:url";

import {
  execFile
} from "node:child_process";

import {
  promisify
} from "node:util";

const execFileAsync =
  promisify(execFile);

const here = path.dirname(
  fileURLToPath(import.meta.url)
);

const extensionId =
  process.argv[2];

if (
  !extensionId ||
  !/^[a-p]{32}$/.test(
    extensionId
  )
) {
  console.error(
    "Usage: node install-host.mjs <32-character Chrome extension ID>"
  );

  process.exit(1);
}

const hostName =
  "com.contextcapsule.host";

const launcherPath =
  path.join(
    here,

    process.platform === "win32"
      ? "context-capsule-host.cmd"
      : "context-capsule-host.sh"
  );

const nativeHostPath =
  path.join(
    here,
    "native-host.js"
  );

if (
  process.platform === "win32"
) {
  await fs.writeFile(
    launcherPath,

    `@echo off\r\n` +
      `"${process.execPath}" ` +
      `"${nativeHostPath}"\r\n`,

    "utf8"
  );
} else {
  await fs.writeFile(
    launcherPath,

    `#!/bin/sh\n` +
      `exec "${process.execPath}" ` +
      `"${nativeHostPath}"\n`,

    {
      mode: 0o755
    }
  );
}

const manifest = {
  name: hostName,

  description:
    "Local storage host for Context Capsule",

  path: launcherPath,
  type: "stdio",

  allowed_origins: [
    `chrome-extension://${extensionId}/`
  ]
};

const manifestJson =
  JSON.stringify(
    manifest,
    null,
    2
  );

if (
  process.platform === "darwin"
) {
  const directory = path.join(
    os.homedir(),

    "Library/Application Support/Google/Chrome/NativeMessagingHosts"
  );

  await fs.mkdir(directory, {
    recursive: true
  });

  const target = path.join(
    directory,
    `${hostName}.json`
  );

  await fs.writeFile(
    target,
    manifestJson,
    "utf8"
  );

  console.log(
    `Installed native host manifest: ${target}`
  );
} else if (
  process.platform === "linux"
) {
  const directory = path.join(
    os.homedir(),

    ".config/google-chrome/NativeMessagingHosts"
  );

  await fs.mkdir(directory, {
    recursive: true
  });

  const target = path.join(
    directory,
    `${hostName}.json`
  );

  await fs.writeFile(
    target,
    manifestJson,
    "utf8"
  );

  console.log(
    `Installed native host manifest: ${target}`
  );
} else if (
  process.platform === "win32"
) {
  const target = path.join(
    here,
    `${hostName}.json`
  );

  await fs.writeFile(
    target,
    manifestJson,
    "utf8"
  );

  await execFileAsync(
    "reg",
    [
      "add",

      `HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\${hostName}`,

      "/ve",
      "/t",
      "REG_SZ",
      "/d",
      target,
      "/f"
    ]
  );

  console.log(
    "Installed native host registry entry pointing to: " +
      target
  );
} else {
  throw new Error(
    `Unsupported platform: ${process.platform}`
  );
}
