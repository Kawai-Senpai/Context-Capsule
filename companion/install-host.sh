#!/bin/sh
# Register the Context Capsule companion host with Chrome.
#
# Fixes the side panel's "The companion host is not registered" error. Works on
# both macOS and Linux: install-host.mjs writes the manifest to the right
# NativeMessagingHosts directory for the platform it is running on.
#
# The extension id is derived from the signing key in extension/manifest.json,
# so you do not need to copy it out of chrome://extensions - but you can still
# pass one as the first argument if you build with a different key.
#
#   ./install-host.sh
#   ./install-host.sh abcdefghijklmnopabcdefghijklmnop

set -eu

if ! command -v node >/dev/null 2>&1; then
  echo
  echo "Node.js was not found on PATH. Install Node 20 or newer, then re-run this."
  echo "  https://nodejs.org"
  echo
  exit 1
fi

cd "$(dirname "$0")"

node install-host.mjs "${1:-}"

echo
case "$(uname -s)" in
  Darwin)
    echo "Done. Now quit Chrome completely (Cmd-Q, not just closing the window)"
    echo "then start it again. Chrome only reads this registration at startup."
    ;;
  *)
    echo "Done. Now quit Chrome completely - every window - then start it again."
    echo "Chrome only reads this registration at startup."
    ;;
esac
echo
