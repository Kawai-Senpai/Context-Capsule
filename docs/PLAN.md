@Web search I want to create a browser extention that is a partner for any agentic coding
usually we take a screenshot and give it to the AI thats too less info
i need a extension that when triggered will help me to select any component or group of componnet or any level or whatever so that i can send the exact stuff to the AI, i should also be able to screeen shot proper freeform that will just include all componnet info that falls under taht group


now heres the geniusness i want

hav eto question ourself what info does AI need ? 
1. HTML and hhirarchy detail of what adn where itis, what page itois, wahst rendering it and so on, state information, etc etc
2. logs , consolve logs,network stuffs, the data that is being rendered, what data are actually coming from the api call and what is being mapped and rendered
3. the actual viausla screenshot because most of the time its a visual thing lets say i am running on e a creative thingf. so the screenshot should include space around that area not only the araa and also pointing to a component can also deaw stuffs like arrows, boxes, etc so that i can explian stuffs better !! muliple stuffs should be bale to mark and pointed at properly !! and all info included 
all properly done easily and lets say if i need multiple screenshots of multipel views and so on. so it automcaticelly create collage so that the screenshot itself contains info with colage and so much mroeso that when i paste it (copied to clipboard) for the AI the ai knows eveything aitomatcelly will be fantastic !!
and isnetad of dumping all of the INFO and positiong, info, ologs, etc i can store that in a temp directory and it copies that directory instead and gives it to the AI and a prompt to read and how to read it instead !!

# The real product

Yes, this is buildable.

But do not think of it as a screenshot extension. That description makes it sound like another annotation toy.

You are building a **browser-side context compiler for coding agents**.

It should convert:

> “Something is wrong around here”

into:

> “This exact component, rendered by this component tree, using this state and API response, looked like this at this moment, after these actions, with these errors.”

That is much more valuable.

## Brutal reality: parts of this already exist

Your individual features are not new:

* Stagewise already lets users select browser elements and send their HTML, CSS, and position to coding agents. ([Stagewise Docs][1])
* Jam records screenshots or video together with console logs, network requests, user events, and device information. Its MCP integration lets agents retrieve that context. ([Jam][2])
* Chrome DevTools for agents now gives coding agents direct browser inspection, debugging, testing, and performance capabilities. It reached stable 1.0 in May 2026. ([Chrome for Developers][3])
* Marker.io already combines annotated screenshots with console logs, network requests, session replay, and environment information. ([Marker.io Help Center][4])

So do not build “Jam, but slightly more technical” or “Stagewise with arrows.” That would be dead on arrival.

Your opening is the combination they do not fully own:

> **Human-grounded component selection + visual explanation + render provenance + local, agent-readable context packages.**

The human points at what matters. The extension gathers only the technical evidence relevant to that selection. The agent receives a structured capsule instead of a giant landfill of browser data.

# What information does an AI actually need?

You listed the right categories, but the priority order matters.

## 1. The human’s intent

This is more important than raw DOM.

The capture should always include:

* What is wrong?
* What should happen instead?
* Which annotations correspond to which instruction?
* Is this a visual change, functional bug, data bug, performance problem, or responsive issue?

A perfect DOM dump cannot tell an agent whether you want the card removed, resized, recolored, or merely aligned.

Every selected item should get an ID:

* `A` - Make this title align with the image.
* `B` - This button should remain visible on mobile.
* `C` - These three cards should use equal heights.

Those same IDs must appear in the screenshot, DOM package, and manifest.

## 2. Visual evidence

Capture both:

1. The exact selected region.
2. The surrounding context.

A component without its surroundings is often useless. Alignment, spacing, hierarchy, balance, overlap and responsive problems only make sense relative to neighboring elements.

The capture UI should support:

* Single element selection.
* Multi-element selection.
* Common-parent selection.
* Parent and child navigation.
* Freeform lasso.
* Rectangular crop.
* Full viewport.
* Full page.
* Multiple viewports and application states.

The surrounding context should be configurable, such as:

* Exact bounds.
* Bounds plus 20 percent padding.
* Nearest container.
* Entire viewport.
* One ancestor level.
* Two ancestor levels.

For multi-view captures, generate a numbered visual board, but also retain every screenshot at its original resolution. A beautiful collage that shrinks four desktop screenshots into unreadable postage stamps is not useful to an AI or a person.

## 3. Semantic and layout information

For every selected node or group, capture:

* DOM subtree.
* Ancestor path.
* Nearby siblings.
* Shadow DOM and iframe information where available.
* Bounding boxes.
* Scroll position.
* Stacking context.
* Computed styles.
* Matched CSS rules.
* Pseudo-elements.
* Responsive media queries.
* Fonts actually used.
* Accessibility role and accessible name.
* Visibility, clipping and overflow information.
* Event listeners when obtainable.
* Stable and fallback selectors.

Chrome DevTools Protocol already exposes DOM snapshots with layout and style information, computed styles, matched styles, accessibility trees, and region screenshots. ([Chrome DevTools][5])

Do not store only `outerHTML`. That is amateur hour. `outerHTML` does not explain computed layout, inherited styles, stacking, accessibility, state or rendering provenance.

## 4. Render provenance

This answers:

> “What code created this thing?”

Capture, when possible:

* Framework name and version.
* Component name.
* Parent component chain.
* Props.
* Local state.
* Context or dependency injection values.
* Store values related to the component.
* Route and route parameters.
* Feature flags.
* Query-cache entry.
* Source file.
* Source line and column.
* Render timing.
* Recent re-render reason.

React DevTools can inspect component props and state. Vue DevTools exposes component trees, state and the component responsible for a DOM element. Angular DevTools exposes component trees and state, but Angular explicitly notes that production optimizations can remove debug features required by DevTools. ([React][6])

That means you need two levels:

**Zero-install mode**

Works on arbitrary sites. Captures DOM, CSS, accessibility, layout, logs, network and screenshots.

**Deep integration mode**

An optional small SDK installed in the application. It exposes framework state, source mappings, feature flags, authentication-safe metadata and app-specific data.

Chrome is already moving in this direction by allowing applications and frameworks to expose internal debugging tools to coding agents. ([Chrome for Developers][7])

Your SDK might look conceptually like:

```ts
ContextCapsule.register({
  getCurrentUser: () => ({
    id: currentUser.id,
    role: currentUser.role,
  }),

  getFeatureFlags: () => featureFlags,

  getComponentContext: (element) => {
    return findFrameworkComponent(element);
  },

  redact: (key, value) => {
    if (/token|password|secret|authorization/i.test(key)) {
      return "[REDACTED]";
    }

    return value;
  },
});
```

## 5. Runtime and data evidence

Capture a bounded time window around the issue:

* Console logs.
* Warnings and errors.
* Unhandled exceptions.
* Network requests.
* Request payloads.
* Response metadata.
* Selected response bodies.
* Request initiator stacks.
* WebSocket messages where appropriate.
* User interactions.
* Navigation and route changes.
* Storage changes.
* Performance marks.
* Failed resource loads.

Chrome DevTools Protocol can provide console events, exceptions, network request data, request bodies, response bodies and initiator information. ([Chrome DevTools][8])

But there is an important catch: **you cannot attach after the problem happens and magically recover everything that occurred earlier.**

The extension needs an “armed” mode that maintains a rolling local buffer, perhaps the previous 30 or 60 seconds. When the user creates a capture, you freeze the relevant window.

Otherwise the user clicks Capture after the broken API call, and your extension proudly records absolutely nothing useful.

# The capture workflow

The best interaction is roughly this:

### 1. Arm

The user activates capture mode.

A small local ring buffer starts collecting permitted logs, network activity and user actions.

### 2. Select

Hover highlights the deepest element.

Keyboard controls let the user move through structure:

* `Arrow Up` - parent.
* `Arrow Down` - child.
* `Tab` - next sibling.
* `Shift + Click` - add another element.
* Drag - freeform region.
* `Command/Ctrl + Click` - select a separate component.

For groups, offer:

* Exact selected nodes.
* Smallest common DOM ancestor.
* Visual union of selected bounds.
* Repeated-component group.
* Entire framework component.

### 3. Annotate

Allow:

* Arrows.
* Boxes.
* Freehand drawing.
* Text labels.
* Blur and redact.
* Measurement lines.
* Alignment guides.
* Numbered markers.
* Before and after labels.

Each annotation should be stored as structured JSON, not only burned into the PNG.

### 4. Add views

The user can change:

* Viewport size.
* Application route.
* Tab.
* Component state.
* Modal open or closed.
* Theme.
* Hover, focus or selected state.

Then add another frame.

### 5. Review evidence

Before export, show:

* Captured nodes.
* Relevant logs.
* Included network bodies.
* Potential secrets.
* Storage data.
* Cookies.
* Screenshots.
* Framework state.

Nothing sensitive should leave the browser without an explicit review or an aggressive automatic redaction pass.

### 6. Export

Offer three outputs:

* **Copy compact context** - annotated screenshot plus short Markdown prompt.
* **Save capsule** - folder or ZIP containing full structured evidence.
* **Send to agent** - expose the capsule through a local MCP server.

# The context capsule format

A capture should be a directory like this:

```text
capture-01J9K7R3/
├── manifest.json
├── README_FOR_AGENT.md
├── prompt.md
│
├── visual/
│   ├── board.png
│   ├── view-01.png
│   ├── view-02.png
│   ├── view-03.png
│   └── annotations.json
│
├── page/
│   ├── selected-dom.html
│   ├── dom-tree.json
│   ├── ancestor-paths.json
│   ├── layout.json
│   ├── computed-styles.json
│   ├── matched-styles.json
│   ├── accessibility.json
│   └── frames.json
│
├── runtime/
│   ├── console.ndjson
│   ├── exceptions.json
│   ├── network.har
│   ├── user-actions.json
│   ├── performance.json
│   └── response-bodies/
│       ├── request-017.json
│       └── request-024.json
│
├── framework/
│   ├── detection.json
│   ├── component-tree.json
│   ├── selected-components.json
│   ├── state.json
│   └── render-history.json
│
└── source/
    ├── mappings.json
    ├── related-files.json
    └── stack-traces.json
```

The `manifest.json` is the index:

```json
{
  "schemaVersion": "0.1.0",
  "captureId": "01J9K7R3",
  "createdAt": "2026-08-05T18:24:00+05:30",
  "intent": {
    "type": "visual-change",
    "expected": "Cards A, B and C should have equal heights.",
    "actual": "Card B is shorter when its description has one line."
  },
  "page": {
    "url": "http://localhost:3000/pricing",
    "title": "Pricing",
    "viewport": {
      "width": 1440,
      "height": 900,
      "devicePixelRatio": 2
    }
  },
  "selections": [
    {
      "id": "A",
      "label": "First pricing card",
      "selector": "[data-testid='pricing-card']:nth-of-type(1)",
      "artifactRefs": [
        "visual/view-01.png",
        "page/dom-tree.json",
        "framework/selected-components.json"
      ]
    }
  ],
  "captureWindow": {
    "beforeCaptureMs": 30000,
    "afterCaptureMs": 5000
  },
  "redactionsApplied": [
    "authorization headers",
    "cookies",
    "password fields"
  ]
}
```

# The architecture I would use

## Browser extension

Build Manifest V3 for Chromium first.

Main pieces:

* Content script for selection overlays and annotations.
* Service worker for orchestration.
* Offscreen document for image composition and ZIP creation.
* `chrome.debugger` connection for deeper DevTools Protocol capture.
* Optional framework adapters injected into the page’s main JavaScript world.
* Local storage for the rolling capture buffer.

Content scripts normally run in an isolated JavaScript world. Chrome can also inject scripts into the page’s main world when necessary, but use that sparingly because it shares the host page’s environment. ([Chrome for Developers][9])

A basic mode can rely on `activeTab`, which grants temporary access after a user action and does not produce an installation warning. Deep capture through `chrome.debugger` requires the debugger permission and triggers much more serious permission messaging. ([Chrome for Developers][10])

Do not hide this. Explain exactly why the permission exists.

## Local companion and MCP server

Your “temporary directory” concept is correct, but copying an actual directory to the clipboard is the wrong mechanism.

The web Clipboard APIs standardize copying text, HTML, images, SVG and custom data formats. They do not provide a clean, portable “place this folder on the operating-system clipboard” workflow. ([Chrome for Developers][11])

Instead:

1. The extension sends the capture to a small local companion through Chrome Native Messaging.
2. The companion creates the temporary directory.
3. The companion exposes it through a local MCP server.
4. The extension copies a tiny instruction to the clipboard.

Chrome extensions can communicate with a separately installed local application through Native Messaging. ([Chrome for Developers][12])

MCP resources are specifically designed to expose file-like or application-specific context to AI clients using URIs. ([Model Context Protocol][13])

The copied text could simply be:

```text
Investigate capture capsule://01J9K7R3.

First read:
1. manifest.json
2. prompt.md
3. visual/board.png

Then inspect artifacts referenced by each selection ID.
Do not read unrelated network response bodies unless required.
```

For agents without MCP support, provide:

* A ZIP download.
* A user-selected output folder through the File System Access API.
* A compact Markdown report.
* Individual screenshots copied to the clipboard.

The File System Access API can write files and directories after the user grants access. ([Chrome for Developers][14])

# The hardest problem: mapping API data to rendered UI

This is where the idea stops being easy.

A browser can tell you:

* Request X returned JSON Y.
* Component Z rendered.
* DOM node A contains text `"Pro Plan"`.
* The request was initiated by a certain script stack.

It usually cannot prove:

> `response.plans[1].label` became the text node inside DOM node A.

JavaScript transforms, copies, filters, memoizes and reformats data. There may be Redux, React Query, GraphQL normalization, selectors, computed properties and several layers of components between the response and the DOM.

Use three confidence levels:

### Exact

Provided by an application SDK or framework adapter.

```text
GET /api/plans
response.plans[1].price
→ React Query cache ["plans"]
→ PricingCard props.price
→ DOM selection B
```

### Strong inference

Match:

* Response values.
* Component props.
* Text content.
* Request timing.
* Initiator stack.
* Object identities where observable.

### Possible relation

The request occurred in the relevant time window and appears related, but there is no proven mapping.

Do not pretend guesses are exact. Agents will trust the metadata and confidently edit the wrong code.

# Security is not a side feature

This product can capture:

* Authentication tokens.
* Private messages.
* API keys.
* Customer records.
* Payment information.
* Cookies.
* Internal URLs.
* Source code.
* Personal identifiers.

That makes it dangerously close to a browser surveillance tool unless you design it properly.

Default rules should include:

* Local-only storage.
* No cloud account required.
* No telemetry containing captured content.
* Authorization and cookie headers excluded.
* Password and payment fields blurred.
* Configurable domain allowlist.
* Response-body size limits.
* Binary bodies excluded.
* Automatic secret detection.
* Per-capture review.
* One-click permanent deletion.
* Expiring temporary directories.
* Clear indicator while recording.

Chrome itself warns that browser-agent connections may expose open tabs, cookies, local storage, session storage and other sensitive data, and recommends using them only with trusted agents. ([Chrome for Developers][15])

# The MVP

Build this first:

