import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/*
 * Cross-file contracts. The extension is four files that talk to each other by
 * string: element ids, message types and tool names. Nothing at runtime checks
 * that they still agree, and a typo shows up as a silently dead button. These
 * tests are the check.
 */

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

const read = (relative) =>
  fs.readFileSync(path.join(root, relative), "utf8");

const panelJs = read("extension/sidepanel.js");
const panelHtml = read("extension/sidepanel.html");
const backgroundJs = read("extension/background.js");
const contentJs = read("extension/content.js");
const manifest = JSON.parse(read("extension/manifest.json"));

const unique = (values) => [...new Set(values)];

const matchAll = (source, pattern) =>
  unique([...source.matchAll(pattern)].map((match) => match[1]));

describe("panel markup", () => {
  it("defines every element the panel script looks up", () => {
    const ids = matchAll(panelJs, /\$\("#([\w-]+)"\)/g);

    expect(ids.length).toBeGreaterThan(8);

    for (const id of ids) {
      expect(
        panelHtml.includes(`id="${id}"`),
        `sidepanel.html is missing id="${id}"`
      ).toBe(true);
    }
  });

  it("loads the panel script as a module so imports resolve", () => {
    /* redact.js is imported by the panel; a classic script would throw. */
    expect(panelJs).toMatch(/^import .* from "\.\/redact\.js";/m);
    expect(panelHtml).toMatch(
      /<script[\s\S]*?type="module"[\s\S]*?sidepanel\.js/
    );
  });

  it("ships every stylesheet it references", () => {
    const hrefs = matchAll(panelHtml, /href="([\w./-]+\.css)"/g);

    for (const href of hrefs) {
      expect(
        fs.existsSync(path.join(root, "extension", href)),
        `missing stylesheet ${href}`
      ).toBe(true);
    }

    const imports = matchAll(
      read("extension/sidepanel.css"),
      /@import url\("([\w./-]+)"\)/g
    );

    for (const target of imports) {
      expect(
        fs.existsSync(path.join(root, "extension", target))
      ).toBe(true);
    }
  });
});

