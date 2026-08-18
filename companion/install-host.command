#!/bin/sh
# macOS double-click wrapper.
#
# Finder runs a .command file in Terminal but will not run a .sh, so this exists
# purely so the install is clickable. The actual work - and the Linux path - is
# in install-host.sh, which this does not duplicate.

cd "$(dirname "$0")"
./install-host.sh "${1:-}"

echo "Press return to close this window."
read -r _