1. Chrome only.
2. Explicit “arm capture” mode.
3. Single, group and freeform selection.
4. Parent and child navigation.
5. Numbered visual annotations.
6. Screenshot with surrounding context.
7. DOM subtree, ancestor tree and nearby siblings.
8. Bounding boxes, computed styles and accessibility data.
9. Rolling console, exception and network buffer.
10. Selected JSON response bodies with automatic redaction.
11. Multiple screenshots assembled into a numbered board.
12. ZIP or folder export.
13. Local MCP resource for supported coding agents.
14. A generated agent instruction file.

Do **not** begin with:

* Perfect React, Vue, Angular, Svelte and Solid support.
* Automatic API-field-to-DOM tracing.
* Cloud collaboration.
* Video editing.
* Jira integrations.
* Mobile browsers.
* Firefox and Safari parity.
* Automatic code modification.
* AI-generated summaries.

Those are distractions. First prove that a developer can select a broken UI region and give an agent meaningfully better context than a screenshot plus “fix this.”

# Final positioning

The weak pitch is:

> “A browser extension that takes smarter screenshots for AI.”

That sounds disposable.

The strong pitch is:

> **Select any part of a live web application and package everything a coding agent needs to understand it - visuals, DOM, components, state, logs, network data and source provenance.**

Or even simpler:

> **Figma comments plus DevTools plus MCP for live applications.**

That is the product. The screenshot is merely the cover page.

[1]: https://docs.stagewise.io/reference/dom-context-selector?utm_source=chatgpt.com "DOM context selector — Select elements for agent context"
[2]: https://jam.dev/?utm_source=chatgpt.com "Jam: Screen recorder for bugs, feedback, and ideas"
[3]: https://developer.chrome.com/docs/devtools/agents?utm_source=chatgpt.com "Chrome DevTools for agents"
[4]: https://help.marker.io/en/articles/6495644-browser-extensions?utm_source=chatgpt.com "Browser Extensions"
[5]: https://chromedevtools.github.io/devtools-protocol/tot/DOMSnapshot/?utm_source=chatgpt.com "Chrome DevTools Protocol - DOMSnapshot domain"
[6]: https://react.dev/learn/react-developer-tools?utm_source=chatgpt.com "React Developer Tools – React"
[7]: https://developer.chrome.com/blog/devtools-for-agents-3p-tools?utm_source=chatgpt.com "Introducing third-party developer tools for Chrome DevTools ..."
[8]: https://chromedevtools.github.io/devtools-protocol/tot/Network/?utm_source=chatgpt.com "Chrome DevTools Protocol - Network domain"
[9]: https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts?utm_source=chatgpt.com "Content scripts | Chrome for Developers"
[10]: https://developer.chrome.com/docs/extensions/develop/concepts/activeTab?hl=en&utm_source=chatgpt.com "The \"activeTab\" permission  |  Chrome Extensions  |  Chrome for Developers"
[11]: https://developer.chrome.com/blog/web-custom-formats-for-the-async-clipboard-api?utm_source=chatgpt.com "Web custom formats for the Async Clipboard API | Blog"
[12]: https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging?utm_source=chatgpt.com "Native messaging - Chrome for Developers"
[13]: https://modelcontextprotocol.io/specification/2026-07-28/server/resources?utm_source=chatgpt.com "Resources"
[14]: https://developer.chrome.com/docs/capabilities/web-apis/file-system-access?utm_source=chatgpt.com "The File System Access API: simplifying access to local files"
[15]: https://developer.chrome.com/docs/devtools/agents/use-cases/auto-connect?utm_source=chatgpt.com "Connect your AI agent to your personal browser with auto ..."

# Build this as a local-first context compiler

Do not start by building a cloud platform, accounts, teams, Jira integrations, or automatic code editing. That is startup cosplay. First prove the core loop:

1. Arm the extension.
2. Select one or several UI elements.
3. Draw boxes, arrows, text, or a capture region.
4. Capture screenshots, DOM, computed styles, accessibility data, console messages, network requests, response bodies, and exceptions.
5. Add multiple application views.
6. Build a visual board.
7. Save everything locally.
8. Let a coding agent read it through MCP.

The implementation below uses:

* A Manifest V3 Chrome extension.
* Chrome Side Panel for the persistent interface.
* `chrome.debugger` as a transport for Chrome DevTools Protocol.
* `activeTab` rather than permanent access to every site.
* Native Messaging for writing a real directory.
* A local MCP server for coding agents.

Chrome’s debugger API can inspect network traffic, JavaScript execution, DOM, CSS, accessibility, storage, performance and other CDP domains. It requires the powerful `debugger` permission, and Chrome explicitly does not allow that permission to be optional. Also, opening DevTools on the same tab will detach your extension’s debugger session. ([Chrome for Developers][1])

`activeTab` grants temporary access after a user gesture, while `chrome.scripting` supports both the extension’s isolated world and the page’s main JavaScript world. That lets the extension work without requesting permanent `<all_urls>` access. ([Chrome for Developers][2])

Chrome’s `captureVisibleTab()` captures the current visible page and is limited to two calls per second, which is fine for deliberate frame capture but not for video-like recording. ([Chrome for Developers][3])

Native Messaging is the correct way to create a real temporary directory. Chrome sends length-prefixed JSON messages to a local process over stdin and stdout. Messages from the extension can be up to 64 MiB, while responses from the native process are limited to 1 MiB. ([Chrome for Developers][4])

The companion uses MCP TypeScript SDK v2, currently published as `@modelcontextprotocol/server` 2.0.0. MCP stdio is designed for local integrations where the AI host launches your server process. ([npm][5])

## What this code delivers

This is a complete Chromium MVP, not a finished commercial product.

It includes:

* Element hover inspection.
* Single selection.
* Shift-click multi-selection.
* Parent, child and sibling navigation.
* Freeform rectangular capture regions.
* Boxes, arrows, pen drawing and text annotations.
* Cropped screenshots with surrounding space.
* Multiple frames.
* Automatic collage generation.
* DOM hierarchy and nearby siblings.
* Computed CSS.
* Accessibility attributes and CDP accessibility tree.
* CDP DOM snapshots.
* Console messages and exceptions.
* Network request and response metadata.
* Selected textual response bodies.
* Local redaction.
* Local directory export.
* MCP tools for agents.
* Optional application bridge for route, state, flags and framework information.

It does **not** magically prove which API response field produced which DOM text. No generic extension can reliably prove that through Redux selectors, React Query caches, transformations, memoization and component props. The application bridge included later is how you add exact provenance.

---

# 1. Repository structure

Create this structure:

```text
context-capsule/
├── extension/
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   ├── sidepanel.html
│   ├── sidepanel.css
│   └── sidepanel.js
│
└── companion/
    ├── package.json
    ├── common.js
    ├── native-host.js
    ├── mcp-server.js
    └── install-host.mjs
```

---

# 2. Chrome extension

## `extension/manifest.json`

```json
{
  "manifest_version": 3,
  "minimum_chrome_version": "125",
  "name": "Context Capsule",
  "description": "Capture exact visual, DOM, console, network, accessibility and application context for coding agents.",
  "version": "0.1.0",
  "permissions": [
    "activeTab",
    "scripting",
    "storage",
    "sidePanel",
    "debugger",
    "nativeMessaging",
    "downloads"
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": {
    "default_title": "Open Context Capsule"
  },
  "side_panel": {
    "default_path": "sidepanel.html"
  }
}
```

The Side Panel API provides a persistent extension interface beside the page rather than a tiny popup that disappears whenever the user clicks outside it. ([Chrome for Developers][6])

---

## `extension/background.js`

