# Context Capsule

A browser-side **context compiler for coding agents**. Select any part of a live web
application and package everything an agent needs to understand it — annotated visuals,
DOM subtree, computed styles, accessibility data, console messages, network requests and
response bodies, plus optional framework/application state — into a local capsule directory
that agents read over MCP.

The full design rationale, capsule format, security model and roadmap live in
[docs/PLAN.md](docs/PLAN.md). This repository is the MVP described in that plan
(sections 1–6); the known gaps are section 7 and the ordered roadmap is section 8.

## Layout

```text
extension/    Manifest V3 Chromium extension (side panel, selection overlay, CDP capture)
companion/    Node native-messaging host + local MCP server
bridge/       Optional in-app SDK for exact render provenance
docs/PLAN.md  Design document and reference implementation
```

## Install

### 1. Companion dependencies

```bash
cd companion
npm install
```

### 2. Load the extension

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. **Load unpacked** → select the `extension` directory.
4. Copy the 32-character extension ID.

### 3. Register the native messaging host

```bash
cd companion
node install-host.mjs YOUR_EXTENSION_ID
```

The ID must be exactly 32 lowercase characters in the range `a`–`p`. Restart Chrome
afterwards so it picks up the host manifest.

### 4. Point your coding agent at the MCP server

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

Tools exposed: `list_captures`, `list_capture_files`, `read_capture_file`.

## Use

1. Click the extension action to open the side panel, then **Arm capture** (attaches
   `chrome.debugger` and starts the rolling console/network buffer).
2. Click an element; `Shift+Click` adds more; arrow keys walk parent/child/sibling.
3. Switch to the box / arrow / pen / text / region tools to annotate.
4. Fill in *what is wrong* and *what should happen*, then **Add frame**. Repeat for other
   viewports, routes or states.
5. **Export capsule** writes the capsule through the native host and copies an agent
   instruction to the clipboard. **Download JSON** is the no-companion fallback.

Capsules are written to `%TEMP%/context-capsules/<captureId>` (override with
`CONTEXT_CAPSULE_DIR`). Nothing leaves the machine; headers, cookie/token-like keys, JWTs
and secret-shaped attributes are redacted before storage.

## Caveats

- `debugger` is a powerful permission and cannot be optional. Opening DevTools on the same
  tab detaches the extension's session — re-arm after closing DevTools.
- Runtime capture only sees what happened **after** arming.
- `captureVisibleTab` is limited to ~2 calls/second, so frames are deliberate, not video.
- Field-level API-response → DOM-text provenance is not proven generically; install the
  `bridge/` SDK in your app for exact mappings.

## Verified

- `companion/mcp-server.js` — stdio `initialize` / `tools/list` / `tools/call` round-trip.
- `companion/native-host.js` — length-prefixed `BEGIN` / `PUT_FILE` (utf8 + base64) /
  `FINALIZE` round-trip, capsule read back through the MCP server.
- All extracted JS/JSON parse and syntax-check clean.
