import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";

export const ROOT =
  process.env.CONTEXT_CAPSULE_DIR ||
  path.join(
    os.tmpdir(),
    "context-capsules"
  );

export async function ensureRoot() {
  await fs.mkdir(ROOT, {
    recursive: true,
    mode: 0o700
  });

  return ROOT;
}

export function safeCaptureId(
  value
) {
  const id = String(value || "");

  if (
    !/^[A-Za-z0-9._-]{1,160}$/.test(
      id
    )
  ) {
    throw new Error(
      "Invalid capture ID."
    );
  }

  return id;
}

export function safeRelativePath(
  value
) {
  const normalized =
    path.posix.normalize(
      String(value || "")
        .replaceAll("\\", "/")
    );

  if (
    !normalized ||
    normalized === "." ||
    normalized.startsWith("../") ||
    normalized.includes("/../") ||
    path.posix.isAbsolute(
      normalized
    )
  ) {
    throw new Error(
      "Invalid file path."
    );
  }

  return normalized;
}

export function capsuleDirectory(
  captureId
) {
  return path.join(
    ROOT,
    safeCaptureId(captureId)
  );
}

export function capsuleFile(
  captureId,
  relativePath
) {
  const root =
    capsuleDirectory(captureId);

  const target = path.resolve(
    root,
    safeRelativePath(relativePath)
  );

  if (
    target !== root &&
    !target.startsWith(
      `${root}${path.sep}`
    )
  ) {
    throw new Error(
      "Path escaped the capsule directory."
    );
  }

  return target;
}

export async function listCaptureIds() {
  await ensureRoot();

  const entries = await fs.readdir(
    ROOT,
    {
      withFileTypes: true
    }
  );

  return entries
    .filter((entry) =>
      entry.isDirectory()
    )
    .map((entry) => entry.name)
    .sort()
    .reverse();
}

export async function walkFiles(
  directory,
  prefix = ""
) {
  const entries = await fs.readdir(
    directory,
    {
      withFileTypes: true
    }
  );

  const output = [];

  for (const entry of entries) {
    const relative = prefix
      ? `${prefix}/${entry.name}`
      : entry.name;

    const absolute =
      path.join(
        directory,
        entry.name
      );

    if (entry.isDirectory()) {
      output.push(
        ...await walkFiles(
          absolute,
          relative
        )
      );
    } else if (entry.isFile()) {
      output.push(relative);
    }
  }

  return output.sort();
}

export function mimeTypeFor(
  filePath
) {
  const extension =
    path.extname(filePath)
      .toLowerCase();

  return {
    ".json": "application/json",
    ".md": "text/markdown",
    ".txt": "text/plain",
    ".html": "text/html",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".har": "application/json"
  }[extension] ||
    "application/octet-stream";
}
