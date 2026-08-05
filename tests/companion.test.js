import { describe, expect, it } from "vitest";

import {
  safeCaptureId,
  safeRelativePath,
  capsuleFile,
  capsuleDirectory,
  mimeTypeFor,
  ROOT
} from "../companion/common.js";

/*
 * The companion writes to the filesystem on behalf of a browser extension, so
 * every path it accepts is attacker-adjacent input. These are the tests that
 * keep a capsule from writing outside its own directory.
 */

describe("safeCaptureId", () => {
  it("accepts the id format the panel generates", () => {
    const id = "context-capsule-2026-08-05T18-24-00-000Z";

    expect(safeCaptureId(id)).toBe(id);
  });

  it.each([
    ["empty", ""],
    ["undefined", undefined],
    ["traversal", "../etc"],
    ["separator", "a/b"],
    ["backslash", "a\\b"],
    ["nul byte", "a\u0000b"],
    ["too long", "a".repeat(161)]
  ])("rejects %s", (_label, value) => {
    expect(() => safeCaptureId(value)).toThrow(/Invalid capture ID/);
  });
});

describe("safeRelativePath", () => {
  it("normalises nested capsule paths", () => {
    expect(safeRelativePath("visual/views/../board.png")).toBe(
      "visual/board.png"
    );
  });

  it("accepts backslashes from a Windows client", () => {
    expect(safeRelativePath("page\\dom-tree.json")).toBe(
      "page/dom-tree.json"
    );
  });

  it.each([
    ["parent escape", "../secrets.txt"],
    ["nested escape", "visual/../../secrets.txt"],
    ["posix absolute", "/etc/passwd"],
    ["empty", ""],
    ["dot", "."]
  ])("rejects %s", (_label, value) => {
    expect(() => safeRelativePath(value)).toThrow(/Invalid file path/);
  });
});

describe("capsuleFile", () => {
  it("resolves inside the capsule directory", () => {
    const target = capsuleFile("abc", "visual/board.png");

    expect(target.startsWith(capsuleDirectory("abc"))).toBe(true);
  });

  it("refuses to escape the capsule directory", () => {
    expect(() => capsuleFile("abc", "../../evil.txt")).toThrow();
  });

  it("refuses a Windows drive-absolute path", () => {
    expect(() => capsuleFile("abc", "C:\\Windows\\evil.txt")).toThrow();
  });

  it("keeps every capsule under one root", () => {
    expect(capsuleDirectory("abc").startsWith(ROOT)).toBe(true);
  });
});

describe("mimeTypeFor", () => {
  it.each([
    ["board.png", "image/png"],
    ["manifest.json", "application/json"],
    ["README_FOR_AGENT.md", "text/markdown"]
  ])("maps %s", (name, expected) => {
    expect(mimeTypeFor(name)).toContain(expected);
  });
});
