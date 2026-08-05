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
