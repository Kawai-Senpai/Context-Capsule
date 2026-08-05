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
