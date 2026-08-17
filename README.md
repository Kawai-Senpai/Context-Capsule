<div align="center">

<img src="brand/banner.svg" alt="Context Capsule — point at the bug, ship the evidence" width="100%">

<br>

**Select any part of a live web application and package everything a coding agent needs to understand it.**

<br>

[![tests](https://img.shields.io/badge/tests-125%20passing-2AD9C4?style=flat-square&labelColor=0B0A12)](tests)
[![manifest](https://img.shields.io/badge/chrome-manifest%20v3-7C6BFF?style=flat-square&labelColor=0B0A12)](extension/manifest.json)
[![agent interface](https://img.shields.io/badge/agents-MCP%20stdio-7C6BFF?style=flat-square&labelColor=0B0A12)](companion/mcp-server.js)
[![storage](https://img.shields.io/badge/data-local%20only-2AD9C4?style=flat-square&labelColor=0B0A12)](#security)
[![status](https://img.shields.io/badge/status-working%20MVP-FFB454?style=flat-square&labelColor=0B0A12)](#what-works-and-what-doesnt)

</div>

---

## The problem

You hand your coding agent a screenshot and say *"fix this."*

The agent gets a flat image. It cannot see which component rendered that box, what
props it received, which API call produced the text, what the console said two
seconds earlier, or what you actually wanted instead.

Context Capsule turns:

> *"Something is wrong around here"*

into:

> *"**This** exact component, rendered by **this** component tree, using **this**
> state and API response, looked like **this** at **this** moment, after **these**
> actions, with **these** errors."*

The human points at what matters. The extension collects only the technical
evidence relevant to that selection, redacts the credentials, and writes a
structured capsule an agent can read over MCP.

---

## How it works

<div align="center">
  <img src="brand/flow.svg" alt="You arm capture and point at a component; the extension records console, network, DOM and CSS; the companion redacts and seals a capsule; the agent reads it over MCP." width="100%">
</div>

Every selection gets an ID — `A`, `B`, `C` — and that ID is the join key across
the screenshot, the DOM files, the component state and the manifest.

---

## What goes in a capsule

```text
context-capsule-2026-08-05T18-24-00-000Z/
├── manifest.json                     ← the index: intent, page, frames, selections
├── README_FOR_AGENT.md               ← read order and rules, written for the agent
├── prompt.md                         ← one-paragraph task statement
├── integrity.json                    ← SHA-256, byte count and encoding per file
├── visual/
│   ├── board.png                     ← numbered collage of every frame
│   └── frame-01.png …                ← full-resolution frames, never only the collage
├── page/
│   ├── frame-01-selection.json       ← subtree, ancestors, siblings, boxes, styles, a11y
│   └── frame-01-cdp.json             ← per-node CDP: matched rules, AX tree, listeners
├── runtime/
│   └── frame-01-runtime.json         ← console, exceptions, network, bodies, navigations
├── framework/
│   └── frame-01-app-context.json     ← route, state, flags, components (needs the bridge)
└── security/
    └── redaction-report.json         ← what was stripped, and what still needs a look
```

The capsule states its own limits. `captureWindow.note` says runtime evidence
begins when you armed capture, `truncated` flags say which buffers hit their cap,
and `domSnapshotSkipped` says the full-page snapshot was not requested — so an
agent never reads *absence of evidence* as *evidence of absence*.

---

## Install

**1. Companion dependencies**

```bash
cd companion
npm install
```

**2. Load the extension**

`chrome://extensions` → enable **Developer mode** → **Load unpacked** →
select `extension/` → copy the 32-character extension ID.

**3. Register the native messaging host**

```bash
cd companion
node install-host.mjs YOUR_EXTENSION_ID
```

The ID must be exactly 32 lowercase characters in `a`–`p`. Restart Chrome so it
picks up the host manifest.

**4. Point your agent at the MCP server**

```json
{
  "mcpServers": {
    "context-capsule": {
      "command": "node",
      "args": ["C:/Ranit/Libs/Fe-shot/companion/mcp-server.js"]
    }
  }
}
```

Tools: `list_captures` · `list_capture_files` · `read_capture_file`.

---

## Use

| Step | Action |
| --- | --- |
| **Arm** | Attaches the debugger and starts the rolling buffer. The status pill pulses while recording. |
| **Select** | Click a component. <kbd>Shift</kbd>+click adds more. <kbd>↑</kbd><kbd>↓</kbd> walk parent/child, <kbd>←</kbd><kbd>→</kbd> walk siblings. |
| **Mark** | Region, box, arrow, pen, text. Annotations are stored as JSON *and* drawn into the frame. |
| **Describe** | What is wrong, what should happen. This is the single most valuable field in the capsule. |
| **Add frames** | Change viewport, route, theme or state and capture again. Frames become a numbered board. |
| **Review** | See what is included, what was stripped, and what still needs a human eye. |
| **Export** | Writes the capsule locally and copies an agent prompt to the clipboard. |

Capsules land in `%TEMP%/context-capsules/<captureId>` — override with
`CONTEXT_CAPSULE_DIR`.

---

## Security

This tool can see anything your browser can see, so the defaults are strict.

- **Local only.** No cloud, no account, no telemetry, nothing leaves the machine.
- **Nothing is captured until you arm it**, and the pill pulses the whole time.
- **Authorization and cookie headers never make it to disk.** Neither do
  credential-shaped object keys, password or payment fields, or binary bodies.
- **Redaction runs at ingest**, before anything is stored: bearer tokens, JWTs
  (header-verified), vendor API keys, private key blocks, Luhn-valid card
  numbers, emails, and bare high-entropy tokens caught by an entropy sweep.
- **Response bodies are capped** at 1 MB; whole capsules at 100 MB.
- **Every export is reviewed.** A second, independent pass runs over the finished
  capsule; if it still finds anything credential-shaped, the export stops and
  asks you.

Regex and entropy scanning are a safety net, **not a security model**, and the
redaction report says so in writing. Treat a capsule as sensitive.

---

## What works, and what doesn't

**Verified by the test suite** — `npm test`, 106 tests:

| Area | Covered |
| --- | --- |
| Redaction | Tokens, JWTs, vendor keys, cards, emails, entropy sweep — and the false positives that must *survive* (semver, order IDs, minified chains) |
| Worker termination | A session written, the module registry reset, and every event, request and body read back |
| Buffer discipline | Caps, oldest-first eviction, monotonic sequence numbers, rolling-window filtering, truncation flags |
| Path safety | Traversal, absolute paths and drive-letter escapes rejected — in the library *and* through the running native host |
| Companion transports | Real length-prefixed framing (including a frame split across two chunks) and real MCP `initialize` / `tools/list` / `tools/call` |
| Clock handling | Monotonic CDP timestamps anchored to wall time, ordering preserved, no future timestamps |
| Cross-file wiring | Every panel element id, message type, tool name, host name and manifest permission checked against the file that has to agree with it |

**Known gaps.** These are real, and none of them are hidden in a footnote:

- **Cross-origin iframes and workers are only partly handled.** Flat auto-attach
  is on and child sessions are recorded, but CDP domains are not yet enabled
  per child target.
- **Runtime evidence starts at arm time.** Nothing before that is recoverable.
- **Framework provenance needs the bridge.** Without `bridge/`, component names,
  props and store state are unavailable; there are no React/Vue/Angular adapters
  yet.
- **API-field → DOM-text mapping is not proven.** No generic extension can prove
  it through selectors, caches and transforms. The bridge is how exact
  provenance gets added.
- **The browser-side flow has not been exercised in a live Chrome session.**
  The companion half is covered end to end; the extension half is not.
- **Not a shipped product.** No signed installer, no store package, no privacy
  policy, no auto-update. The companion needs Node on the machine.

---

## Build and package

There is no bundler — the extension ships the sources it was written in. So the
build is: prove the tests pass, regenerate the icons from the brand geometry,
check the version numbers agree, and write the artifacts.

```bash
npm run package            # tests -> icons -> verify -> dist/
npm run package -- --crx   # also sign a CRX with keys/*.pem
```

```
  read manifest ............ ok - v0.2.0
  version sync ............. ok - all three at 0.2.0
  pinned extension id ...... ok - nffphcchkkpimeaamogjbpkpjmmfneea
  tests .................... ok - 106 passing
  icons .................... ok - regenerated from brand geometry
  collect extension files .. ok - 13 files
  referenced files present . ok - 12 references resolved
  write extension zip ...... ok - 41.6 KB - sha256:9d06d69ae0d6
  verify zip ............... ok - 13 entries, manifest at root
  companion tarball ........ ok - context-capsule-companion-0.2.0.tgz
```

Every gate is fatal — a package that skipped its tests is worse than no package,
because it looks finished. The zip is **deterministic**: same sources in,
byte-identical archive out, so "did this upload actually change?" has an answer.
It is verified by reading the archive back through a different implementation
than the one that wrote it, confirming `manifest.json` sits at the root — a
wrapping directory is the most common store rejection.

### The extension ID is pinned, and this matters

An unpacked extension's ID comes from its **directory path**; a published one
gets a **store-assigned** ID. The native messaging host is pinned to one ID in
`allowed_origins`, where wildcards are not permitted. So without pinning, the
host you registered in development silently stops matching in production and the
panel just reports a disconnected host.

```bash
npm run key -- --write     # generate keys/, derive the ID, pin it in the manifest
```

This project's ID is **`nffphcchkkpimeaamogjbpkpjmmfneea`**, identical for
unpacked loads, the store zip and a signed CRX. Verified against Chrome's own
packer: the `crx_id` Chrome embeds in the CRX signed header matches
`sha256(manifest.key)[0..16]` byte for byte.

`keys/context-capsule.pem` signs self-hosted CRXs and proves ownership of the
listing. It is gitignored — **back it up**, because losing it means losing the
ability to update a published extension. Pin the key *before* first publish; the
store binds the ID permanently.

### Distributing

| Target | How | Catch |
| --- | --- | --- |
| Development | Load unpacked from `extension/` | Re-run `install-host.mjs` whenever the ID changes |
| Web Store | Upload `dist/*-extension-*.zip` | Privacy policy mandatory; `debugger` + `nativeMessaging` means slow review |
| Self-hosted CRX | `npm run package -- --crx` | Chrome on Windows/macOS **refuses** non-store CRX installs without enterprise policy (`ExtensionInstallForcelist`) |
| Companion | `dist/*-companion-*.tgz` then `node install-host.mjs <id>` | Needs Node on the machine; the launcher hardcodes the current `node` path, so upgrading Node breaks it |

`install-host.mjs` registers per-OS: a `NativeMessagingHosts/*.json` file on
macOS and Linux, an `HKCU` registry value under
`Software\Google\Chrome\NativeMessagingHosts` on Windows. Chrome only — Edge and
Brave need their own paths.

Still out of reach from a repository: signed MSI/MSIX (Windows code-signing
certificate), notarized macOS app (Apple Developer ID), store listing assets and
a privacy policy URL. Those need credentials and legal ownership only you have.

---

## Layout

```text
extension/    MV3 extension — side panel, overlay, CDP capture, durable sessions
  ├── background.js      orchestration; holds no capture state in worker memory
  ├── session-store.js   chrome.storage.session persistence + bounded buffers
  ├── redact.js          pure, unit-tested redaction and review scanning
  └── content.js         selection overlay, annotation, page-side snapshotting
companion/    Node native-messaging host + MCP stdio server
bridge/       Optional in-app SDK for exact render provenance
brand/        Mark, lockup, banner and the brand rules
tools/        Icon generator, extension-ID pinning, packaging pipeline
tests/        Vitest suite
```

```bash
npm test                   # full suite
npm run icons              # regenerate icons from brand geometry
npm run key                # show the pinned extension ID
npm run package            # build and package into dist/
```

---

<div align="center">
<sub><b>Figma comments + DevTools + MCP, for live applications.</b><br>
The screenshot is just the cover page.</sub>
</div>