```javascript
const sessions = new Map();

const MAX_EVENTS = 800;
const MAX_BODY_BYTES = 1_000_000;

const BODY_MIME =
  /json|text|javascript|xml|graphql|x-www-form-urlencoded/i;

const SECRET_KEY =
  /authorization|cookie|set-cookie|token|secret|password|passwd|api[-_]?key|session|jwt/i;

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(() => {});
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "context-capsule-panel") {
    return;
  }

  port.onMessage.addListener((message) => {
    void handlePanelMessage(message, port);
  });
});

chrome.debugger.onEvent.addListener((source, method, params) => {
  if (!source.tabId) {
    return;
  }

  const session = sessions.get(source.tabId);

  if (!session) {
    return;
  }

  void handleDebuggerEvent(source.tabId, method, params, session);
});

chrome.debugger.onDetach.addListener((source, reason) => {
  if (!source.tabId) {
    return;
  }

  const session = sessions.get(source.tabId);

  if (!session) {
    return;
  }

  session.attached = false;
  session.detachReason = reason;

  broadcastStatus(source.tabId);
});

async function handlePanelMessage(message, port) {
  const requestId = message.requestId;

  try {
    let result;

    switch (message.type) {
      case "GET_STATUS":
        result = await getStatus();
        break;

      case "ARM":
        result = await armActiveTab();
        break;

      case "STOP":
        result = await stopActiveTab();
        break;

      case "SET_TOOL":
        result = await sendToActiveTab({
          type: "CC_SET_TOOL",
          tool: message.tool
        });
        break;

      case "CLEAR_MARKUP":
        result = await sendToActiveTab({
          type: "CC_CLEAR_MARKUP"
        });
        break;

      case "CAPTURE_FRAME":
        result = await captureFrame(message.intent || {});
        break;

      default:
        throw new Error(`Unknown message type: ${message.type}`);
    }

    port.postMessage({
      requestId,
      ok: true,
      result
    });
  } catch (error) {
    port.postMessage({
      requestId,
      ok: false,
      error: toErrorMessage(error)
    });
  }
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (!tab?.id) {
    throw new Error("No active browser tab found.");
  }

  return tab;
}

async function getStatus() {
  const tab = await getActiveTab();
  const session = sessions.get(tab.id);

  return {
    tabId: tab.id,
    title: tab.title || "",
    url: tab.url || "",
    armed: Boolean(session?.armed),
    attached: Boolean(session?.attached),
    eventCount: session?.events.length || 0,
    requestCount: session?.requests.size || 0,
    detachReason: session?.detachReason || null
  };
}

async function armActiveTab() {
  const tab = await getActiveTab();
  const tabId = tab.id;

  let session = sessions.get(tabId);

  if (!session) {
    session = {
      tabId,
      armed: true,
      attached: false,
      startedAt: Date.now(),
      events: [],
      requests: new Map(),
      responseBodies: new Map(),
      detachReason: null
    };

    sessions.set(tabId, session);
  }

  if (!session.attached) {
    await chrome.debugger.attach({ tabId }, "0.1");

    session.attached = true;

    await Promise.all([
      cdp(tabId, "Network.enable", {
        maxTotalBufferSize: 20_000_000,
        maxResourceBufferSize: 2_000_000,
        maxPostDataSize: 1_000_000
      }),

      cdp(tabId, "Runtime.enable"),
      cdp(tabId, "Log.enable"),
      cdp(tabId, "Page.enable"),
      cdp(tabId, "DOM.enable"),
      cdp(tabId, "CSS.enable"),
      cdp(tabId, "Accessibility.enable")
    ]);
  }

  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content.js"]
  });

  await chrome.tabs.sendMessage(tabId, {
    type: "CC_START"
  });

  session.armed = true;

  broadcastStatus(tabId);

  return getStatus();
}

async function stopActiveTab() {
  const tab = await getActiveTab();
  const session = sessions.get(tab.id);

  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: "CC_STOP"
    });
  } catch {
    // The content script may no longer exist after a navigation.
  }

  if (session?.attached) {
    try {
      await chrome.debugger.detach({
        tabId: tab.id
      });
    } catch {
      // Already detached.
    }
  }

  sessions.delete(tab.id);

  return getStatus();
}

async function sendToActiveTab(message) {
  const tab = await getActiveTab();

  return chrome.tabs.sendMessage(tab.id, message);
}

async function captureFrame(intent) {
  const tab = await getActiveTab();
  const session = sessions.get(tab.id);

  if (!session?.armed || !session.attached) {
    throw new Error("Arm capture before adding a frame.");
  }

  const pageContext = await chrome.tabs.sendMessage(tab.id, {
    type: "CC_PREPARE_CAPTURE",
    intent
  });

  let screenshotDataUrl;

  try {
    screenshotDataUrl = await chrome.tabs.captureVisibleTab(
      tab.windowId,
      {
        format: "png"
      }
    );
  } finally {
    await chrome.tabs
      .sendMessage(tab.id, {
        type: "CC_CAPTURE_DONE"
      })
      .catch(() => {});
  }

  const cdpContext = await captureCdpContext(
    tab.id,
    pageContext
  );

  const appContext = await captureAppBridge(
    tab.id,
    pageContext
  );

  const now = Date.now();

  const runtime = {
    captureWindow: {
      armedAt: new Date(session.startedAt).toISOString(),
      capturedAt: new Date(now).toISOString()
    },

    events: session.events.filter(
      (event) => now - event.timeMs <= 60_000
    ),

    requests: Array.from(session.requests.values())
      .filter(
        (request) => now - request.timeMs <= 60_000
      )
      .map((request) => ({
        ...request,
        responseBody:
          session.responseBodies.get(request.requestId) ||
          null
      }))
  };

  return {
    capturedAt: new Date(now).toISOString(),
    screenshotDataUrl,
    pageContext,
    cdpContext,
    appContext,
    runtime
  };
}

async function captureAppBridge(tabId, pageContext) {
  try {
    const selectors = (
      pageContext?.selections || []
    ).map((selection) => selection.selector);

    const [result] =
      await chrome.scripting.executeScript({
        target: { tabId },
        world: "MAIN",

        func: async (selectedSelectors) => {
          const bridge =
            globalThis.__CONTEXT_CAPSULE_BRIDGE__;

          if (
            !bridge ||
            typeof bridge.snapshot !== "function"
          ) {
            return {
              available: false,
              reason:
                "No application bridge registered."
            };
          }

          try {
            const value = await bridge.snapshot({
              selectors: selectedSelectors
            });

            return {
              available: true,
              bridgeVersion: bridge.version || null,
              value
            };
          } catch (error) {
            return {
              available: true,
              error:
                error instanceof Error
                  ? error.message
                  : String(error)
            };
          }
        },

        args: [selectors]
      });

    return sanitizeValue(
      result?.result || {
        available: false
      }
    );
  } catch (error) {
    return {
      available: false,
      error: toErrorMessage(error)
    };
  }
}

async function captureCdpContext(
  tabId,
  pageContext
) {
  const primary =
    pageContext?.selections?.[0];

  const x = Math.max(
    0,
    Math.round(
      primary?.rect?.x +
        primary?.rect?.width / 2 || 1
    )
  );

  const y = Math.max(
    0,
    Math.round(
      primary?.rect?.y +
        primary?.rect?.height / 2 || 1
    )
  );

  const result = {
    layoutMetrics: null,
    selectedNode: null,
    computedStyle: null,
    accessibility: null,
    domSnapshot: null,
    errors: []
  };

  try {
    result.layoutMetrics = await cdp(
      tabId,
      "Page.getLayoutMetrics"
    );
  } catch (error) {
    result.errors.push(
      `Page.getLayoutMetrics: ${toErrorMessage(error)}`
    );
  }

  try {
    const located = await cdp(
      tabId,
      "DOM.getNodeForLocation",
      {
        x,
        y,
        includeUserAgentShadowDOM: true,
        ignorePointerEventsNone: true
      }
    );

    let nodeId = located.nodeId;

    if (!nodeId && located.backendNodeId) {
      const pushed = await cdp(
        tabId,
        "DOM.pushNodesByBackendIdsToFrontend",
        {
          backendNodeIds: [
            located.backendNodeId
          ]
        }
      );

      nodeId = pushed.nodeIds?.[0];
    }

    if (nodeId) {
      result.selectedNode = await cdp(
        tabId,
        "DOM.describeNode",
        {
          nodeId,
          depth: 4,
          pierce: true
        }
      );

      result.computedStyle = await cdp(
        tabId,
        "CSS.getComputedStyleForNode",
        {
          nodeId
        }
      );

      result.accessibility = await cdp(
        tabId,
        "Accessibility.getPartialAXTree",
        {
          nodeId,
          fetchRelatives: true
        }
      );
    }
  } catch (error) {
    result.errors.push(
      `Selected node capture: ${toErrorMessage(error)}`
    );
  }

  try {
    result.domSnapshot = await cdp(
      tabId,
      "DOMSnapshot.captureSnapshot",
      {
        computedStyles: [
          "display",
          "position",
          "z-index",
          "width",
          "height",
          "margin-top",
          "margin-right",
          "margin-bottom",
          "margin-left",
          "padding-top",
          "padding-right",
          "padding-bottom",
          "padding-left",
          "font-family",
          "font-size",
          "font-weight",
          "line-height",
          "color",
          "background-color",
          "border-radius",
          "overflow",
          "opacity",
          "transform"
        ],

        includePaintOrder: true,
        includeDOMRects: true,
        includeBlendedBackgroundColors: true,
        includeTextColorOpacities: true
      }
    );
  } catch (error) {
    result.errors.push(
      `DOMSnapshot.captureSnapshot: ${toErrorMessage(
        error
      )}`
    );
  }

  return result;
}

async function handleDebuggerEvent(
  tabId,
  method,
  params,
  session
) {
  const timeMs =
    cdpTimeToEpochMs(params?.timestamp) ||
    Date.now();

  if (method === "Network.requestWillBeSent") {
    session.requests.set(params.requestId, {
      requestId: params.requestId,
      timeMs,
      timestamp: new Date(timeMs).toISOString(),
      type: params.type || null,
      documentURL: params.documentURL || null,
      initiator: sanitizeValue(
        params.initiator
      ),

      request: {
        url: params.request?.url || "",
        method:
          params.request?.method || "GET",
        headers: redactHeaders(
          params.request?.headers || {}
        ),
        postData: redactText(
          params.request?.postData || null
        )
      },

      response: null,
      failure: null
    });

    trimMap(session.requests, 300);

    return;
  }

  if (method === "Network.responseReceived") {
    const request = session.requests.get(
      params.requestId
    );

    if (request) {
      request.response = {
        url:
          params.response?.url ||
          request.request.url,

        status: params.response?.status,
        statusText:
          params.response?.statusText,
        mimeType:
          params.response?.mimeType,

        headers: redactHeaders(
          params.response?.headers || {}
        ),

        protocol:
          params.response?.protocol,

        remoteIPAddress:
          params.response?.remoteIPAddress,

        fromDiskCache:
          params.response?.fromDiskCache,

        fromServiceWorker:
          params.response?.fromServiceWorker,

        timing: sanitizeValue(
          params.response?.timing || null
        )
      };
    }

    return;
  }

  if (method === "Network.loadingFinished") {
    const request = session.requests.get(
      params.requestId
    );

    const mimeType =
      request?.response?.mimeType || "";

    if (
      request &&
      BODY_MIME.test(mimeType) &&
      Number(
        params.encodedDataLength || 0
      ) <= MAX_BODY_BYTES
    ) {
      try {
        const body = await cdp(
          tabId,
          "Network.getResponseBody",
          {
            requestId: params.requestId
          }
        );

        session.responseBodies.set(
          params.requestId,
          {
            base64Encoded:
              Boolean(body.base64Encoded),

            body: body.base64Encoded
              ? "[BINARY BODY OMITTED]"
              : redactText(body.body)
          }
        );

        trimMap(
          session.responseBodies,
          120
        );
      } catch {
        // Chrome may have evicted the body.
      }
    }

    return;
  }

  if (method === "Network.loadingFailed") {
    const request = session.requests.get(
      params.requestId
    );

    if (request) {
      request.failure = {
        errorText: params.errorText,
        canceled: params.canceled,
        blockedReason:
          params.blockedReason,
        corsErrorStatus:
          params.corsErrorStatus
      };
    }

    return;
  }

  if (method === "Runtime.consoleAPICalled") {
    pushEvent(session, {
      category: "console",
      level: params.type,
      timeMs,
      timestamp: new Date(timeMs).toISOString(),

      text: (params.args || [])
        .map(serializeRemoteObject)
        .join(" "),

      stackTrace: sanitizeValue(
        params.stackTrace || null
      )
    });

    return;
  }

  if (method === "Runtime.exceptionThrown") {
    pushEvent(session, {
      category: "exception",
      level: "error",
      timeMs,
      timestamp: new Date(timeMs).toISOString(),

      text:
        params.exceptionDetails?.text ||
        "Unhandled exception",

      detail: sanitizeValue(
        params.exceptionDetails || null
      )
    });

    return;
  }

  if (method === "Log.entryAdded") {
    pushEvent(session, {
      category: "log",
      level:
        params.entry?.level || "info",
      timeMs,
      timestamp: new Date(timeMs).toISOString(),
      text: params.entry?.text || "",
      detail: sanitizeValue(
        params.entry || null
      )
    });
  }
}

function pushEvent(session, event) {
  session.events.push(event);

  if (session.events.length > MAX_EVENTS) {
    session.events.splice(
      0,
      session.events.length - MAX_EVENTS
    );
  }
}

function trimMap(map, max) {
  while (map.size > max) {
    const firstKey =
      map.keys().next().value;

    map.delete(firstKey);
  }
}

function cdp(
  tabId,
  method,
  params = undefined
) {
  return chrome.debugger.sendCommand(
    { tabId },
    method,
    params
  );
}

function serializeRemoteObject(object) {
  if (
    Object.prototype.hasOwnProperty.call(
      object || {},
      "value"
    )
  ) {
    return redactText(
      stringifySafe(object.value)
    );
  }

  return redactText(
    object?.description ||
      object?.type ||
      "unknown"
  );
}

function stringifySafe(value) {
  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function redactHeaders(headers) {
  const output = {};

  for (const [key, value] of Object.entries(
    headers || {}
  )) {
    output[key] = SECRET_KEY.test(key)
      ? "[REDACTED]"
      : redactText(String(value));
  }

  return output;
}

function redactText(value) {
  if (value == null) {
    return value;
  }

  let text = String(value);

  text = text.replace(
    /Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi,
    "Bearer [REDACTED]"
  );

  text = text.replace(
    /(["']?(?:token|secret|password|api[-_]?key|authorization)["']?\s*[:=]\s*["'])[^"']+(["'])/gi,
    "$1[REDACTED]$2"
  );

  text = text.replace(
    /\b[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/g,
    "[REDACTED_JWT]"
  );

  return text.slice(0, 500_000);
}

function sanitizeValue(value, depth = 0) {
  if (depth > 7) {
    return "[MAX_DEPTH]";
  }

  if (
    value == null ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "string") {
    return redactText(value);
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, 200)
      .map((item) =>
        sanitizeValue(item, depth + 1)
      );
  }

  if (typeof value === "object") {
    const output = {};

    for (const [key, item] of Object.entries(
      value
    ).slice(0, 200)) {
      output[key] = SECRET_KEY.test(key)
        ? "[REDACTED]"
        : sanitizeValue(
            item,
            depth + 1
          );
    }

    return output;
  }

  return String(value);
}

function cdpTimeToEpochMs(timestamp) {
  if (typeof timestamp !== "number") {
    return null;
  }

  /*
   * Many CDP timestamps are monotonic rather than Unix
   * timestamps. For this MVP, receipt time is safer than
   * pretending the monotonic value is an epoch value.
   */
  return Date.now();
}

function toErrorMessage(error) {
  return error instanceof Error
    ? error.message
    : String(error);
}

function broadcastStatus(tabId) {
  chrome.runtime
    .sendMessage({
      type: "CC_STATUS_CHANGED",
      tabId
    })
    .catch(() => {});
}
```

Chrome DevTools Protocol’s DOM Snapshot domain can capture DOM, layout and computed style information. The Network domain exposes requests, responses, headers, bodies and timing, and the Accessibility domain can return accessibility nodes related to a selected DOM node. ([Chrome DevTools][7])

---

## `extension/content.js`

