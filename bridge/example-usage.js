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
