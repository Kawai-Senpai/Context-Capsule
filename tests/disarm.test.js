import { beforeEach, describe, expect, it, vi } from "vitest";

import { installChromeMock } from "./helpers/chrome-mock.js";

/*
 * Closing the side panel has to disarm every tab.
 *
 * The overlay installs capture-phase listeners that call preventDefault() and
 * stopImmediatePropagation() on click, so an armed tab with no panel is a page
 * that silently eats every click with no visible cause and no control left to
 * switch it off. These tests drive the real worker against the chrome mock.
 */

let chrome;
let background;

/** Open a panel port and hand back the port plus a close() that disconnects. */
function openPanel() {
  const disconnectListeners = [];

  const port = {
    name: "context-capsule-panel",
    postMessage: () => {},
    onMessage: { addListener: () => {} },

    onDisconnect: {
      addListener: (fn) => disconnectListeners.push(fn)
    }
  };

  chrome.__emit("onConnect", port);

  return {
    port,
    close: () => disconnectListeners.forEach((fn) => fn())
  };
}

/** Let the worker's floating promises settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

/*
 * Build the fixture through the store rather than hand-writing the record, so
 * it always carries the current schema version instead of being silently
 * discarded by reviveSession().
 */
async function armSession(tabId) {
  const store = await import("../extension/session-store.js");

  const session = store.createSession(tabId);

  session.armed = true;
  session.attached = true;

  await store.putSession(session);
}

beforeEach(async () => {
  chrome = installChromeMock();

  chrome.__sent = [];
  chrome.__detached = [];

  chrome.tabs.sendMessage = async (tabId, message) => {
    chrome.__sent.push({ tabId, type: message.type });

    return { ok: true };
  };

  chrome.debugger.detach = async ({ tabId }) => {
    chrome.__detached.push(tabId);
  };

  /* Fresh module registry so listeners are not stacked across tests. */
  vi.resetModules();

  background = await import("../extension/background.js");
});

describe("closing the panel disarms capture", () => {
  it("stops the overlay and detaches the debugger on every armed tab", async () => {
    const panel = openPanel();

    /* An armed, attached session, as armTab() would have left it. */
    await armSession(1);

    panel.close();

    await settle();

    expect(
      chrome.__sent.filter((entry) => entry.type === "CC_STOP")
    ).toEqual([{ tabId: 1, type: "CC_STOP" }]);

    expect(chrome.__detached).toEqual([1]);

    expect(chrome.__storage["cc.session.1"]).toBeUndefined();
  });

  it("keeps capture armed while another panel is still open", async () => {
    const first = openPanel();

    openPanel();

    await armSession(1);

    first.close();

    await settle();

    expect(
      chrome.__sent.some((entry) => entry.type === "CC_STOP")
    ).toBe(false);

    expect(chrome.__storage["cc.session.1"]).toBeDefined();
  });

  it("does not auto-arm a tab while the panel is closed", async () => {
    chrome.__emit("tabs.onActivated", { tabId: 1 });

    await settle();

    expect(
      chrome.__sent.some((entry) => entry.type === "CC_START")
    ).toBe(false);
  });

  it("auto-arms on tab switch once a panel is open", async () => {
    openPanel();

    chrome.__emit("tabs.onActivated", { tabId: 1 });

    await settle();

    expect(
      chrome.__sent.some((entry) => entry.type === "CC_START")
    ).toBe(true);
  });
});