```javascript
(() => {
  if (globalThis.__CONTEXT_CAPSULE__) {
    return;
  }

  globalThis.__CONTEXT_CAPSULE__ = true;

  const state = {
    active: false,
    tool: "select",
    hoverElement: null,
    selected: [],
    activeSelectionIndex: -1,
    annotations: [],
    region: null,
    drawing: null,
    captureMode: false
  };

  const host = document.createElement("div");

  host.id = "context-capsule-root";

  host.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:2147483647",
    "pointer-events:none"
  ].join(";");

  const shadow = host.attachShadow({
    mode: "closed"
  });

  shadow.innerHTML = `
    <style>
      :host {
        all: initial;
      }

      #layer {
        position: fixed;
        inset: 0;
        pointer-events: none;
        font-family:
          Inter,
          ui-sans-serif,
          system-ui,
          sans-serif;
      }

      #hover {
        position: fixed;
        border: 2px solid #7c3aed;
        background: rgba(124, 58, 237, 0.08);
        border-radius: 6px;
        box-sizing: border-box;
        display: none;
      }

      .selection {
        position: fixed;
        border: 2px solid #2563eb;
        background: rgba(37, 99, 235, 0.08);
        border-radius: 6px;
        box-sizing: border-box;
      }

      .label {
        position: absolute;
        left: -2px;
        top: -26px;
        min-width: 22px;
        height: 22px;
        padding: 0 7px;
        border-radius: 6px;
        display: grid;
        place-items: center;
        color: white;
        background: #2563eb;
        font: 700 12px/1 ui-sans-serif, system-ui;
        box-shadow:
          0 4px 14px rgba(0, 0, 0, 0.25);
      }

      #region {
        position: fixed;
        border: 2px dashed #f97316;
        background: rgba(249, 115, 22, 0.08);
        border-radius: 8px;
        box-sizing: border-box;
        display: none;
      }

      #svg {
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        overflow: visible;
      }

      #toast {
        position: fixed;
        left: 50%;
        bottom: 18px;
        transform: translateX(-50%);
        padding: 9px 12px;
        border-radius: 9px;
        color: white;
        background: rgba(17, 24, 39, 0.94);
        font: 600 12px/1.2 ui-sans-serif, system-ui;
        box-shadow:
          0 8px 30px rgba(0, 0, 0, 0.28);
        display: none;
      }
    </style>

    <div id="layer">
      <div id="hover"></div>
      <div id="selections"></div>
      <div id="region"></div>

      <svg
        id="svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="#ef4444"
            ></polygon>
          </marker>
        </defs>

        <g id="marks"></g>
      </svg>

      <div id="toast"></div>
    </div>
  `;

  document.documentElement.appendChild(host);

  const hoverBox =
    shadow.querySelector("#hover");

  const selectionsLayer =
    shadow.querySelector("#selections");

  const regionBox =
    shadow.querySelector("#region");

  const marks =
    shadow.querySelector("#marks");

  const toast =
    shadow.querySelector("#toast");

  const STYLE_KEYS = [
    "display",
    "position",
    "z-index",
    "box-sizing",
    "width",
    "height",
    "min-width",
    "min-height",
    "max-width",
    "max-height",
    "margin-top",
    "margin-right",
    "margin-bottom",
    "margin-left",
    "padding-top",
    "padding-right",
    "padding-bottom",
    "padding-left",
    "gap",
    "row-gap",
    "column-gap",
    "grid-template-columns",
    "grid-template-rows",
    "align-items",
    "justify-content",
    "flex-direction",
    "flex-wrap",
    "overflow",
    "opacity",
    "transform",
    "font-family",
    "font-size",
    "font-weight",
    "line-height",
    "letter-spacing",
    "text-align",
    "color",
    "background-color",
    "border",
    "border-radius",
    "box-shadow",
    "visibility",
    "pointer-events"
  ];

  const SECRET_ATTR =
    /value|token|secret|password|authorization|cookie/i;

  chrome.runtime.onMessage.addListener(
    (
      message,
      _sender,
      sendResponse
    ) => {
      if (message.type === "CC_START") {
        start();
        sendResponse({ ok: true });
        return;
      }

      if (message.type === "CC_STOP") {
        stop();
        sendResponse({ ok: true });
        return;
      }

      if (message.type === "CC_SET_TOOL") {
        state.tool = message.tool;

        showToast(
          toolHint(message.tool)
        );

        sendResponse({
          ok: true,
          tool: state.tool
        });

        return;
      }

      if (
        message.type ===
        "CC_CLEAR_MARKUP"
      ) {
        clearMarkup();
        sendResponse({ ok: true });
        return;
      }

      if (
        message.type ===
        "CC_PREPARE_CAPTURE"
      ) {
        state.captureMode = true;
        hoverBox.style.display = "none";

        sendResponse(
          buildCaptureContext(
            message.intent || {}
          )
        );

        return;
      }

      if (
        message.type ===
        "CC_CAPTURE_DONE"
      ) {
        state.captureMode = false;
        sendResponse({ ok: true });
      }
    }
  );

  function start() {
    if (state.active) {
      return;
    }

    state.active = true;

    document.addEventListener(
      "mousemove",
      onMouseMove,
      true
    );

    document.addEventListener(
      "mousedown",
      onMouseDown,
      true
    );

    document.addEventListener(
      "mouseup",
      onMouseUp,
      true
    );

    document.addEventListener(
      "click",
      onClick,
      true
    );

    document.addEventListener(
      "keydown",
      onKeyDown,
      true
    );

    window.addEventListener(
      "scroll",
      redrawSelections,
      true
    );

    window.addEventListener(
      "resize",
      redrawSelections,
      true
    );

    showToast(
      "Capture armed. Click an element. Shift-click adds more."
    );
  }

  function stop() {
    state.active = false;

    document.removeEventListener(
      "mousemove",
      onMouseMove,
      true
    );

    document.removeEventListener(
      "mousedown",
      onMouseDown,
      true
    );

    document.removeEventListener(
      "mouseup",
      onMouseUp,
      true
    );

    document.removeEventListener(
      "click",
      onClick,
      true
    );

    document.removeEventListener(
      "keydown",
      onKeyDown,
      true
    );

    window.removeEventListener(
      "scroll",
      redrawSelections,
      true
    );

    window.removeEventListener(
      "resize",
      redrawSelections,
      true
    );

    hoverBox.style.display = "none";
  }

  function onMouseMove(event) {
    if (
      !state.active ||
      state.captureMode
    ) {
      return;
    }

    if (state.drawing) {
      event.preventDefault();
      event.stopPropagation();

      updateDrawing(
        event.clientX,
        event.clientY
      );

      return;
    }

    if (state.tool !== "select") {
      return;
    }

    const element = pickElement(
      event.clientX,
      event.clientY
    );

    if (
      !element ||
      element === state.hoverElement
    ) {
      return;
    }

    state.hoverElement = element;

    drawRect(
      hoverBox,
      element.getBoundingClientRect()
    );

    hoverBox.style.display = "block";
  }

  function onMouseDown(event) {
    if (
      !state.active ||
      state.captureMode ||
      state.tool === "select"
    ) {
      return;
    }

    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    beginDrawing(
      state.tool,
      event.clientX,
      event.clientY
    );
  }

  function onMouseUp(event) {
    if (
      !state.active ||
      !state.drawing
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    finishDrawing(
      event.clientX,
      event.clientY
    );
  }

  function onClick(event) {
    if (
      !state.active ||
      state.captureMode ||
      state.tool !== "select"
    ) {
      return;
    }

    const element = pickElement(
      event.clientX,
      event.clientY
    );

    if (!element) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    if (event.shiftKey) {
      const existing =
        state.selected.indexOf(element);

      if (existing >= 0) {
        state.selected.splice(
          existing,
          1
        );
      } else {
        state.selected.push(element);
      }
    } else {
      state.selected = [element];
    }

    state.activeSelectionIndex =
      state.selected.length - 1;

    redrawSelections();
  }

  function onKeyDown(event) {
    if (!state.active) {
      return;
    }

    if (event.key === "Escape") {
      state.tool = "select";
      state.drawing = null;

      showToast("Selection mode");

      return;
    }

    if (!state.selected.length) {
      return;
    }

    const current =
      state.selected[
        state.activeSelectionIndex
      ] || state.selected[0];

    let next = null;

    if (event.key === "ArrowUp") {
      next = current.parentElement;
    }

    if (event.key === "ArrowDown") {
      next =
        current.firstElementChild;
    }

    if (event.key === "ArrowLeft") {
      next =
        current.previousElementSibling;
    }

    if (event.key === "ArrowRight") {
      next =
        current.nextElementSibling;
    }

    if (!next || next === host) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    state.selected[
      state.activeSelectionIndex
    ] = next;

    redrawSelections();
  }

  function pickElement(x, y) {
    const element =
      document.elementFromPoint(x, y);

    if (
      !element ||
      element === host ||
      host.contains(element)
    ) {
      return null;
    }

    return element;
  }

  function redrawSelections() {
    selectionsLayer.textContent = "";

    state.selected =
      state.selected.filter(
        (element) =>
          element?.isConnected
      );

    state.selected.forEach(
      (element, index) => {
        const rect =
          element.getBoundingClientRect();

        const box =
          document.createElement("div");

        box.className = "selection";

        drawRect(box, rect);

        const label =
          document.createElement("div");

        label.className = "label";
        label.textContent =
          alphaLabel(index);

        box.appendChild(label);
        selectionsLayer.appendChild(box);
      }
    );
  }

  function drawRect(node, rect) {
    node.style.left =
      `${Math.round(rect.left)}px`;

    node.style.top =
      `${Math.round(rect.top)}px`;

    node.style.width =
      `${Math.max(
        1,
        Math.round(rect.width)
      )}px`;

    node.style.height =
      `${Math.max(
        1,
        Math.round(rect.height)
      )}px`;
  }

  function beginDrawing(tool, x, y) {
    const id = crypto.randomUUID();

    const drawing = {
      id,
      tool,
      startX: x,
      startY: y,
      endX: x,
      endY: y,
      points: [[x, y]],
      node: null
    };

    if (tool === "region") {
      state.region = {
        x,
        y,
        width: 0,
        height: 0
      };

      regionBox.style.display =
        "block";

      drawRect(regionBox, {
        left: x,
        top: y,
        width: 1,
        height: 1
      });
    } else if (tool === "box") {
      drawing.node = svgNode(
        "rect",
        {
          x,
          y,
          width: 1,
          height: 1,
          rx: 6,
          fill:
            "rgba(239,68,68,.08)",
          stroke: "#ef4444",
          "stroke-width": 3
        }
      );

      marks.appendChild(
        drawing.node
      );
    } else if (
      tool === "arrow"
    ) {
      drawing.node = svgNode(
        "line",
        {
          x1: x,
          y1: y,
          x2: x,
          y2: y,
          stroke: "#ef4444",
          "stroke-width": 4,
          "stroke-linecap": "round",
          "marker-end":
            "url(#arrowhead)"
        }
      );

      marks.appendChild(
        drawing.node
      );
    } else if (tool === "pen") {
      drawing.node = svgNode(
        "path",
        {
          d: `M ${x} ${y}`,
          fill: "none",
          stroke: "#ef4444",
          "stroke-width": 4,
          "stroke-linecap": "round",
          "stroke-linejoin": "round"
        }
      );

      marks.appendChild(
        drawing.node
      );
    } else if (
      tool === "text"
    ) {
      const value = window.prompt(
        "Annotation text"
      );

      if (!value) {
        return;
      }

      const group = svgNode(
        "g",
        {}
      );

      const background =
        svgNode("rect", {
          x,
          y: y - 24,
          width: Math.max(
            80,
            value.length * 8 + 18
          ),
          height: 30,
          rx: 6,
          fill: "#111827"
        });

      const text = svgNode(
        "text",
        {
          x: x + 9,
          y: y - 4,
          fill: "white",
          "font-size": 14,
          "font-family":
            "ui-sans-serif, system-ui",
          "font-weight": 700
        }
      );

      text.textContent = value;

      group.append(
        background,
        text
      );

      marks.appendChild(group);

      state.annotations.push({
        id,
        tool: "text",
        x,
        y,
        text: value
      });

      return;
    }

    state.drawing = drawing;
  }

  function updateDrawing(x, y) {
    const drawing = state.drawing;

    if (!drawing) {
      return;
    }

    drawing.endX = x;
    drawing.endY = y;
    drawing.points.push([x, y]);

    const left = Math.min(
      drawing.startX,
      x
    );

    const top = Math.min(
      drawing.startY,
      y
    );

    const width = Math.abs(
      x - drawing.startX
    );

    const height = Math.abs(
      y - drawing.startY
    );

    if (drawing.tool === "region") {
      state.region = {
        x: left,
        y: top,
        width,
        height
      };

      drawRect(regionBox, {
        left,
        top,
        width,
        height
      });
    } else if (
      drawing.tool === "box"
    ) {
      drawing.node.setAttribute(
        "x",
        String(left)
      );

      drawing.node.setAttribute(
        "y",
        String(top)
      );

      drawing.node.setAttribute(
        "width",
        String(width)
      );

      drawing.node.setAttribute(
        "height",
        String(height)
      );
    } else if (
      drawing.tool === "arrow"
    ) {
      drawing.node.setAttribute(
        "x2",
        String(x)
      );

      drawing.node.setAttribute(
        "y2",
        String(y)
      );
    } else if (
      drawing.tool === "pen"
    ) {
      drawing.node.setAttribute(
        "d",
        pointsToPath(
          drawing.points
        )
      );
    }
  }

  function finishDrawing(x, y) {
    updateDrawing(x, y);

    const drawing = state.drawing;
    state.drawing = null;

    if (!drawing) {
      return;
    }

    if (
      drawing.tool === "region"
    ) {
      state.annotations =
        state.annotations.filter(
          (annotation) =>
            annotation.tool !==
            "region"
        );

      state.annotations.push({
        id: drawing.id,
        tool: "region",
        ...state.region
      });
    } else {
      state.annotations.push({
        id: drawing.id,
        tool: drawing.tool,
        startX: drawing.startX,
        startY: drawing.startY,
        endX: drawing.endX,
        endY: drawing.endY,

        points:
          drawing.tool === "pen"
            ? drawing.points
            : undefined
      });
    }
  }

  function clearMarkup() {
    state.selected = [];
    state.activeSelectionIndex = -1;
    state.annotations = [];
    state.region = null;

    selectionsLayer.textContent = "";
    marks.textContent = "";

    regionBox.style.display =
      "none";
  }

  function buildCaptureContext(intent) {
    redrawSelections();

    const selections =
      state.selected.map(
        (element, index) =>
          snapshotElement(
            element,
            index
          )
      );

    const commonAncestor =
      getCommonAncestor(
        state.selected
      );

    return {
      schemaVersion: "0.1.0",
      intent,

      page: {
        url: location.href,
        title: document.title,
        referrer: document.referrer,

        language:
          document.documentElement
            .lang ||
          navigator.language,

        route:
          `${location.pathname}` +
          `${location.search}` +
          `${location.hash}`,

        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          devicePixelRatio:
            window.devicePixelRatio,
          scrollX: window.scrollX,
          scrollY: window.scrollY
        },

        userAgent:
          navigator.userAgent
      },

      selections,

      commonAncestor:
        commonAncestor
          ? snapshotElement(
              commonAncestor,
              -1
            )
          : null,

      captureRegion:
        state.region ||
        unionRect(
          selections.map(
            (selection) =>
              selection.rect
          )
        ),

      annotations:
        structuredCloneSafe(
          state.annotations
        ),

      documentState: {
        activeElementSelector:
          document.activeElement
            instanceof Element
            ? stableSelector(
                document.activeElement
              )
            : null,

        visibilityState:
          document.visibilityState,

        readyState:
          document.readyState
      }
    };
  }

  function snapshotElement(
    element,
    index
  ) {
    const rect =
      element.getBoundingClientRect();

    const style =
      getComputedStyle(element);

    return {
      id:
        index >= 0
          ? alphaLabel(index)
          : "COMMON_ANCESTOR",

      tagName:
        element.tagName.toLowerCase(),

      selector:
        stableSelector(element),

      text: redactText(
        (
          element.innerText ||
          element.textContent ||
          ""
        ).trim()
      ).slice(0, 4000),

      outerHTML:
        sanitizedOuterHTML(element),

      attributes:
        Object.fromEntries(
          Array.from(
            element.attributes
          ).map((attribute) => [
            attribute.name,

            SECRET_ATTR.test(
              attribute.name
            )
              ? "[REDACTED]"
              : redactText(
                  attribute.value
                )
          ])
        ),

      rect: {
        x: rect.x,
        y: rect.y,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width,
        height: rect.height
      },

      computedStyle:
        Object.fromEntries(
          STYLE_KEYS.map((key) => [
            key,
            style.getPropertyValue(key)
          ])
        ),

      accessibility: {
        role:
          element.getAttribute(
            "role"
          ),

        ariaLabel:
          element.getAttribute(
            "aria-label"
          ),

        ariaLabelledBy:
          element.getAttribute(
            "aria-labelledby"
          ),

        ariaDescribedBy:
          element.getAttribute(
            "aria-describedby"
          ),

        title:
          element.getAttribute(
            "title"
          ),

        tabIndex:
          element.getAttribute(
            "tabindex"
          )
      },

      hierarchy:
        ancestorChain(element),

      siblings:
        siblingSummary(element)
    };
  }

  function sanitizedOuterHTML(
    element
  ) {
    const clone =
      element.cloneNode(true);

    clone
      .querySelectorAll?.(
        "script,style,noscript"
      )
      .forEach((node) =>
        node.remove()
      );

    clone
      .querySelectorAll?.(
        "input,textarea"
      )
      .forEach((node) => {
        node.setAttribute(
          "value",
          "[REDACTED]"
        );

        node.textContent =
          "[REDACTED]";
      });

    clone
      .querySelectorAll?.("*")
      .forEach((node) => {
        for (
          const attribute of
          Array.from(
            node.attributes || []
          )
        ) {
          if (
            SECRET_ATTR.test(
              attribute.name
            )
          ) {
            node.setAttribute(
              attribute.name,
              "[REDACTED]"
            );
          }
        }
      });

    return redactText(
      clone.outerHTML
    ).slice(0, 120_000);
  }

  function ancestorChain(element) {
    const result = [];
    let current = element;

    for (
      let depth = 0;
      current && depth < 10;
      depth += 1
    ) {
      result.push({
        tagName:
          current.tagName
            ?.toLowerCase() || null,

        selector:
          current instanceof Element
            ? stableSelector(current)
            : null,

        id: current.id || null,

        className:
          typeof current.className ===
          "string"
            ? current.className
            : null
      });

      current =
        current.parentElement;
    }

    return result;
  }

  function siblingSummary(element) {
    return Array.from(
      element.parentElement
        ?.children || []
    )
      .slice(0, 30)
      .map((sibling, index) => ({
        index,
        selected:
          sibling === element,

        tagName:
          sibling.tagName.toLowerCase(),

        selector:
          stableSelector(sibling),

        text: redactText(
          (
            sibling.textContent || ""
          ).trim()
        ).slice(0, 160)
      }));
  }

  function stableSelector(element) {
    if (
      !(element instanceof Element)
    ) {
      return null;
    }

    if (element.id) {
      return `#${cssEscape(
        element.id
      )}`;
    }

    for (const attribute of [
      "data-testid",
      "data-test",
      "data-cy",
      "name",
      "aria-label"
    ]) {
      const value =
        element.getAttribute(
          attribute
        );

      if (
        value &&
        value.length < 100
      ) {
        return (
          `${element.tagName.toLowerCase()}` +
          `[${attribute}="${cssString(
            value
          )}"]`
        );
      }
    }

    const parts = [];
    let current = element;

    while (
      current &&
      current !==
        document.documentElement &&
      parts.length < 7
    ) {
      let part =
        current.tagName.toLowerCase();

      const classes = Array.from(
        current.classList || []
      )
        .filter((name) =>
          /^[A-Za-z_-][A-Za-z0-9_-]*$/.test(
            name
          )
        )
        .slice(0, 2);

      if (classes.length) {
        part += classes
          .map(
            (name) =>
              `.${cssEscape(name)}`
          )
          .join("");
      }

      const siblings =
        current.parentElement
          ? Array.from(
              current.parentElement
                .children
            ).filter(
              (node) =>
                node.tagName ===
                current.tagName
            )
          : [];

      if (siblings.length > 1) {
        part +=
          `:nth-of-type(` +
          `${siblings.indexOf(
            current
          ) + 1})`;
      }

      parts.unshift(part);

      current =
        current.parentElement;
    }

    return parts.join(" > ");
  }

  function getCommonAncestor(
    elements
  ) {
    if (!elements.length) {
      return null;
    }

    let ancestor = elements[0];

    while (
      ancestor &&
      !elements.every((element) =>
        ancestor.contains(element)
      )
    ) {
      ancestor =
        ancestor.parentElement;
    }

    return ancestor;
  }

  function unionRect(rects) {
    if (!rects.length) {
      return {
        x: 0,
        y: 0,
        width: innerWidth,
        height: innerHeight
      };
    }

    const left = Math.min(
      ...rects.map(
        (rect) => rect.left
      )
    );

    const top = Math.min(
      ...rects.map(
        (rect) => rect.top
      )
    );

    const right = Math.max(
      ...rects.map(
        (rect) => rect.right
      )
    );

    const bottom = Math.max(
      ...rects.map(
        (rect) => rect.bottom
      )
    );

    return {
      x: left,
      y: top,
      width: right - left,
      height: bottom - top
    };
  }

  function alphaLabel(index) {
    let number = index;
    let label = "";

    do {
      label =
        String.fromCharCode(
          65 + (number % 26)
        ) + label;

      number =
        Math.floor(number / 26) - 1;
    } while (number >= 0);

    return label;
  }

  function svgNode(
    name,
    attributes
  ) {
    const node =
      document.createElementNS(
        "http://www.w3.org/2000/svg",
        name
      );

    for (const [key, value] of
      Object.entries(attributes)) {
      node.setAttribute(
        key,
        String(value)
      );
    }

    return node;
  }

  function pointsToPath(points) {
    if (!points.length) {
      return "";
    }

    return points
      .map(
        ([x, y], index) =>
          `${index ? "L" : "M"} ${x} ${y}`
      )
      .join(" ");
  }

  function structuredCloneSafe(
    value
  ) {
    return JSON.parse(
      JSON.stringify(value)
    );
  }

  function cssEscape(value) {
    return globalThis.CSS?.escape
      ? CSS.escape(value)
      : value.replace(
          /[^a-zA-Z0-9_-]/g,
          "\\$&"
        );
  }

  function cssString(value) {
    return value
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"');
  }

  function redactText(value) {
    return String(value || "")
      .replace(
        /Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi,
        "Bearer [REDACTED]"
      )
      .replace(
        /\b[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/g,
        "[REDACTED_JWT]"
      );
  }

  function toolHint(tool) {
    return {
      select:
        "Select mode. Click, shift-click, or use arrow keys for hierarchy.",

      region:
        "Drag a freeform capture rectangle.",

      box:
        "Drag to draw a box.",

      arrow:
        "Drag to draw an arrow.",

      pen:
        "Drag to draw freehand.",

      text:
        "Click and enter annotation text."
    }[tool] || tool;
  }

  let toastTimer;

  function showToast(message) {
    toast.textContent = message;
    toast.style.display = "block";

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
      toast.style.display = "none";
    }, 2200);
  }
})();
```

---

## `extension/sidepanel.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">

    <meta
      name="viewport"
      content="width=device-width,initial-scale=1"
    >

    <title>Context Capsule</title>

    <link
      rel="stylesheet"
      href="sidepanel.css"
    >
  </head>

  <body>
    <main class="app">
      <header class="topbar">
        <div>
          <div class="eyebrow">
            AGENT CONTEXT
          </div>

          <h1>Context Capsule</h1>
        </div>

        <span
          id="statusPill"
          class="status idle"
        >
          Idle
        </span>
      </header>

      <section class="hero card">
        <div>
          <h2>
            Point at the UI.
            Capture the evidence.
          </h2>

          <p id="pageText">
            Open a web page,
            then arm capture.
          </p>
        </div>

        <button
          id="armButton"
          class="primary"
        >
          Arm capture
        </button>
      </section>

      <section class="card">
        <div class="sectionHeading">
          <div>
            <span class="step">1</span>
            <h3>Select and mark</h3>
          </div>

          <button
            id="clearButton"
            class="ghost small"
          >
            Clear
          </button>
        </div>

        <div
          class="toolGrid"
          id="toolGrid"
        >
          <button
            data-tool="select"
            class="tool active"
          >
            <b>↖</b>
            <span>Select</span>
          </button>

          <button
            data-tool="region"
            class="tool"
          >
            <b>▱</b>
            <span>Region</span>
          </button>

          <button
            data-tool="box"
            class="tool"
          >
            <b>□</b>
            <span>Box</span>
          </button>

          <button
            data-tool="arrow"
            class="tool"
          >
            <b>→</b>
            <span>Arrow</span>
          </button>

          <button
            data-tool="pen"
            class="tool"
          >
            <b>⌁</b>
            <span>Pen</span>
          </button>

          <button
            data-tool="text"
            class="tool"
          >
            <b>T</b>
            <span>Text</span>
          </button>
        </div>

        <p class="hint">
          Shift-click selects multiple components.
          Arrow keys move through parent,
          child and siblings.
        </p>
      </section>

      <section class="card">
        <div class="sectionHeading">
          <div>
            <span class="step">2</span>
            <h3>Describe the change</h3>
          </div>
        </div>

        <label class="field">
          <span>What is wrong?</span>

          <textarea
            id="actualInput"
            rows="3"
            placeholder="The middle pricing card is shorter and the button no longer aligns with the other cards."
          ></textarea>
        </label>

        <label class="field">
          <span>What should happen?</span>

          <textarea
            id="expectedInput"
            rows="3"
            placeholder="All pricing cards should have equal height and aligned buttons at every desktop breakpoint."
          ></textarea>
        </label>

        <label class="field compact">
          <span>Capture label</span>

          <input
            id="labelInput"
            value="Desktop view"
          >
        </label>
      </section>

      <section class="card">
        <div class="sectionHeading">
          <div>
            <span class="step">3</span>
            <h3>Add frames</h3>
          </div>

          <span
            id="frameCount"
            class="counter"
          >
            0
          </span>
        </div>

        <button
          id="captureButton"
          class="secondary full"
        >
          Capture current view
        </button>

        <div
          id="frames"
          class="frames empty"
        >
          No frames yet.
        </div>
      </section>

      <section class="card exportCard">
        <div class="sectionHeading">
          <div>
            <span class="step">4</span>
            <h3>Export to your agent</h3>
          </div>
        </div>

        <button
          id="exportButton"
          class="primary full"
        >
          Create local capsule
        </button>

        <button
          id="downloadButton"
          class="ghost full"
        >
          Download JSON fallback
        </button>

        <p
          id="exportResult"
          class="result"
        ></p>
      </section>

      <footer>
        <button
          id="stopButton"
          class="danger ghost full"
        >
          Stop and detach debugger
        </button>
      </footer>
    </main>

    <script
      type="module"
      src="sidepanel.js"
    ></script>
  </body>
