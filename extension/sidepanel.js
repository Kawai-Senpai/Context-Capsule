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
