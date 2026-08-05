import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it
} from "vitest";

/*
 * End-to-end over the real transports: length-prefixed native messaging into
 * the host process, then MCP stdio out of the server process. These run the
 * actual binaries, so a broken frame format or a bad tool schema fails here
 * rather than in a browser.
 */

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

const companion = path.join(root, "companion");

let capsuleDir;

let env;

beforeAll(async () => {
  capsuleDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "cc-test-")
  );

  env = { ...process.env, CONTEXT_CAPSULE_DIR: capsuleDir };
});

afterAll(async () => {
  await fs.rm(capsuleDir, { recursive: true, force: true });
});

/** Drive companion/native-host.js over its real framing. */
function nativeHost() {
  const child = spawn(
    process.execPath,
    [path.join(companion, "native-host.js")],
    { env, stdio: ["pipe", "pipe", "pipe"] }
  );

  const replies = [];

  const waiters = [];

  let buffer = Buffer.alloc(0);

  child.stdout.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    while (buffer.length >= 4) {
      const length = buffer.readUInt32LE(0);

      if (buffer.length < 4 + length) {
        return;
      }

      const message = JSON.parse(
        buffer.subarray(4, 4 + length).toString("utf8")
      );

      buffer = buffer.subarray(4 + length);

      replies.push(message);

      waiters.shift()?.(message);
    }
  });

  let id = 0;

  return {
    child,

    send(type, payload = {}) {
      const message = { id: `n${id++}`, type, ...payload };

      const body = Buffer.from(JSON.stringify(message), "utf8");

      const header = Buffer.alloc(4);

      header.writeUInt32LE(body.length, 0);

      const reply = new Promise((resolve) => waiters.push(resolve));

      child.stdin.write(Buffer.concat([header, body]));

      return reply;
    },

    replies,

    close() {
      child.kill();
    }
  };
}

/** Drive companion/mcp-server.js over MCP stdio. */
async function mcp(requests) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.join(companion, "mcp-server.js")],
      { env, stdio: ["pipe", "pipe", "pipe"] }
    );

    let out = "";

    let stderr = "";

    child.stdout.on("data", (chunk) => {
      out += chunk;
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", reject);

    child.on("close", () => {
      const messages = out
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line));

      if (!messages.length) {
        reject(
          new Error(`No MCP output. stderr: ${stderr}`)
        );

        return;
      }

      resolve(messages);
    });

    child.stdin.write(
      requests.map((r) => JSON.stringify(r)).join("\n") + "\n"
    );

    /* Give the server a moment to answer before closing stdin. */
    setTimeout(() => child.stdin.end(), 600);
  });
}

const init = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "vitest", version: "0" }
  }
};

const initialized = {
  jsonrpc: "2.0",
  method: "notifications/initialized"
};

describe("native messaging host", () => {
  it("writes a capsule and reports its uri", async () => {
    const host = nativeHost();

    const captureId = "context-capsule-test-01";

    const begin = await host.send("BEGIN", { captureId });

    expect(begin.ok).toBe(true);

    const put = await host.send("PUT_FILE", {
      captureId,
      path: "manifest.json",
      data: '{"captureId":"context-capsule-test-01"}'
    });

    expect(put.ok).toBe(true);
    expect(put.result.bytes).toBeGreaterThan(0);

    const image = await host.send("PUT_FILE", {
      captureId,
      path: "visual/board.png",
      encoding: "base64",
      data: Buffer.from("fake-png").toString("base64")
    });

    expect(image.ok).toBe(true);

    const finalize = await host.send("FINALIZE", { captureId });

    expect(finalize.ok).toBe(true);
    expect(finalize.result.uri).toBe(
      `capsule://${captureId}`
    );

    const written = await fs.readFile(
      path.join(capsuleDir, captureId, "visual", "board.png"),
      "utf8"
    );

    expect(written).toBe("fake-png");

    host.close();
  });

  it("refuses a path that escapes the capsule directory", async () => {
    const host = nativeHost();

    const reply = await host.send("PUT_FILE", {
      captureId: "context-capsule-test-01",
      path: "../../escaped.txt",
      data: "nope"
    });

    expect(reply.ok).toBe(false);
    expect(reply.error).toMatch(/Invalid file path/);

    await expect(
      fs.readFile(path.join(capsuleDir, "..", "escaped.txt"))
    ).rejects.toThrow();

    host.close();
  });

  it("refuses a malformed capture id", async () => {
    const host = nativeHost();

    const reply = await host.send("BEGIN", {
      captureId: "../../../etc"
    });

    expect(reply.ok).toBe(false);
    expect(reply.error).toMatch(/Invalid capture ID/);

    host.close();
  });

  it("reports unknown message types instead of dying", async () => {
    const host = nativeHost();

    const reply = await host.send("NOPE");

    expect(reply.ok).toBe(false);
    expect(reply.error).toMatch(/Unknown native message type/);

    /* Still alive and serving. */
    const after = await host.send("BEGIN", {
      captureId: "context-capsule-test-02"
    });

    expect(after.ok).toBe(true);

    host.close();
  });

  it("survives a frame split across two chunks", async () => {
    const host = nativeHost();

    const message = Buffer.from(
      JSON.stringify({
        id: "split",
        type: "BEGIN",
        captureId: "context-capsule-test-03"
      })
    );

    const header = Buffer.alloc(4);

    header.writeUInt32LE(message.length, 0);

    const framed = Buffer.concat([header, message]);

    host.child.stdin.write(framed.subarray(0, 6));

    await new Promise((resolve) => setTimeout(resolve, 80));

    host.child.stdin.write(framed.subarray(6));

    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(host.replies.at(-1)).toMatchObject({
      id: "split",
      ok: true
    });

    host.close();
  });
});

describe("MCP server", () => {
  it("advertises the capsule tools", async () => {
    const messages = await mcp([
      init,
      initialized,
      { jsonrpc: "2.0", id: 2, method: "tools/list" }
    ]);

    const tools = messages
      .find((message) => message.id === 2)
      .result.tools.map((tool) => tool.name);

    expect(tools).toEqual([
      "list_captures",
      "list_capture_files",
      "read_capture_file"
    ]);
  });

  it("reads back a capsule the native host wrote", async () => {
    const messages = await mcp([
      init,
      initialized,
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "list_capture_files",
          arguments: { captureId: "context-capsule-test-01" }
        }
      },
      {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "read_capture_file",
          arguments: {
            captureId: "context-capsule-test-01",
            path: "manifest.json"
          }
        }
      }
    ]);

    const listed = messages.find((message) => message.id === 2);

    expect(listed.result.content[0].text).toContain(
      "visual/board.png"
    );

    const read = messages.find((message) => message.id === 3);

    expect(read.result.content[0].text).toContain(
      "context-capsule-test-01"
    );
  });

  it("refuses to read outside a capsule", async () => {
    const messages = await mcp([
      init,
      initialized,
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "read_capture_file",
          arguments: {
            captureId: "context-capsule-test-01",
            path: "../../../../Windows/win.ini"
          }
        }
      }
    ]);

    const reply = messages.find((message) => message.id === 2);

    const text = JSON.stringify(reply);

    expect(text).toMatch(/Invalid file path|error|isError/i);
    expect(text).not.toMatch(/\[fonts\]/i);
  });
});