</html>
```

---

## `extension/sidepanel.css`

```css
:root {
  color-scheme: light;

  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;

  background: #f5f6f8;
  color: #171923;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 340px;

  background:
    radial-gradient(
      circle at top right,
      #ede9fe 0,
      transparent 30%
    ),
    #f5f6f8;
}

button,
input,
textarea {
  font: inherit;
}

button {
  cursor: pointer;
}

.app {
  display: grid;
  gap: 12px;
  padding: 14px;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3px 2px 6px;
}

.eyebrow {
  font-size: 10px;
  line-height: 1;
  letter-spacing: 0.17em;
  font-weight: 800;
  color: #6d28d9;
}

h1 {
  margin: 5px 0 0;
  font-size: 21px;
  letter-spacing: -0.035em;
}

h2 {
  margin: 0 0 6px;
  font-size: 18px;
  line-height: 1.15;
  letter-spacing: -0.025em;
}

h3 {
  display: inline;
  margin: 0;
  font-size: 14px;
}

p {
  margin: 0;
}

.card {
  border:
    1px solid
    rgba(17, 24, 39, 0.08);

  border-radius: 16px;

  background:
    rgba(255, 255, 255, 0.92);

  box-shadow:
    0 7px 24px
    rgba(17, 24, 39, 0.06);

  padding: 14px;
}

.hero {
  display: grid;
  gap: 13px;

  background:
    linear-gradient(
      145deg,
      #111827,
      #312e81
    );

  color: white;
}

.hero p {
  color:
    rgba(255, 255, 255, 0.72);

  font-size: 12px;
  line-height: 1.45;
}

.status {
  padding: 6px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  background: #e5e7eb;
  color: #4b5563;
}

.status.armed {
  background: #dcfce7;
  color: #166534;
}

.status.error {
  background: #fee2e2;
  color: #991b1b;
}

.sectionHeading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.sectionHeading > div {
  display: flex;
  align-items: center;
  gap: 8px;
}

.step {
  display: inline-grid;
  place-items: center;

  width: 23px;
  height: 23px;

  border-radius: 7px;

  background: #ede9fe;
  color: #6d28d9;

  font-size: 11px;
  font-weight: 900;
}

.primary,
.secondary,
.ghost {
  border: 0;
  border-radius: 10px;
  padding: 10px 13px;
  font-weight: 800;

  transition:
    transform 0.12s ease,
    opacity 0.12s ease,
    box-shadow 0.12s ease;
}

.primary:hover,
.secondary:hover,
.ghost:hover,
.tool:hover {
  transform: translateY(-1px);
}

.primary {
  background: #7c3aed;
  color: white;

  box-shadow:
    0 7px 18px
    rgba(124, 58, 237, 0.24);
}

.secondary {
  color: #312e81;
  background: #eef2ff;

  border:
    1px solid #c7d2fe;
}

.ghost {
  color: #4b5563;
  background: #f3f4f6;
}

.danger {
  color: #b91c1c;
  background: #fff1f2;
}

.small {
  padding: 7px 9px;
  font-size: 11px;
}

.full {
  width: 100%;
}

button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none;
}

.toolGrid {
  display: grid;

  grid-template-columns:
    repeat(3, 1fr);

  gap: 7px;
}

.tool {
  display: grid;
  place-items: center;
  gap: 4px;

  min-height: 58px;

  border:
    1px solid #e5e7eb;

  border-radius: 11px;
  background: white;
  color: #4b5563;
}

.tool b {
  font-size: 18px;
  color: #111827;
}

.tool span {
  font-size: 10px;
  font-weight: 800;
}

.tool.active {
  border-color: #8b5cf6;
  background: #f5f3ff;
  color: #6d28d9;

  box-shadow:
    inset 0 0 0 1px
    #c4b5fd;
}

.hint {
  margin-top: 10px;
  color: #6b7280;
  font-size: 11px;
  line-height: 1.45;
}

.field {
  display: grid;
  gap: 6px;
  margin-top: 11px;
}

.field:first-of-type {
  margin-top: 0;
}

.field span {
  font-size: 11px;
  font-weight: 800;
  color: #4b5563;
}

textarea,
input {
  width: 100%;

  border:
    1px solid #d1d5db;

  border-radius: 10px;
  background: #fafafa;
  color: #111827;
  padding: 10px;
  outline: none;
  resize: vertical;
}

textarea:focus,
input:focus {
  border-color: #8b5cf6;

  box-shadow:
    0 0 0 3px
    rgba(139, 92, 246, 0.12);

  background: white;
}

.compact input {
  padding: 8px 10px;
}

.counter {
  display: inline-grid;
  place-items: center;

  min-width: 24px;
  height: 24px;
  padding: 0 7px;

  border-radius: 999px;
  background: #111827;
  color: white;

  font-size: 11px;
  font-weight: 900;
}

.frames {
  display: grid;
  gap: 8px;
  margin-top: 10px;
}

.frames.empty {
  min-height: 62px;
  place-items: center;

  border:
    1px dashed #d1d5db;

  border-radius: 11px;
  color: #9ca3af;
  font-size: 11px;
}

.frame {
  display: grid;

  grid-template-columns:
    58px 1fr auto;

  gap: 9px;
  align-items: center;

  border:
    1px solid #e5e7eb;

  border-radius: 11px;
  padding: 7px;
}

.frame img {
  width: 58px;
  height: 43px;
  object-fit: cover;

  border-radius: 7px;
  background: #e5e7eb;
}

.frame strong {
  display: block;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.frame small {
  color: #6b7280;
  font-size: 10px;
}

.frame button {
  border: 0;
  background: transparent;
  color: #9ca3af;
  font-size: 17px;
}

.exportCard {
  display: grid;
  gap: 8px;
}

.exportCard .sectionHeading {
  margin-bottom: 3px;
}

.result {
  min-height: 16px;
  font-size: 11px;
  line-height: 1.45;
  color: #166534;
  word-break: break-word;
}

footer {
  padding-bottom: 8px;
}
```

---

## `extension/sidepanel.js`

```javascript
const HOST_NAME =
  "com.contextcapsule.host";

const frames = [];

const port = chrome.runtime.connect({
  name: "context-capsule-panel"
});

const pending = new Map();

let sequence = 0;

port.onMessage.addListener(
  (message) => {
    if (!message.requestId) {
      return;
    }

    const entry =
      pending.get(message.requestId);

    if (!entry) {
      return;
    }

    pending.delete(
      message.requestId
    );

    if (message.ok) {
      entry.resolve(message.result);
    } else {
      entry.reject(
        new Error(message.error)
      );
    }
  }
);

const $ = (selector) =>
  document.querySelector(selector);

const statusPill =
  $("#statusPill");

const pageText =
  $("#pageText");

const armButton =
  $("#armButton");

const stopButton =
  $("#stopButton");

const captureButton =
  $("#captureButton");

const clearButton =
  $("#clearButton");

const exportButton =
  $("#exportButton");

const downloadButton =
  $("#downloadButton");

const frameCount =
  $("#frameCount");

const framesNode =
  $("#frames");

const exportResult =
  $("#exportResult");

armButton.addEventListener(
  "click",
  async () => {
    await runUi(
      armButton,
      async () => {
        await request("ARM");
        await refreshStatus();
      }
    );
  }
);

stopButton.addEventListener(
  "click",
  async () => {
    await runUi(
      stopButton,
      async () => {
        await request("STOP");
        await refreshStatus();
      }
    );
  }
);

captureButton.addEventListener(
  "click",
  async () => {
    await runUi(
      captureButton,
      async () => {
        const intent = {
          label:
            $("#labelInput")
              .value.trim() ||
            `Frame ${frames.length + 1}`,

          actual:
            $("#actualInput")
              .value.trim(),

          expected:
            $("#expectedInput")
              .value.trim()
        };

        const rawFrame =
          await request(
            "CAPTURE_FRAME",
            { intent }
          );

        const cropped =
          await cropScreenshot(
            rawFrame.screenshotDataUrl,
            rawFrame.pageContext,
            72
          );

        frames.push({
          ...rawFrame,
          screenshotDataUrl:
            cropped,
          intent
        });

        renderFrames();
      }
    );
  }
);

clearButton.addEventListener(
  "click",
  async () => {
    await request(
      "CLEAR_MARKUP"
    );
  }
);

document
  .querySelectorAll("[data-tool]")
  .forEach((button) => {
    button.addEventListener(
      "click",
      async () => {
        document
          .querySelectorAll(
            "[data-tool]"
          )
          .forEach((item) =>
            item.classList.remove(
              "active"
            )
          );

        button.classList.add(
          "active"
        );

        await request(
          "SET_TOOL",
          {
            tool:
              button.dataset.tool
          }
        );
      }
    );
  });

exportButton.addEventListener(
  "click",
  async () => {
    await runUi(
      exportButton,
      async () => {
        if (!frames.length) {
          throw new Error(
            "Add at least one frame first."
          );
        }

        exportResult.textContent = "";

        const capsule =
          await buildCapsule(frames);

        const result =
          await writeCapsuleToNative(
            capsule
          );

        const prompt =
          buildClipboardPrompt(
            result.captureId
          );

        await navigator.clipboard.writeText(
          prompt
        );

        exportResult.style.color =
          "#166534";

        exportResult.textContent =
          `Saved locally as ` +
          `${result.captureId}. ` +
          `Agent prompt copied ` +
          `to clipboard.`;
      }
    );
  }
);

downloadButton.addEventListener(
  "click",
  async () => {
    await runUi(
      downloadButton,
      async () => {
        if (!frames.length) {
          throw new Error(
            "Add at least one frame first."
          );
        }

        const capsule =
          await buildCapsule(frames);

        const blob = new Blob(
          [
            JSON.stringify(
              capsule.fallback,
              null,
              2
            )
          ],
          {
            type:
              "application/json"
          }
        );

        const url =
          URL.createObjectURL(blob);

        await chrome.downloads.download(
          {
            url,

            filename:
              `${capsule.captureId}.json`,

            saveAs: true
          }
        );

        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 10_000);
      }
    );
  }
);

