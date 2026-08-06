import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

import { installChromeMock } from "./helpers/chrome-mock.js";

/*
 * The defect these tests exist for: capture state used to live in a
 * module-level Map inside the service worker. Chrome can terminate that worker
 * after ~30 seconds of inactivity, silently discarding every console message,
 * network request and response body collected so far — while the export still
 * "succeeds" with less evidence than the user believes it has.
 *
 * "Restarting the worker" here means resetting the module registry while the
 * backing storage object survives, which is what Chrome actually does.
 */

let storage;

async function loadStore() {
  vi.resetModules();

  installChromeMock({ storage });

  return import("../extension/session-store.js");
}

beforeEach(() => {
  storage = {};
});

describe("persistence across service-worker termination", () => {
  it("keeps events, requests and bodies after a restart", async () => {
    let store = await loadStore();

    const session = store.createSession(7);

    session.armed = true;
    session.attached = true;

    store.pushEvent(session, {
      category: "console",
      level: "error",
      timeMs: Date.now(),
      text: "boom"
    });

    store.entrySet(
      session.requests,
      "req-1",
      { requestId: "req-1", timeMs: Date.now() },
      300
    );

    store.entrySet(
      session.responseBodies,
      "req-1",
      { body: '{"plans":[]}' },
      120
    );

    await store.putSession(session);

    /* --- Chrome terminates the worker here. --- */
    store = await loadStore();

    const revived = await store.loadSession(7);

    expect(revived).not.toBeNull();
    expect(revived.armed).toBe(true);
    expect(revived.events).toHaveLength(1);
    expect(revived.events[0].text).toBe("boom");
    expect(store.entryGet(revived.requests, "req-1")).toBeTruthy();
    expect(
      store.entryGet(revived.responseBodies, "req-1").body
    ).toContain("plans");
  });

  it("returns null for a tab that was never armed", async () => {
    const store = await loadStore();

    expect(await store.loadSession(999)).toBeNull();
  });

  it("drops sessions written by an older schema", async () => {
    storage["cc.session.3"] = {
      schemaVersion: 1,
      tabId: 3,
      events: []
    };

    const store = await loadStore();

    /* A stale shape must not be revived into new code paths. */
    expect(await store.loadSession(3)).toBeNull();
  });

  it("deleteSession clears storage, not just the cache", async () => {
    let store = await loadStore();

    await store.putSession(store.createSession(4));
    await store.deleteSession(4);

    store = await loadStore();

    expect(await store.loadSession(4)).toBeNull();
  });

  it("touch() coalesces bursts into a single write", async () => {
    const store = await loadStore();

    const session = store.createSession(5);

    await store.putSession(session);

    const spy = vi.spyOn(chrome.storage.session, "set");

    for (let i = 0; i < 50; i++) {
      store.pushEvent(session, {
        category: "console",
        timeMs: Date.now(),
        text: `line ${i}`
      });

      store.touch(5);
    }

    expect(spy).not.toHaveBeenCalled();

    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(spy).toHaveBeenCalledTimes(1);

    const revived = await (await loadStore()).loadSession(5);

    expect(revived.events).toHaveLength(50);
  });

  it("flushAll persists every armed tab", async () => {
    let store = await loadStore();

    for (const tabId of [11, 12, 13]) {
      const session = store.createSession(tabId);

      session.armed = true;

      store.pushEvent(session, {
        category: "console",
        timeMs: Date.now(),
        text: `tab ${tabId}`
      });

      /* Cache only — no explicit put. */
      await store.putSession(session);
    }

    await store.flushAll();

    store = await loadStore();

    expect(await store.listSessions()).toHaveLength(3);
  });
});

describe("bounded collections", () => {
  it("caps events at the limit, keeping the newest", async () => {
    const store = await loadStore();

    const session = store.createSession(1);

    for (let i = 0; i < store.LIMITS.events + 120; i++) {
      store.pushEvent(session, {
        category: "console",
        timeMs: Date.now(),
        text: `line ${i}`
      });
    }

    expect(session.events).toHaveLength(store.LIMITS.events);

    expect(session.events.at(-1).text).toBe(
      `line ${store.LIMITS.events + 119}`
    );
  });

  it("assigns a monotonic sequence across event kinds", async () => {
    const store = await loadStore();

    const session = store.createSession(1);

    store.pushEvent(session, { category: "console", timeMs: 1 });
    store.pushNavigation(session, { url: "/a", timeMs: 2 });
    store.pushEvent(session, { category: "log", timeMs: 3 });

    expect(session.events[0].sequence).toBe(1);
    expect(session.navigations[0].sequence).toBe(2);
    expect(session.events[1].sequence).toBe(3);
  });

  it("entrySet updates in place instead of duplicating", async () => {
    const store = await loadStore();

    const entries = [];

    store.entrySet(entries, "a", { n: 1 }, 10);
    store.entrySet(entries, "a", { n: 2 }, 10);

    expect(entries).toHaveLength(1);
    expect(store.entryGet(entries, "a").n).toBe(2);
  });

  it("entrySet evicts oldest past the cap", async () => {
    const store = await loadStore();

    const entries = [];

    for (let i = 0; i < 12; i++) {
      store.entrySet(entries, `k${i}`, { i }, 10);
    }

    expect(entries).toHaveLength(10);
    expect(store.entryGet(entries, "k0")).toBeUndefined();
    expect(store.entryGet(entries, "k11").i).toBe(11);
  });
});

