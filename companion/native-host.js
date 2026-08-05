import fs from "node:fs/promises";
import path from "node:path";

import {
  stdin,
  stdout
} from "node:process";

import {
  ensureRoot,
  capsuleDirectory,
  capsuleFile,
  safeCaptureId
} from "./common.js";

let buffer = Buffer.alloc(0);

await ensureRoot();

stdin.on("data", (chunk) => {
  buffer = Buffer.concat([
    buffer,
    chunk
  ]);

  void drainMessages();
});

stdin.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});

async function drainMessages() {
  while (buffer.length >= 4) {
    const length =
      buffer.readUInt32LE(0);

    if (
      length >
      64 * 1024 * 1024
    ) {
      throw new Error(
        "Incoming native message is too large."
      );
    }

    if (
      buffer.length <
      4 + length
    ) {
      return;
    }

    const payload =
      buffer.subarray(
        4,
        4 + length
      );

    buffer =
      buffer.subarray(
        4 + length
      );

    let message;

    try {
      message = JSON.parse(
        payload.toString("utf8")
      );

      const result =
        await handleMessage(
          message
        );

      send({
        id: message.id,
        ok: true,
        result
      });
    } catch (error) {
      send({
        id: message?.id,
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : String(error)
      });
    }
  }
}

async function handleMessage(
  message
) {
  switch (message.type) {
    case "BEGIN": {
      const captureId =
        safeCaptureId(
          message.captureId
        );

      const directory =
        capsuleDirectory(
          captureId
        );

      await fs.rm(directory, {
        recursive: true,
        force: true
      });

      await fs.mkdir(directory, {
        recursive: true,
        mode: 0o700
      });

      return {
        captureId,
        directory
      };
    }

    case "PUT_FILE": {
      const captureId =
        safeCaptureId(
          message.captureId
        );

      const target =
        capsuleFile(
          captureId,
          message.path
        );

      await fs.mkdir(
        path.dirname(target),
        {
          recursive: true,
          mode: 0o700
        }
      );

      const data =
        message.encoding ===
        "base64"
          ? Buffer.from(
              String(
                message.data || ""
              ),
              "base64"
            )
          : Buffer.from(
              String(
                message.data || ""
              ),
              "utf8"
            );

      await fs.writeFile(
        target,
        data,
        {
          mode: 0o600
        }
      );

      return {
        captureId,
        path: message.path,
        bytes: data.length
      };
    }

    case "FINALIZE": {
      const captureId =
        safeCaptureId(
          message.captureId
        );

      const directory =
        capsuleDirectory(
          captureId
        );

      const marker =
        capsuleFile(
          captureId,
          ".complete.json"
        );

      await fs.writeFile(
        marker,

        JSON.stringify(
          {
            captureId,

            finalizedAt:
              new Date()
                .toISOString()
          },
          null,
          2
        ),

        {
          mode: 0o600
        }
      );

      return {
        captureId,
        directory,
        uri:
          `capsule://${captureId}`
      };
    }

    default:
      throw new Error(
        `Unknown native message type: ${message.type}`
      );
  }
}

function send(message) {
  const payload = Buffer.from(
    JSON.stringify(message),
    "utf8"
  );

  if (
    payload.length >
    1024 * 1024
  ) {
    throw new Error(
      "Outgoing native message exceeds Chrome's 1 MiB limit."
    );
  }

  const header =
    Buffer.alloc(4);

  header.writeUInt32LE(
    payload.length,
    0
  );

  stdout.write(
    Buffer.concat([
      header,
      payload
    ])
  );
}