chrome.runtime.onMessage.addListener(
  (message) => {
    if (
      message.type ===
      "CC_STATUS_CHANGED"
    ) {
      void refreshStatus();
    }
  }
);

void refreshStatus();

function request(type, payload = {}) {
  const requestId =
    `${Date.now()}-${sequence++}`;

  return new Promise(
    (resolve, reject) => {
      pending.set(
        requestId,
        {
          resolve,
          reject
        }
      );

      port.postMessage({
        requestId,
        type,
        ...payload
      });

      setTimeout(() => {
        if (
          !pending.has(requestId)
        ) {
          return;
        }

        pending.delete(requestId);

        reject(
          new Error(
            `${type} timed out.`
          )
        );
      }, 30_000);
    }
  );
}

async function refreshStatus() {
  try {
    const status =
      await request("GET_STATUS");

    if (status.url) {
      const host =
        new URL(status.url).host;

      pageText.textContent =
        `${status.title || "Current page"}` +
        ` · ${host}`;
    } else {
      pageText.textContent =
        "Open a web page, then arm capture.";
    }

    const armed =
      status.armed &&
      status.attached;

    statusPill.textContent =
      armed ? "Armed" : "Idle";

    statusPill.className =
      `status ${armed ? "armed" : "idle"}`;

    armButton.textContent =
      status.armed
        ? "Re-arm"
        : "Arm capture";

    captureButton.disabled =
      !armed;
  } catch (error) {
    statusPill.textContent =
      "Error";

    statusPill.className =
      "status error";

    pageText.textContent =
      error.message;
  }
}

async function runUi(
  button,
  fn
) {
  const original =
    button.textContent;

  button.disabled = true;
  button.textContent = "Working...";

  try {
    await fn();
  } catch (error) {
    exportResult.textContent =
      error.message;

    exportResult.style.color =
      "#991b1b";
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

function renderFrames() {
  frameCount.textContent =
    String(frames.length);

  framesNode.classList.toggle(
    "empty",
    frames.length === 0
  );

  framesNode.textContent = "";

  if (!frames.length) {
    framesNode.textContent =
      "No frames yet.";

    return;
  }

  frames.forEach(
    (frame, index) => {
      const node =
        document.createElement("div");

      node.className = "frame";

      node.innerHTML = `
        <img alt="Frame ${index + 1}">

        <div>
          <strong></strong>
          <small></small>
        </div>

        <button
          aria-label="Remove frame"
        >
          ×
        </button>
      `;

      node.querySelector("img").src =
        frame.screenshotDataUrl;

      node.querySelector(
        "strong"
      ).textContent =
        frame.intent.label;

      node.querySelector(
        "small"
      ).textContent =
        `${frame.pageContext.selections.length}` +
        ` selection(s)`;

      node
        .querySelector("button")
        .addEventListener(
          "click",
          () => {
            frames.splice(index, 1);
            renderFrames();
          }
        );

      framesNode.appendChild(node);
    }
  );
}

async function cropScreenshot(
  dataUrl,
  pageContext,
  paddingCssPx
) {
  const image =
    await loadImage(dataUrl);

  const viewport =
    pageContext.page.viewport;

  const region =
    pageContext.captureRegion || {
      x: 0,
      y: 0,
      width: viewport.width,
      height: viewport.height
    };

  const scaleX =
    image.naturalWidth /
    viewport.width;

  const scaleY =
    image.naturalHeight /
    viewport.height;

  const leftCss = Math.max(
    0,
    region.x - paddingCssPx
  );

  const topCss = Math.max(
    0,
    region.y - paddingCssPx
  );

  const rightCss = Math.min(
    viewport.width,
    region.x +
      region.width +
      paddingCssPx
  );

  const bottomCss = Math.min(
    viewport.height,
    region.y +
      region.height +
      paddingCssPx
  );

  const sx = Math.round(
    leftCss * scaleX
  );

  const sy = Math.round(
    topCss * scaleY
  );

  const sw = Math.max(
    1,
    Math.round(
      (rightCss - leftCss) *
        scaleX
    )
  );

  const sh = Math.max(
    1,
    Math.round(
      (bottomCss - topCss) *
        scaleY
    )
  );

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width = sw;
  canvas.height = sh;

  const context =
    canvas.getContext("2d");

  context.drawImage(
    image,
    sx,
    sy,
    sw,
    sh,
    0,
    0,
    sw,
    sh
  );

  return canvas.toDataURL(
    "image/png"
  );
}

async function buildCapsule(
  inputFrames
) {
  const captureId =
    "context-capsule-" +
    new Date()
      .toISOString()
      .replace(/[:.]/g, "-");

  const boardDataUrl =
    await makeBoard(inputFrames);

  const first = inputFrames[0];

  const manifest = {
    schemaVersion: "0.1.0",
    captureId,

    createdAt:
      new Date().toISOString(),

    intent: {
      actual:
        first.intent.actual,

      expected:
        first.intent.expected
    },

    page: {
      url:
        first.pageContext.page.url,

      title:
        first.pageContext.page.title
    },

    frames: inputFrames.map(
      (frame, index) => ({
        id:
          `frame-` +
          String(index + 1).padStart(
            2,
            "0"
          ),

        label:
          frame.intent.label,

        capturedAt:
          frame.capturedAt,

        viewport:
          frame.pageContext.page
            .viewport,

        selections:
          frame.pageContext
            .selections
            .map((selection) => ({
              id:
                selection.id,

              selector:
                selection.selector,

              tagName:
                selection.tagName
            }))
      })
    ),

    redaction: {
      authorizationHeaders: true,
      cookieHeaders: true,
      passwordFields: true,
      tokenPatterns: true
    }
  };

  const files = [
    textFile(
      "manifest.json",
      JSON.stringify(
        manifest,
        null,
        2
      )
    ),

    textFile(
      "README_FOR_AGENT.md",
      buildAgentReadme(manifest)
    ),

    textFile(
      "prompt.md",
      buildPromptFile(manifest)
    ),

    imageFile(
      "visual/board.png",
      boardDataUrl
    )
  ];

  inputFrames.forEach(
    (frame, index) => {
      const number =
        String(index + 1).padStart(
          2,
          "0"
        );

      files.push(
        imageFile(
          `visual/frame-${number}.png`,
          frame.screenshotDataUrl
        )
      );

      files.push(
        textFile(
          `page/frame-${number}-selection.json`,

          JSON.stringify(
            frame.pageContext,
            null,
            2
          )
        )
      );

      files.push(
        textFile(
          `page/frame-${number}-cdp.json`,

          JSON.stringify(
            frame.cdpContext,
            null,
            2
          )
        )
      );

      files.push(
        textFile(
          `framework/frame-${number}-app-context.json`,

          JSON.stringify(
            frame.appContext,
            null,
            2
          )
        )
      );

      files.push(
        textFile(
          `runtime/frame-${number}-runtime.json`,

          JSON.stringify(
            frame.runtime,
            null,
            2
          )
        )
      );
    }
  );

  return {
    captureId,
    files,

    fallback: {
      manifest,

      frames:
        inputFrames.map(
          (frame) => ({
            capturedAt:
              frame.capturedAt,

            intent:
              frame.intent,

            pageContext:
              frame.pageContext,

            cdpContext:
              frame.cdpContext,

            appContext:
              frame.appContext,

            runtime:
              frame.runtime,

            screenshotDataUrl:
              frame.screenshotDataUrl
          })
        ),

      boardDataUrl
    }
  };
}

function textFile(path, text) {
  return {
    path,
    encoding: "utf8",
    data: text
  };
}

function imageFile(
  path,
  dataUrl
) {
  return {
    path,
    encoding: "base64",

    data:
      dataUrl.split(",")[1]
  };
}

async function makeBoard(
  inputFrames
) {
  const width = 1500;
  const margin = 52;

  const cardWidth =
    width - margin * 2;

  const headerHeight = 112;
  const gap = 34;

  const prepared = [];

  for (const frame of inputFrames) {
    const image =
      await loadImage(
        frame.screenshotDataUrl
      );

    const scale = Math.min(
      1,
      cardWidth /
        image.naturalWidth
    );

    prepared.push({
      frame,
      image,

      width: Math.round(
        image.naturalWidth *
          scale
      ),

      height: Math.round(
        image.naturalHeight *
          scale
      )
    });
  }

  const height =
    margin +
    prepared.reduce(
      (total, item) =>
        total +
        headerHeight +
        item.height +
        gap,
      0
    );

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width = width;
  canvas.height = height;

  const context =
    canvas.getContext("2d");

  context.fillStyle = "#f3f4f6";
  context.fillRect(
    0,
    0,
    width,
    height
  );

  let y = margin;

  prepared.forEach(
    (item, index) => {
      context.fillStyle =
        "#ffffff";

      roundRect(
        context,
        margin,
        y,
        cardWidth,
        headerHeight +
          item.height,
        22
      );

      context.fill();

      context.fillStyle =
        "#111827";

      context.font =
        "700 28px system-ui";

      context.fillText(
        `${index + 1}. ` +
          item.frame.intent.label,
        margin + 28,
        y + 44
      );

      context.fillStyle =
        "#6b7280";

      context.font =
        "500 18px system-ui";

      context.fillText(
        item.frame.pageContext
          .page.url.slice(0, 120),
        margin + 28,
        y + 76
      );

      context.fillText(
        `${item.frame.pageContext.page.viewport.width}` +
          ` × ` +
          `${item.frame.pageContext.page.viewport.height}` +
          ` CSS px`,
        margin + 28,
        y + 101
      );

      context.drawImage(
        item.image,

        margin +
          (
            cardWidth -
            item.width
          ) /
            2,

        y + headerHeight,
        item.width,
        item.height
      );

      y +=
        headerHeight +
        item.height +
        gap;
    }
  );

  return canvas.toDataURL(
    "image/png"
  );
}

function roundRect(
  context,
  x,
  y,
  width,
  height,
  radius
) {
  context.beginPath();

  context.roundRect(
    x,
    y,
    width,
    height,
    radius
  );
}

function loadImage(src) {
  return new Promise(
    (resolve, reject) => {
      const image = new Image();

      image.onload = () =>
        resolve(image);

      image.onerror = () =>
        reject(
          new Error(
            "Could not decode screenshot."
          )
        );

      image.src = src;
    }
  );
}

async function writeCapsuleToNative(
  capsule
) {
  const native =
    chrome.runtime.connectNative(
      HOST_NAME
    );

  const inflight = new Map();

  let idCounter = 0;

  native.onMessage.addListener(
    (message) => {
      const waiter =
        inflight.get(message.id);

      if (!waiter) {
        return;
      }

      inflight.delete(message.id);

      if (message.ok) {
        waiter.resolve(
          message.result
        );
      } else {
        waiter.reject(
          new Error(message.error)
        );
      }
    }
  );

  native.onDisconnect.addListener(
    () => {
      const error =
        chrome.runtime.lastError
          ?.message ||
        "Native host disconnected.";

      for (const waiter of
        inflight.values()) {
        waiter.reject(
          new Error(error)
        );
      }

      inflight.clear();
    }
  );

  const send = (
    type,
    payload = {}
  ) =>
    new Promise(
      (resolve, reject) => {
        const id =
          `native-${idCounter++}`;

        inflight.set(id, {
          resolve,
          reject
        });

        native.postMessage({
          id,
          type,
          ...payload
        });
      }
    );

  await send("BEGIN", {
    captureId:
      capsule.captureId
  });

  for (const file of
    capsule.files) {
    await send("PUT_FILE", {
      captureId:
        capsule.captureId,

      path: file.path,
      encoding: file.encoding,
      data: file.data
    });
  }

  const result =
    await send("FINALIZE", {
      captureId:
        capsule.captureId
    });

  native.disconnect();

  return result;
}

function buildAgentReadme(
  manifest
) {
  return `# Context Capsule

Capture ID: ${manifest.captureId}

## Read order

1. Read \`manifest.json\`.
2. Inspect \`visual/board.png\`.
3. Read each \`page/frame-XX-selection.json\` file.
4. Read matching runtime, framework and CDP files only as needed.

## Task

Actual behavior:
${manifest.intent.actual || "Not provided."}

Expected behavior:
${manifest.intent.expected || "Not provided."}

## Rules

- Treat selection IDs A, B, C and so on as the link between visuals and DOM context.
- Do not assume a network response field maps to a DOM node unless the evidence proves it.
- Prefer the smallest code change that fixes the described behavior.
- Preserve unrelated behavior and styles.
`;
}

function buildPromptFile(manifest) {
  return `Investigate capsule ${manifest.captureId}. Start with manifest.json and visual/board.png. Then inspect the selection, framework, runtime and CDP files associated with each frame. Explain the root cause before editing code.
`;
}

function buildClipboardPrompt(
  captureId
) {
  return (
    `Use the Context Capsule MCP server. ` +
    `List files for capture "${captureId}". ` +
    `Read manifest.json, README_FOR_AGENT.md ` +
    `and visual/board.png first. ` +
    `Then inspect only the frame files relevant ` +
    `to the selected components. ` +
    `Explain the root cause and make the smallest ` +
    `safe code change.`
  );
}
```

---

# 3. Local companion

## `companion/package.json`

```json
{
  "name": "context-capsule-companion",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "native": "node native-host.js",
    "mcp": "node mcp-server.js",
    "install-host": "node install-host.mjs"
  },
  "dependencies": {
    "@modelcontextprotocol/server": "2.0.0",
    "zod": "4.4.3"
  }
}
```

Those package versions were current on August 5, 2026. ([npm][5])

---

## `companion/common.js`

```javascript
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
```

---

## `companion/native-host.js`

```javascript
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
```

Do not print logs with `console.log()` inside the native host. Standard output belongs to Chrome’s binary protocol. Debug output must go to standard error, as Chrome’s documentation warns. ([Chrome for Developers][4])

---

## `companion/mcp-server.js`

```javascript
import fs from "node:fs/promises";

import {
  McpServer
} from "@modelcontextprotocol/server";

import {
  serveStdio
} from "@modelcontextprotocol/server/stdio";

import * as z from "zod/v4";

import {
  ensureRoot,
  listCaptureIds,
  capsuleDirectory,
  capsuleFile,
  walkFiles,
  mimeTypeFor,
  safeCaptureId,
  safeRelativePath
} from "./common.js";

await ensureRoot();

serveStdio(() => {
  const server = new McpServer({
    name: "context-capsule",
    version: "0.1.0"
  });

  server.registerTool(
    "list_captures",

    {
      description:
        "List locally stored browser context captures.",

      inputSchema: z.object({
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(20)
      }),

      annotations: {
        readOnlyHint: true
      }
    },

    async ({ limit }) => {
      const captures =
        (
          await listCaptureIds()
        ).slice(0, limit);

      return {
        content: [
          {
            type: "text",

            text:
              JSON.stringify(
                captures,
                null,
                2
              )
          }
        ]
      };
    }
  );

  server.registerTool(
    "list_capture_files",

    {
      description:
        "List every file in one browser context capture.",

      inputSchema: z.object({
        captureId:
          z.string().min(1)
      }),

      annotations: {
        readOnlyHint: true
      }
    },

    async ({ captureId }) => {
      const id =
        safeCaptureId(captureId);

      const files =
        await walkFiles(
          capsuleDirectory(id)
        );

      return {
        content: [
          {
            type: "text",

            text:
              JSON.stringify(
                files,
                null,
                2
              )
          }
        ]
      };
    }
  );

  server.registerTool(
    "read_capture_file",

    {
      description:
        "Read one text or image file from a browser context capture.",

      inputSchema: z.object({
        captureId:
          z.string().min(1),

        path:
          z.string().min(1)
      }),

      annotations: {
        readOnlyHint: true
      }
    },

    async ({
      captureId,
      path: relativePath
    }) => {
      const id =
        safeCaptureId(captureId);

      const safePath =
        safeRelativePath(
          relativePath
        );

      const absolute =
        capsuleFile(
          id,
          safePath
        );

      const mimeType =
        mimeTypeFor(absolute);

      const data =
        await fs.readFile(
          absolute
        );

      if (
        mimeType.startsWith(
          "image/"
        )
      ) {
        return {
          content: [
            {
              type: "image",
              data:
                data.toString(
                  "base64"
                ),
              mimeType
            }
          ]
        };
      }

      return {
        content: [
          {
            type: "text",

            text:
              data.toString(
                "utf8"
              )
          }
        ]
      };
    }
  );

  server.registerResource(
    "latest-capture-index",

    "capsule://latest",

    {
      title:
        "Latest Context Capsule",

      description:
        "Manifest and file index for the newest local browser context capture.",

      mimeType:
        "application/json"
    },

    async (uri) => {
      const [latest] =
        await listCaptureIds();

      if (!latest) {
        return {
          contents: [
            {
              uri: uri.href,

              mimeType:
                "application/json",

              text:
                JSON.stringify({
                  capture: null,
                  files: []
                })
            }
          ]
        };
      }

      const files =
        await walkFiles(
          capsuleDirectory(
            latest
          )
        );

      return {
        contents: [
          {
            uri: uri.href,

            mimeType:
              "application/json",

            text:
              JSON.stringify(
                {
                  capture: latest,
                  files
                },
                null,
                2
              )
          }
        ]
      };
    }
  );

  return server;
});
```

MCP resources are read-only context controlled by the application, while tools are callable operations available to the model. This implementation exposes both a latest-capture resource and explicit file-reading tools. ([ModelContextProtocol][8])

---

## `companion/install-host.mjs`

```javascript
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
```

Chrome uses different native-host manifest locations on macOS, Linux and Windows. `allowed_origins` must name exact extension origins and cannot contain wildcards. ([Chrome for Developers][4])

For a distributed Windows product, package the native host as a real executable. A `.cmd` launcher is adequate for local development but is a lousy commercial installer strategy.

---

# 4. Optional application bridge

The extension can always capture DOM and browser runtime information.

It cannot generically know:

* Your Redux state.
* Your Zustand store.
* Your React Query cache.
* Your feature flags.
* Your internal route name.
* Your component source file.
* The exact transformed API field rendered by a component.

Add this small library to applications where you want deep context.

## `context-capsule-bridge.js`

```javascript
export function installContextCapsuleBridge(
  providers
) {
  if (
    !providers ||
    typeof providers !== "object"
  ) {
    throw new TypeError(
      "Context Capsule providers must be an object."
    );
  }

  globalThis.__CONTEXT_CAPSULE_BRIDGE__ = {
    version: "0.1.0",

    async snapshot({
      selectors
    }) {
      const selectedElements =
        selectors
          .map((selector) => {
            try {
              return document.querySelector(
                selector
              );
            } catch {
              return null;
            }
          })
          .filter(Boolean);

      return {
        capturedAt:
          new Date().toISOString(),

        route:
          await callProvider(
            providers.route,
            {
              pathname:
                location.pathname,

              search:
                location.search,

              hash:
                location.hash
            }
          ),

        currentUser:
          await callProvider(
            providers.currentUser,
            null
          ),

        featureFlags:
          await callProvider(
            providers.featureFlags,
            null
          ),

        applicationState:
          await callProvider(
            providers.applicationState,
            null
          ),

        queryCache:
          await callProvider(
            providers.queryCache,
            null
          ),

        selectedComponents:
          await callProvider(
            providers.selectedComponents,
            selectedElements.map(
              (element, index) => ({
                id:
                  String.fromCharCode(
                    65 + index
                  ),

                element
              })
            )
          )
      };
    }
  };
}

async function callProvider(
  provider,
  fallback
) {
  if (
    typeof provider !== "function"
  ) {
    return fallback;
  }

  try {
    return await provider();
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : String(error)
    };
  }
}
```

Example application registration:

```javascript
import {
  installContextCapsuleBridge
} from "./context-capsule-bridge.js";

