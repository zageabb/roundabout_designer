#!/usr/bin/env bash
set -euo pipefail
# LOCAL_UBUNTU_PROXY_COMPAT: loopback-only service; Caddy / UDA handles authentication.
: "${PORT:?Specify PORT from your Ubuntu deployment registry}"
cd "$(dirname "$0")/.."
exec python3 -m http.server "$PORT" --bind 127.0.0.1
