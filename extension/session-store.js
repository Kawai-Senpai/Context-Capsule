/*
 * Durable capture sessions.
 *
 * Chrome can terminate an extension service worker after roughly 30 seconds of
 * inactivity, taking every global variable with it. A capture session held only
 * in a module-level Map therefore loses console events, network requests and
 * response bodies silently — the worst possible failure for an evidence tool,
 * because the export still succeeds and just contains less than it should.
 *
 * So sessions live in `chrome.storage.session`: in-memory from the page's point
 * of view, but owned by the browser rather than by our worker instance. We keep
 * a write-through cache for speed and flush on a short debounce, plus an
 * immediate flush at every point where losing data would be visible.
 *
 * Maps are stored as entry arrays because structured clone in storage.session
 * does not preserve Map ordering guarantees across versions.
 */

const KEY_PREFIX = "cc.session.";

const FLUSH_DEBOUNCE_MS = 300;

/** In-flight cache: tabId -> session object. */
const cache = new Map();

/** tabId -> pending flush timer. */
const timers = new Map();

/** tabId -> promise of the current write, so flushes serialise. */
const writes = new Map();

function keyFor(tabId) {
  return `${KEY_PREFIX}${tabId}`;
}

export function createSession(tabId) {
  return {
    schemaVersion: 2,
    tabId,
    captureId: null,
    armed: false,
    attached: false,
    startedAt: Date.now(),
    /* Monotonic ordering. CDP domains do not share a time base. */
    sequence: 0,
    events: [],
    /* Serialised Maps. */
    requests: [],
    responseBodies: [],
    targets: [],
    navigations: [],
    detachReason: null,
    lastFlushedAt: null
  };
}

function reviveSession(raw) {
  if (!raw || raw.schemaVersion !== 2) {
    return null;
  }

  return raw;
}

/**
 * Read a session, preferring the cache and falling back to storage after a
 * worker restart.
 */
export async function loadSession(tabId) {
  if (cache.has(tabId)) {
    return cache.get(tabId);
  }

  const key = keyFor(tabId);

  const stored = await chrome.storage.session.get(key);

  const session = reviveSession(stored?.[key]);

  if (session) {
    cache.set(tabId, session);
  }

  return session || null;
}

export async function putSession(session) {
  cache.set(session.tabId, session);

  return flush(session.tabId);
}

export async function deleteSession(tabId) {
  cache.delete(tabId);

  const timer = timers.get(tabId);

  if (timer) {
    clearTimeout(timer);
    timers.delete(tabId);
  }

  await chrome.storage.session.remove(keyFor(tabId));
}

/**
 * Mark a session dirty. Cheap: coalesces bursts of CDP events into one write.
 */
export function touch(tabId) {
  if (timers.has(tabId)) {
    return;
  }

  const timer = setTimeout(() => {
    timers.delete(tabId);
    void flush(tabId);
  }, FLUSH_DEBOUNCE_MS);

  timers.set(tabId, timer);
}

/**
 * Write a session to storage now. Awaited at every point where a loss would be
 * user-visible: capture, navigation, detach, stop, worker suspend.
 */
export async function flush(tabId) {
  const timer = timers.get(tabId);

  if (timer) {
    clearTimeout(timer);
    timers.delete(tabId);
  }

  const session = cache.get(tabId);

  if (!session) {
    return null;
  }

  const previous = writes.get(tabId) || Promise.resolve();

  const write = previous
    .catch(() => {})
    .then(async () => {
      session.lastFlushedAt = Date.now();

      await chrome.storage.session.set({
        [keyFor(tabId)]: session
      });

      return session;
    });

  writes.set(tabId, write);

  return write;
}

export async function flushAll() {
  await Promise.all(
    Array.from(cache.keys()).map((tabId) => flush(tabId))
  );
}

export async function listSessions() {
  const all = await chrome.storage.session.get(null);

  return Object.entries(all)
    .filter(([key]) => key.startsWith(KEY_PREFIX))
    .map(([, value]) => reviveSession(value))
    .filter(Boolean);
}

/*
 * ---------------------------------------------------------------------------
 * Bounded collections
 *
 * A capture is a rolling window, not an archive. Every collection is capped so
 * that a long-armed session on a chatty application cannot grow without bound
 * and blow the storage quota.
 * ---------------------------------------------------------------------------
 */

export const LIMITS = {
  events: 800,
  requests: 300,
  responseBodies: 120,
  navigations: 40,
  windowMs: 60_000
};

export function nextSequence(session) {
  session.sequence += 1;

  return session.sequence;
}

export function pushEvent(session, event) {
  session.events.push({
    ...event,
    sequence: nextSequence(session)
  });

  if (session.events.length > LIMITS.events) {
    session.events.splice(
      0,
      session.events.length - LIMITS.events
    );
  }
}

export function pushNavigation(session, navigation) {
  session.navigations.push({
    ...navigation,
    sequence: nextSequence(session)
  });

  if (session.navigations.length > LIMITS.navigations) {
    session.navigations.splice(
      0,
      session.navigations.length - LIMITS.navigations
    );
  }
}

/*
 * Entry-array helpers. These keep the "map" semantics the capture code wants
 * while staying trivially serialisable.
 */

export function entryGet(entries, id) {
  const found = entries.find((entry) => entry[0] === id);

  return found ? found[1] : undefined;
}

export function entrySet(entries, id, value, max) {
  const index = entries.findIndex(
    (entry) => entry[0] === id
  );

  if (index >= 0) {
    entries[index][1] = value;
  } else {
    entries.push([id, value]);
  }

  if (typeof max === "number" && entries.length > max) {
    entries.splice(0, entries.length - max);
  }

  return value;
}

export function entryValues(entries) {
  return entries.map((entry) => entry[1]);
}

/**
 * Freeze the evidence window around a capture.
 */
export function windowedEvidence(session, now = Date.now()) {
  const cutoff = now - LIMITS.windowMs;

  const requests = entryValues(session.requests)
    .filter((request) => request.timeMs >= cutoff)
    .map((request) => ({
      ...request,
      responseBody:
        entryGet(session.responseBodies, request.requestId) ||
        null
    }));

  return {
    captureWindow: {
      armedAt: new Date(session.startedAt).toISOString(),
      capturedAt: new Date(now).toISOString(),
      windowMs: LIMITS.windowMs,
      /*
       * Stated plainly so an agent never assumes the buffer covers time before
       * the user armed the capture.
       */
      note:
        "Runtime evidence starts when capture was armed. " +
        "Anything earlier was not recorded.",
      truncated: {
        events:
          session.events.length >= LIMITS.events,
        requests:
          session.requests.length >= LIMITS.requests,
        responseBodies:
          session.responseBodies.length >=
          LIMITS.responseBodies
      }
    },

    navigations: session.navigations,

    events: session.events.filter(
      (event) => event.timeMs >= cutoff
    ),

    requests
  };
}