installContextCapsuleBridge({
  route() {
    return {
      pathname:
        location.pathname,

      search:
        location.search,

      hash:
        location.hash
    };
  },

  currentUser() {
    return {
      id:
        authenticatedUser.id,

      role:
        authenticatedUser.role
    };
  },

  featureFlags() {
    return featureFlagClient
      .getAllFlags();
  },

  applicationState() {
    return {
      cart:
        cartStore.getState(),

      checkout:
        checkoutStore.getState()
    };
  },

  queryCache() {
    return queryClient
      .getQueryCache()
      .getAll()
      .map((query) => ({
        queryKey:
          query.queryKey,

        state: {
          status:
            query.state.status,

          fetchStatus:
            query.state.fetchStatus,

          dataUpdatedAt:
            query.state.dataUpdatedAt,

          data:
            redactApplicationData(
              query.state.data
            )
        }
      }));
  },

  selectedComponents() {
    /*
     * Framework-specific mapping belongs here.
     * Return component names, props, source mappings,
     * state keys and query dependencies when your
     * application can provide them reliably.
     */
    return [];
  }
});

function redactApplicationData(
  value
) {
  const seen = new WeakSet();

  return JSON.parse(
    JSON.stringify(
      value,

      (key, item) => {
        if (
          /token|secret|password|authorization|cookie/i.test(
            key
          )
        ) {
          return "[REDACTED]";
        }

        if (
          item &&
          typeof item === "object"
        ) {
          if (seen.has(item)) {
            return "[CIRCULAR]";
          }

          seen.add(item);
        }

        return item;
      }
    )
  );
}
```

Do not export your entire production store blindly. That is how private user data, authentication material and internal secrets end up inside an AI prompt.

---

# 5. Install it in the correct order

## Install companion dependencies

From the `companion` directory:

```bash
npm install
```

## Load the extension

Open:

```text
chrome://extensions
```

Then:

1. Enable Developer mode.
2. Click Load unpacked.
3. Select the `extension` directory.
4. Copy the 32-character extension ID shown by Chrome.

## Register the native host

From the `companion` directory:

```bash
node install-host.mjs YOUR_EXTENSION_ID
```

Example shape:

```bash
node install-host.mjs abcdefghijklmnopqrstuvwxyzabcdef
```

The extension ID must contain exactly 32 lowercase characters from `a` through `p`.

Restart Chrome after installing the native host manifest.

## Configure your coding agent

Configure the agent’s MCP host to launch:

```json
{
  "mcpServers": {
    "context-capsule": {
      "command": "node",
      "args": [
        "/absolute/path/context-capsule/companion/mcp-server.js"
      ]
    }
  }
}
```

The exact location of the MCP configuration differs between coding agents, but the transport is the same: the host starts `node mcp-server.js` and communicates through stdio. ([ModelContextProtocol][9])

---

# 6. Test the complete flow

1. Open a local web application.
2. Click the Context Capsule extension icon.
3. Click **Arm capture**.
4. Click an element.
5. Shift-click additional elements.
6. Use the arrow keys:

   * Up for parent.
   * Down for child.
   * Left and right for siblings.
7. Add arrows, boxes, text or pen annotations.
8. Draw a Region around the area to crop.
9. Describe actual and expected behavior.
10. Click **Capture current view**.
11. Resize the page, change the application state or navigate to another view.
12. Re-arm after navigation.
13. Add another frame.
14. Click **Create local capsule**.
15. Paste the generated prompt into your coding agent.

The generated directory will resemble:

```text
context-capsule-2026-08-05T12-58-41-213Z/
├── .complete.json
├── manifest.json
├── README_FOR_AGENT.md
├── prompt.md
│
├── visual/
│   ├── board.png
│   ├── frame-01.png
│   └── frame-02.png
│
├── page/
│   ├── frame-01-selection.json
│   ├── frame-01-cdp.json
│   ├── frame-02-selection.json
│   └── frame-02-cdp.json
│
├── framework/
│   ├── frame-01-app-context.json
│   └── frame-02-app-context.json
│
└── runtime/
    ├── frame-01-runtime.json
    └── frame-02-runtime.json
```

---

# 7. What is wrong with this MVP

Several parts need hardening before you pretend it is production-ready.

## The full DOM snapshot can become enormous

`DOMSnapshot.captureSnapshot()` can return a large representation of the entire page. On a complex application, this may be several megabytes.

The correct production behavior is:

* Default to selected node plus ancestors.
* Make full snapshots optional.
* Compress large JSON files.
* Add maximum capsule size.
* Display expected export size before writing.
* Exclude invisible document branches unless requested.

## Cross-origin iframe handling is incomplete

Chrome debugger supports flat child sessions and automatic attachment to related iframe targets, but that requires session-aware routing and recursive target attachment. The MVP captures the main target and the content script’s main frame. ([Chrome for Developers][1])

You need a second implementation pass for:

* Same-origin iframes.
* Cross-origin iframes.
* Shadow roots.
* Popups.
* Workers.
* Embedded editors and canvases.

## Runtime capture begins only after arming

Anything that happened before the debugger attached is gone. There is no magical recovery.

For production, keep a deliberately armed rolling buffer and make the recording state painfully obvious.

## Text annotations use `window.prompt()`

It works. It is also ugly.

Replace it with an inline floating editor positioned at the click point.

## The collage layout is basic

It vertically stacks screenshots. A polished version should support:

* One-column comparison.
* Two-column before-and-after.
* Mobile viewport strip.
* Automatic labels.
* Zoomed detail insets.
* Shared numbered legend.
* Maximum output dimensions.
* Separate full-resolution source frames.

## Secret detection is not strong enough

Regex redaction is a safety net, not a security model.

A production build needs:

* Entropy-based secret detection.
* JWT detection and decoding checks.
* Credit card and payment-field handling.
* Configurable redaction policies.
* Domain allowlists.
* Response-body review.
* Capture preview.
* Per-file exclusion.
* Automatic expiration.
* Secure deletion where supported.
* No captured-content telemetry.

## Windows installation needs a real installer

Bundle the companion as an executable and register the native host during installation. Depending on an existing Node installation and a `.cmd` launcher is acceptable for development and embarrassing for customers.

---

# 8. The correct development order from here

Build the next versions in this order:

1. **Make this MVP stable**

   * Navigation handling.
   * Better failures.
   * Capture size limits.
   * Automated tests.
   * Clean text annotation.
   * Better redaction review.

2. **Add framework-independent source evidence**

   * Source maps.
   * Script initiator stacks.
   * CSS stylesheet locations.
   * Event listeners.
   * Route transitions.
   * Performance marks.

3. **Build the application bridge SDK**

   * Typed provider interface.
   * Redaction hooks.
   * Schema validation.
   * App-specific state providers.
   * Source location hooks.

4. **Add React support**

   * Component display name.
   * Owner chain.
   * Props.
   * Safe state summaries.
   * React Query links.
   * Source location when available.

5. **Add Vue and Angular adapters**

   * Do not attempt every framework simultaneously.
   * That is how you create five broken integrations instead of one good one.

6. **Add multi-frame and iframe correctness**

   * Frame IDs.
   * Target session IDs.
   * Cross-origin element selection.
   * Worker-related network provenance.

7. **Add agent integrations**

   * MCP first.
   * Generic folder fallback second.
   * Direct IDE integrations later.

8. **Only then build cloud collaboration**

   * Sharing.
   * Comments.
   * Team workspaces.
   * Issue tracking.
   * Retention policies.

The product’s competitive advantage is not screenshot annotation. It is the quality of the evidence graph connecting human intent, visual selections, browser runtime events, application state and source provenance. Everything else is decoration.

[1]: https://developer.chrome.com/docs/extensions/reference/api/debugger "https://developer.chrome.com/docs/extensions/reference/api/debugger"
[2]: https://developer.chrome.com/docs/extensions/reference/api/scripting "https://developer.chrome.com/docs/extensions/reference/api/scripting"
[3]: https://developer.chrome.com/docs/extensions/reference/api/tabs "https://developer.chrome.com/docs/extensions/reference/api/tabs"
[4]: https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging "https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging"
[5]: https://www.npmjs.com/package/%40modelcontextprotocol/server?activeTab=readme "https://www.npmjs.com/package/%40modelcontextprotocol/server?activeTab=readme"
[6]: https://developer.chrome.com/docs/extensions/reference/api/sidePanel "https://developer.chrome.com/docs/extensions/reference/api/sidePanel"
[7]: https://chromedevtools.github.io/devtools-protocol/tot/DOMSnapshot/ "https://chromedevtools.github.io/devtools-protocol/tot/DOMSnapshot/"
[8]: https://ts.sdk.modelcontextprotocol.io/v2/servers/resources.html "https://ts.sdk.modelcontextprotocol.io/v2/servers/resources.html"
[9]: https://ts.sdk.modelcontextprotocol.io/server "https://ts.sdk.modelcontextprotocol.io/server"

Then **do not use the code from the previous answer**. It is a functional proof of concept, not a finished product. Calling it production-ready would be dishonest.

A finished product is not “more code pasted into chat.” It is a tested repository, signed desktop binaries, browser-store packages, installers, privacy disclosures, crash recovery, upgrade handling, framework adapters, security audits and release automation.

## The previous implementation has serious production defects

The biggest one is embarrassing: it stores active capture sessions in a service-worker `Map`. Chrome can terminate an extension service worker after roughly 30 seconds of inactivity, and all global variables disappear. Chrome explicitly says persistent state must be stored rather than kept in globals. So the capture could silently lose network requests, logs and selection state. ([Chrome for Developers][1])

Other major defects:

* Cross-origin iframes, workers and out-of-process frames are not captured properly. Production implementation requires CDP flat sessions and `Target.setAutoAttach`, routing every command and event by `sessionId`. ([Chrome for Developers][2])
* A JavaScript or Node native host is poor commercial packaging. Users would need Node installed, scripts could be moved or deleted, and Windows/macOS signing would be messy.
* The regex-based secret redaction is nowhere near safe enough for authentication tokens, private API responses, customer records and payment data.
* The capture package has files but no proper evidence graph connecting screenshots, annotations, DOM nodes, network requests, component state and source locations.
* It does not support canvas, WebGL, closed Shadow DOM, nested frames, popups, browser zoom, transformed coordinates or full-page capture correctly.
* It has no migrations, crash recovery, automatic cleanup, corruption detection, storage quotas or version compatibility.
* It has no meaningful automated test suite.
* It has no signed installers, auto-update mechanism, privacy policy, consent workflow or Chrome Web Store submission package.
* It claims broad agent compatibility while relying primarily on MCP. MCP is increasingly common, but it is not supported identically by every coding agent. The universal fallback must remain an ordinary local folder plus a compact prompt. ([Model Context Protocol][3])

## What the finished product should actually be

Use these product defaults:

**Product name:** Context Capsule
**Initial browser:** Chrome and Chromium browsers
**Operating systems:** Windows 11, macOS 13+, Ubuntu 22.04+
**Storage:** Local-only by default
**Cloud:** None in version 1
**Agent interface:** MCP stdio, local folder export and clipboard prompt
**Framework support:** Generic DOM, React, Vue and Angular
**Business model:** Paid desktop companion with a free local capture tier
**Primary purpose:** Package selected live-application context for coding agents

Do not support Safari, Firefox, mobile browsers, remote collaboration or automatic code editing in the first commercial release. Calling every imaginable platform “version 1” is how projects rot before launch.

# Final production architecture

## 1. Chromium extension

The extension handles only browser-facing work:

* Selection overlays.
* Element and group selection.
* Parent, child and sibling navigation.
* Freeform capture regions.
* Visual annotations.
* Screenshot coordination.
* CDP attachment.
* Runtime event collection.
* Consent and capture review.
* Communication with the desktop companion.

Use:

* Manifest V3.
* TypeScript.
* React for the side panel.
* IndexedDB for durable capture buffers.
* An offscreen document for canvas and image composition.
* `chrome.debugger` for deep runtime capture.
* `activeTab` for explicit user-triggered page access.
* Native Messaging for communication with the companion.

The `debugger` permission is mandatory for CDP access and is a powerful permission. Chrome also warns users when extensions request sensitive permissions, so the onboarding must explain exactly what is captured and why. ([Chrome for Developers][2])

## 2. Native desktop companion

Build this in **Rust**, not Node.

The companion should be one signed native binary containing:

* Native Messaging host.
* MCP stdio server.
* Capsule filesystem manager.
* Compression engine.
* Encryption support.
* Secret scanner.
* Automatic expiration.
* Installer and update support.
* Local diagnostic logs.
* Agent configuration helper.

Use a Rust workspace approximately like this:

```text
desktop/
├── crates/
│   ├── capsule-core/
│   ├── capsule-schema/
│   ├── capsule-storage/
│   ├── capsule-redaction/
│   ├── capsule-native-host/
│   ├── capsule-mcp/
│   ├── capsule-installer/
│   └── capsule-cli/
├── Cargo.toml
└── Cargo.lock
```

Native Messaging hosts must be separately installed and registered with exact extension origins. Wildcard extension origins are not allowed. ([Chrome for Developers][4])

## 3. Durable capture engine

The extension must never rely on service-worker memory.

Use IndexedDB stores:

```text
capture_sessions
capture_events
network_requests
network_bodies
console_events
exceptions
user_actions
frames
selections
annotations
export_jobs
```

Every record needs:

```ts
interface DurableRecord {
  schemaVersion: number;
  captureId: string;
  tabId: number;
  frameId?: string;
  targetSessionId?: string;
  sequence: number;
  wallTime: string;
  monotonicTime?: number;
}
```

Writes should be batched every 250 to 500 milliseconds and immediately flushed on:

* Capture.
* Navigation.
* Tab deactivation.
* Debugger detachment.
* Extension suspension signals.
* Native companion disconnection.

Use a monotonically increasing sequence number. Timestamps alone are insufficient because CDP domains use different time bases.

## 4. Multi-target CDP orchestration

On arm:

```text
chrome.debugger.attach
Target.setAutoAttach
  autoAttach: true
  waitForDebuggerOnStart: false
  flatten: true