describe("storage quota discipline", () => {
  /*
   * The count caps allow 120 response bodies at 1 MB each, which is an order of
   * magnitude past the 10 MB chrome.storage.session quota. Exceeding it makes
   * set() reject and loses the entire session write while capture continues.
   */
  function fillWithBodies(store, session, count, kb) {
    for (let i = 0; i < count; i++) {
      store.entrySet(
        session.responseBodies,
        `req-${i}`,
        { body: "x".repeat(kb * 1024) },
        store.LIMITS.responseBodies
      );
    }
  }

  it("evicts oldest bodies until the session fits its budget", async () => {
    const store = await loadStore();

    const session = store.createSession(1);

    fillWithBodies(store, session, 100, 100);

    const before = session.responseBodies.length;

    const result = store.trimToBudget(session);

    expect(result.trimmed).toBe(true);
    expect(result.bytes).toBeLessThanOrEqual(store.LIMITS.sessionBytes);
    expect(session.responseBodies.length).toBeLessThan(before);

    /* Oldest-first: whatever survived must be the newest entries. */
    expect(store.entryGet(session.responseBodies, "req-99")).toBeDefined();
    expect(store.entryGet(session.responseBodies, "req-0")).toBeUndefined();
  });

  it("leaves a session under budget untouched", async () => {
    const store = await loadStore();

    const session = store.createSession(1);

    fillWithBodies(store, session, 3, 10);

    const result = store.trimToBudget(session);

    expect(result.trimmed).toBe(false);
    expect(session.responseBodies).toHaveLength(3);
    expect(session.quotaDropped).toBeUndefined();
  });

  it("flushes an oversized session instead of losing the write", async () => {
    const store = await loadStore();

    const session = store.createSession(4);

    fillWithBodies(store, session, 100, 100);

    await store.putSession(session);

    const stored = storage["cc.session.4"];

    expect(stored).toBeDefined();
    expect(stored.responseBodies.length).toBeGreaterThan(0);
    expect(JSON.stringify(stored).length).toBeLessThanOrEqual(
      store.LIMITS.sessionBytes
    );
  });

  it("declares the dropped evidence to the agent", async () => {
    const store = await loadStore();

    const session = store.createSession(1);

    fillWithBodies(store, session, 100, 100);
    store.trimToBudget(session);

    const evidence = store.windowedEvidence(session);

    expect(evidence.captureWindow.truncated.storageQuota).toBe(true);
    expect(
      evidence.captureWindow.quotaDropped.responseBodies
    ).toBeGreaterThan(0);
  });
});

describe("windowedEvidence", () => {
  it("keeps only the rolling window and joins bodies", async () => {
    const store = await loadStore();

    const session = store.createSession(1);

    const now = 1_000_000_000_000;

    store.pushEvent(session, {
      category: "console",
      timeMs: now - 5_000,
      text: "recent"
    });

    store.pushEvent(session, {
      category: "console",
      timeMs: now - 120_000,
      text: "ancient"
    });

    store.entrySet(
      session.requests,
      "r1",
      { requestId: "r1", timeMs: now - 2_000 },
      300
    );

    store.entrySet(
      session.requests,
      "r2",
      { requestId: "r2", timeMs: now - 300_000 },
      300
    );

    store.entrySet(
      session.responseBodies,
      "r1",
      { body: "{}" },
      120
    );

    const evidence = store.windowedEvidence(session, now);

    expect(evidence.events.map((e) => e.text)).toEqual(["recent"]);
    expect(evidence.requests).toHaveLength(1);
    expect(evidence.requests[0].responseBody).toEqual({ body: "{}" });
  });

  it("states plainly that pre-arm history was never recorded", async () => {
    const store = await loadStore();

    const evidence = store.windowedEvidence(
      store.createSession(1)
    );

    expect(evidence.captureWindow.note).toMatch(/armed/i);
  });

  it("flags truncation so an agent does not read absence as proof", async () => {
    const store = await loadStore();

    const session = store.createSession(1);

    for (let i = 0; i < store.LIMITS.events; i++) {
      store.pushEvent(session, {
        category: "console",
        timeMs: Date.now(),
        text: "x"
      });
    }

    const evidence = store.windowedEvidence(session);

    expect(evidence.captureWindow.truncated.events).toBe(true);
    expect(evidence.captureWindow.truncated.requests).toBe(false);
  });
});