describe("panel to worker protocol", () => {
  it("the worker handles every message the panel sends", () => {
    const sent = matchAll(panelJs, /request\(\s*"([A-Z_]+)"/g);

    expect(sent).toContain("ARM");
    expect(sent).toContain("CAPTURE_FRAME");

    for (const type of sent) {
      expect(
        backgroundJs.includes(`case "${type}":`),
        `background.js does not handle ${type}`
      ).toBe(true);
    }
  });

  it("the panel sends every message the worker handles", () => {
    const handled = matchAll(
      backgroundJs,
      /case "([A-Z_]+)":\n\s+result =/g
    );

    for (const type of handled) {
      expect(
        panelJs.includes(`"${type}"`),
        `no panel caller for ${type}`
      ).toBe(true);
    }
  });

  it("uses one port name on both ends", () => {
    const name = "context-capsule-panel";

    expect(panelJs).toContain(name);
    expect(backgroundJs).toContain(name);
  });
});

describe("worker to content protocol", () => {
  it("the content script handles every CC_ message the worker sends", () => {
    const sent = matchAll(backgroundJs, /type: "(CC_[A-Z_]+)"/g);

    expect(sent).toContain("CC_START");
    expect(sent).toContain("CC_PREPARE_CAPTURE");

    for (const type of sent) {
      if (type === "CC_STATUS_CHANGED") {
        /* Panel-bound broadcast, not a content-script message. */
        expect(panelJs).toContain(type);

        continue;
      }

      expect(
        contentJs.includes(`"${type}"`),
        `content.js does not handle ${type}`
      ).toBe(true);
    }
  });

  it("keeps the tool names in the panel and the overlay aligned", () => {
    const tools = matchAll(panelHtml, /data-tool="(\w+)"/g);

    expect(tools).toEqual([
      "select",
      "region",
      "box",
      "arrow",
      "pen",
      "text"
    ]);

    for (const tool of tools) {
      expect(
        contentJs.includes(`"${tool}"`),
        `content.js has no handling for the ${tool} tool`
      ).toBe(true);
    }
  });
});

describe("native host contract", () => {
  it("uses the same host name as the installer", () => {
    const installer = read("companion/install-host.mjs");

    const name = "com.contextcapsule.host";

    expect(panelJs).toContain(name);
    expect(installer).toContain(name);
  });

  it("sends only message types the host implements", () => {
    const host = read("companion/native-host.js");

    for (const type of ["BEGIN", "PUT_FILE", "FINALIZE"]) {
      expect(panelJs).toContain(`"${type}"`);
      expect(host).toContain(`case "${type}":`);
    }
  });
});

describe("manifest", () => {
  it("declares the permissions the code actually calls", () => {
    const required = {
      debugger: /chrome\.debugger\./,
      scripting: /chrome\.scripting\./,
      storage: /chrome\.storage\./,
      sidePanel: /chrome\.sidePanel\./,
      tabs: /chrome\.tabs\.(onUpdated|query)/,
      downloads: /chrome\.downloads\./,
      nativeMessaging: /connectNative/
    };

    const source = panelJs + backgroundJs;

    for (const [permission, pattern] of Object.entries(required)) {
      if (pattern.test(source)) {
        expect(
          manifest.permissions,
          `manifest is missing "${permission}"`
        ).toContain(permission);
      }
    }
  });

  it("ships every file it points at", () => {
    const referenced = [
      manifest.background.service_worker,
      manifest.side_panel.default_path,
      ...Object.values(manifest.icons),
      ...Object.values(manifest.action.default_icon)
    ];

    for (const file of unique(referenced)) {
      expect(
        fs.existsSync(path.join(root, "extension", file)),
        `missing ${file}`
      ).toBe(true);
    }
  });

  it("injects a content script that exists", () => {
    const injected = matchAll(
      backgroundJs,
      /files: \["([\w.-]+)"\]/g
    );

    for (const file of injected) {
      expect(
        fs.existsSync(path.join(root, "extension", file))
      ).toBe(true);
    }
  });
});

describe("release identity", () => {
  it("keeps all three versions in sync", () => {
    const pkg = JSON.parse(read("package.json"));

    const companion = JSON.parse(read("companion/package.json"));

    /*
     * The store rejects an upload whose version has not increased, and a
     * companion that disagrees with the extension makes bug reports useless.
     */
    expect(manifest.version).toBe(pkg.version);
    expect(companion.version).toBe(pkg.version);
    expect(manifest.version).toMatch(/^\d+(\.\d+){0,3}$/);
  });

  it("pins the extension id so the native host keeps matching", () => {
    /*
     * Without "key", an unpacked build's ID comes from its directory path while
     * a published build gets a store-assigned one — and the host's
     * allowed_origins, which permits no wildcards, silently stops matching.
     */
    expect(manifest.key, "run: node tools/make-key.mjs --write").toBeTruthy();

    expect(() =>
      Buffer.from(manifest.key, "base64")
    ).not.toThrow();

    /* An RSA-2048 SubjectPublicKeyInfo is 294 bytes. */
    expect(Buffer.from(manifest.key, "base64")).toHaveLength(294);
  });

  it("never commits the private signing key", () => {
    const ignored = read(".gitignore");

    expect(ignored).toMatch(/^keys\/$/m);
    expect(ignored).toMatch(/^dist\/$/m);
  });
});

describe("worker durability", () => {
  it("keeps no capture state in service-worker globals", () => {
    /*
     * The regression guard for the defect this rewrite existed to fix: a
     * module-level Map of sessions is silently emptied when Chrome terminates
     * the worker.
     */
    expect(backgroundJs).not.toMatch(
      /^const sessions = new Map\(\)/m
    );

    expect(backgroundJs).toContain(
      'from "./session-store.js"'
    );
  });

  it("flushes on suspend, detach and capture", () => {
    expect(backgroundJs).toMatch(/onSuspend[\s\S]{0,80}flushAll/);
    expect(backgroundJs).toMatch(/onDetach[\s\S]{0,600}flush\(/);
  });
});