Target.setDiscoverTargets
Network.enable
Runtime.enable
Log.enable
Page.enable
DOM.enable
CSS.enable
Accessibility.enable
Performance.enable
```

For each child target:

* Record its `sessionId`.
* Enable the required CDP domains in that child session.
* Associate events with frame URLs and target types.
* Handle target detachment.
* Handle navigations that replace execution contexts.
* Handle service workers and shared workers separately.
* Avoid merging unrelated requests from other embedded applications.

Chrome officially supports flat debugger sessions for child targets such as out-of-process frames and workers. ([Chrome for Developers][2])

## 5. Capture modes

The finished product needs distinct modes.

### Visual capture

Captures:

* Visible viewport.
* Selected region with configurable padding.
* Full page.
* Specific scrolling container.
* Element-only screenshot.
* Multiple view board.
* Before-and-after comparison.
* Responsive viewport matrix.

### Structural capture

Captures:

* Selected DOM nodes.
* Ancestors.
* Nearby siblings.
* Shadow-root ancestry.
* Frame ancestry.
* Computed styles.
* Matched rules.
* Stylesheet URLs and source locations.
* Pseudo-elements.
* Layout boxes.
* Paint order.
* Stacking contexts.
* Accessibility tree.
* Event listeners.
* Form state with redaction.
* CSS custom properties.
* Active media queries.
* Container-query state.

### Runtime capture

Captures:

* Console calls.
* Browser logs.
* Exceptions.
* Promise rejections.
* Network requests.
* Request initiators.
* Redirect chains.
* Response metadata.
* Approved response bodies.
* WebSocket frames.
* Server-sent events.
* User interactions.
* Route changes.
* Performance entries.
* Long tasks.
* Layout shifts.
* Resource failures.

### Application capture

Using an optional SDK:

* Framework component.
* Owner hierarchy.
* Source file.
* Source line and column.
* Props.
* State.
* Context.
* Store slices.
* Query-cache records.
* Feature flags.
* Route metadata.
* Component render history.
* Data provenance supplied by the application.

# The context graph

Do not dump unrelated JSON into folders and hope the agent figures it out.

Store entities and relationships:

```ts
type Entity =
  | PageEntity
  | ViewEntity
  | FrameEntity
  | DomNodeEntity
  | ComponentEntity
  | AnnotationEntity
  | NetworkRequestEntity
  | NetworkResponseEntity
  | ConsoleEventEntity
  | SourceLocationEntity
  | StateValueEntity
  | ScreenshotEntity;

interface EvidenceEdge {
  id: string;

  from: string;
  to: string;

  relation:
    | "contains"
    | "renders"
    | "selected-as"
    | "annotates"
    | "initiated"
    | "returned"
    | "consumed"
    | "mapped-to"
    | "located-at"
    | "occurred-before"
    | "occurred-after"
    | "possibly-related";

  confidence: "exact" | "strong" | "possible";
  evidence: string[];
}
```

Example:

```json
{
  "from": "network-response:req-172",
  "to": "component:PricingCard-3",
  "relation": "consumed",
  "confidence": "exact",
  "evidence": [
    "app-bridge:react-query-observer",
    "query-key:[\"pricing-plans\"]",
    "component-prop:plan"
  ]
}
```

Never label inferred relationships as exact. That would give coding agents false confidence and cause bad edits.

# Finished capsule format

```text
capture-01K1T7M8J9/
├── capsule.json
├── manifest.json
├── agent-instructions.md
├── integrity.json
│
├── graph/
│   ├── entities.ndjson
│   ├── edges.ndjson
│   └── index.json
│
├── visual/
│   ├── board.png
│   ├── views/
│   │   ├── view-001.png
│   │   └── view-002.png
│   └── annotations.json
│
├── browser/
│   ├── targets.json
│   ├── frames.json
│   ├── dom/
│   ├── css/
│   ├── accessibility/
│   └── performance/
│
├── runtime/
│   ├── console.ndjson
│   ├── exceptions.ndjson
│   ├── actions.ndjson
│   ├── network.ndjson
│   ├── websocket.ndjson
│   └── bodies/
│
├── application/
│   ├── framework.json
│   ├── components.ndjson
│   ├── state.ndjson
│   ├── routes.ndjson
│   ├── feature-flags.json
│   └── provenance.ndjson
│
└── security/
    ├── redaction-report.json
    ├── excluded-data.json
    └── consent-record.json
```

Every file receives:

* SHA-256 hash.
* MIME type.
* Byte count.
* Schema version.
* Capture timestamp.
* Sensitivity classification.
* Redaction status.
* Originating target ID.

# Security model

This is not optional polish. Your product captures highly sensitive browser information.

The Chrome Web Store requires extensions handling user data to publish an accurate privacy policy. This requirement still applies when data is stored only locally. The extension also needs prominent in-product disclosure and affirmative consent before collecting or handling sensitive browsing data. ([Chrome for Developers][5])

Default policy:

* No capture until the user explicitly arms it.
* Persistent recording indicator.
* Domain allowlist.
* Incognito disabled unless separately enabled.
* Authorization, cookies and authentication data excluded by default.
* Password, payment and hidden form fields excluded.
* Response bodies disabled by default outside localhost.
* Private-key and token scanning before export.
* Capture review before writing.
* Local encryption option.
* Seven-day automatic expiration.
* One-click destruction.
* No captured-content telemetry.
* No cloud upload in version 1.
* No human access to captured data.
* No advertising or resale.
* No remote executable code.

Chrome Web Store policy restricts browsing-data collection to the disclosed user-facing purpose and prohibits unrelated use or sale. Manifest V3 also restricts remotely hosted executable code. ([Chrome for Developers][6])

# Required user interface

A polished version needs four surfaces.

## Capture bar

A compact floating bar:

```text
[Select] [Group] [Region] [Arrow] [Box] [Text]
3 selected                     [Add view] [Capture]
```

It must stay out of the screenshot unless the user chooses to include it.

## Side panel

Sections:

1. Capture status.
2. Selected components.
3. Annotations.
4. Runtime evidence.
5. Sensitive-data review.
6. Views.
7. Export.
8. Agent connections.

## Review screen

Before export:

```text
Included
✓ 3 screenshots
✓ 14 DOM nodes
✓ 2 component trees
✓ 37 console events
✓ 18 network requests

Requires review
! 4 response bodies
! 1 possible API key
! 2 email addresses

Excluded automatically
- Authorization headers
- Cookies
- Password fields
- Payment fields
```

## Desktop companion

The desktop app needs:

* Capture library.
* Search.
* Preview.
* Delete and expiry controls.
* MCP status.
* Agent connection instructions.
* Extension connectivity.
* Diagnostic logs.
* Privacy settings.
* Update status.

# Testing required before “finished” is a valid word

The official Chrome guidance recommends both unit and browser-level end-to-end testing, including tests that terminate and restart the extension service worker. ([Chrome for Developers][7])

Minimum release gate:

* 250+ unit tests.
* 60+ browser integration tests.
* Service-worker termination tests.
* Navigation and reload tests.
* Same-origin iframe tests.
* Cross-origin iframe tests.
* Shadow DOM tests.
* React, Vue and Angular fixtures.
* Network request and redirect tests.
* WebSocket tests.
* Secret-redaction tests.
* Capsule corruption tests.
* Native-host disconnect tests.
* Windows installer tests.
* macOS notarization tests.
* Linux package tests.
* Chrome stable and Chrome beta tests.
* 4K and high-DPI screenshot tests.
* Browser zoom tests.
* Keyboard-only accessibility tests.
* Screen-reader review.
* Capsule compatibility tests against supported agents.
* Security review for path traversal and arbitrary-file reads.
* Fuzz tests for native-message parsing.

Required quality targets:

```text
Crash-free capture rate:       > 99.5%
Successful capsule creation:   > 99%
Secret false-negative target:  < 0.1%
Capture UI startup:            < 200 ms
Selection hover response:      < 16 ms
Typical export completion:     < 3 seconds
Idle CPU usage:                approximately 0%
Maximum default capture size:  100 MB
```

# Distribution requirements

A source repository is not a shipped product.

The commercial release needs:

* Chrome Web Store developer account.
* Store listing.
* Privacy policy website.
* Consent disclosure screenshots.
* Store icons and promotional images.
* Signed Chrome package.
* Windows code-signing certificate.
* Signed MSI or MSIX.
* Apple Developer ID.
* Signed and notarized macOS application.
* Linux AppImage, `.deb` and optionally `.rpm`.
* Native Messaging manifests for every browser and operating system.
* Release notes.
* Update signing.
* Rollback mechanism.
* Crash diagnostics with captured content excluded.

Every Chrome Web Store submission undergoes review. Publishing also requires the owner’s developer account, acceptance of the store agreement and its registration requirements. Those externally controlled steps cannot be completed through code alone. ([Chrome for Developers][8])

## The honest conclusion

You are asking for a **commercial desktop-browser developer tool**, not a browser-extension snippet.

The finished product consists of roughly:

```text
Chromium extension          20,000-35,000 lines
Rust desktop companion     15,000-25,000 lines
Framework SDK/adapters     10,000-20,000 lines
Automated tests            15,000-25,000 lines
Install/release tooling     3,000-7,000 lines
Documentation/policies      substantial
```

Those are engineering estimates, not facts from the cited documentation.

A giant answer containing tens of thousands of untested lines would still be a prototype, only a harder-to-debug one. The correct deliverable is a versioned repository with reproducible builds and passing release gates. Signing, notarization and store publishing also require credentials and legal ownership that only you can provide.

So the hard truth is: **I cannot honestly label code generated entirely inside one chat response as a full finished product.** Anyone who says they can is selling you confidence-shaped garbage. The previous implementation should be discarded as production code and treated only as exploration.

[1]: https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle?utm_source=chatgpt.com "The extension service worker lifecycle - Chrome for Developers"
[2]: https://developer.chrome.com/docs/extensions/reference/api/debugger?utm_source=chatgpt.com "chrome.debugger | API - Chrome for Developers"
[3]: https://modelcontextprotocol.io/docs/getting-started/intro?utm_source=chatgpt.com "Model Context Protocol"
[4]: https://developer.chrome.com/docs/extensions/reference/api/runtime?utm_source=chatgpt.com "chrome.runtime | API | Chrome for Developers"
[5]: https://developer.chrome.com/docs/webstore/program-policies/user-data-faq?utm_source=chatgpt.com "Updated Privacy Policy & Secure Handling Requirements"
[6]: https://developer.chrome.com/docs/webstore/program-policies/limited-use?utm_source=chatgpt.com "Limited Use | Chrome Web Store - Program Policies"
[7]: https://developer.chrome.com/docs/extensions/how-to/test/end-to-end-testing?utm_source=chatgpt.com "End-to-end testing for Chrome Extensions  |  Chrome for Developers"
[8]: https://developer.chrome.com/docs/webstore/review-process?authuser=1&hl=en&utm_source=chatgpt.com "Chrome Web Store review process  |  Chrome Extensions  |  Chrome for Developers"
