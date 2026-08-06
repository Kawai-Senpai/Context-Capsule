/*
 * Minimal chrome API stand-in.
 *
 * `storage.session` is backed by a plain object that survives module resets,
 * which is exactly what lets us simulate Chrome terminating the extension
 * service worker: reset the modules, keep the storage.
 */

export function installChromeMock({ storage = {}, local = {} } = {}) {
  const listeners = new Map();

  const on = (name) => ({
    addListener: (fn) => {
      listeners.set(name, [...(listeners.get(name) || []), fn]);
    }
  });

  const chrome = {
    __storage: storage,
    __listeners: listeners,

    __emit(name, ...args) {
      for (const fn of listeners.get(name) || []) {
        fn(...args);
      }
    },

    storage: {
      session: {
        async get(key) {
          if (key === null || key === undefined) {
            return { ...storage };
          }

          const keys = Array.isArray(key) ? key : [key];

          return Object.fromEntries(
            keys
              .filter((k) => k in storage)
              /* Deep clone: storage must not alias caller objects. */
              .map((k) => [k, structuredClone(storage[k])])
          );
        },

        async set(items) {
          for (const [k, v] of Object.entries(items)) {
            storage[k] = structuredClone(v);
          }
        },

        async remove(key) {
          for (const k of Array.isArray(key) ? key : [key]) {
            delete storage[k];
          }
        }
      },

      /*
       * Preferences (auto-arm) live in storage.local so they outlast the
       * browser session that storage.session is scoped to.
       */
      local: {
        async get(key) {
          if (key === null || key === undefined) {
            return { ...local };
          }

          const keys = Array.isArray(key) ? key : [key];

          return Object.fromEntries(
            keys
              .filter((k) => k in local)
              .map((k) => [k, structuredClone(local[k])])
          );
        },

        async set(items) {
          for (const [k, v] of Object.entries(items)) {
            local[k] = structuredClone(v);
          }
        },

        async remove(key) {
          for (const k of Array.isArray(key) ? key : [key]) {
            delete local[k];
          }
        }
      }
    },

    runtime: {
      onInstalled: on("onInstalled"),
      onConnect: on("onConnect"),
      onMessage: on("onMessage"),
      onSuspend: on("onSuspend"),
      sendMessage: async () => {},
      lastError: null
    },

    debugger: {
      onEvent: on("debugger.onEvent"),
      onDetach: on("debugger.onDetach"),
      attach: async () => {},
      detach: async () => {},
      sendCommand: async () => ({})
    },

    tabs: {
      onUpdated: on("tabs.onUpdated"),
      onRemoved: on("tabs.onRemoved"),
      onActivated: on("tabs.onActivated"),
      query: async () => [
        { id: 1, windowId: 1, title: "Test", url: "http://localhost/" }
      ],
      get: async (tabId) => ({
        id: tabId,
        windowId: 1,
        title: "Test",
        url: "http://localhost/"
      }),
      sendMessage: async () => ({ ok: true }),
      captureVisibleTab: async () =>
        "data:image/png;base64,iVBORw0KGgo="
    },

    windows: {
      WINDOW_ID_NONE: -1,
      onFocusChanged: on("windows.onFocusChanged")
    },

    scripting: {
      executeScript: async () => [{ result: {} }]
    },

    sidePanel: {
      setPanelBehavior: async () => {}
    }
  };

  globalThis.chrome = chrome;

  return chrome;
}
