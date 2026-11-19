#!/usr/bin/env bash
set -euo pipefail
# LOCAL_UBUNTU_PROXY_COMPAT: loopback-only service; Caddy / UDA handles authentication.
# V2 safety: never serve the repository root, containing source and deployment files.
: "${PORT:?Specify PORT from your Ubuntu deployment registry}"
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
public_root="$repo_root/build/uda-public"
if [[ ! -f "$public_root/index.html" || -L "$public_root" ]]; then
  echo "Refusing to serve: allowlisted public artifact has not been staged" >&2
  exit 2
fi
cd "$public_root"
exec python3 -m http.server "$PORT" --bind 127.0.0.1
