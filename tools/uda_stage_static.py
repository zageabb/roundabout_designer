#!/usr/bin/env python3
"""Fail-closed UDA public asset staging; run only in disposable build checkout."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit
import stat
import sys

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "build" / "uda-public"
ALLOWLIST = (
    "index.html",
    "src/styles.css",
    "src/state.js",
    "src/lane-network.js",
    "src/exit-lane-rules.js",
    "src/marked-exit-geometry.js",
    "src/lane-changes.js",
    "src/conflict-engine.js",
    "src/conflict-zones.js",
    "src/conflict-projection.js",
    "src/priority-rules.js",
    "src/simulation.js",
    "src/controls.js",
    "src/geometry.js",
    "src/render.js",
    "src/bootstrap.js"
)

class _HTMLAssets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths = set()

    def handle_starttag(self, tag, attrs):
        keys = {"script": "src", "link": "href", "img": "src", "source": "src"}
        key = keys.get(tag)
        if not key:
            return
        for name, raw in attrs:
            if name != key or not raw:
                continue
            parsed = urlsplit(raw)
            if parsed.scheme or parsed.netloc or raw.startswith(("/", "#", "data:")):
                continue
            rel = parsed.path.removeprefix("./")
            if rel:
                self.paths.add(rel)


def stage() -> dict:
    # Never remove an existing output tree or mutate repository source.
    if OUTPUT.exists() or OUTPUT.is_symlink():
        raise RuntimeError("Existing output rejected: use a fresh checkout or inspect/remove manually")
    if (ROOT / "build").is_symlink():
        raise RuntimeError("Build parent must not be a symlink")
    expected = set(ALLOWLIST)
    if not expected or len(expected) != len(ALLOWLIST) or "index.html" not in expected:
        raise RuntimeError("Invalid public asset allowlist")
    for rel in expected:
        p = Path(rel)
        if p.is_absolute() or ".." in p.parts or p.parts[0].startswith("."):
            raise RuntimeError(f"Unsafe allowed path: {rel}")
    parser = _HTMLAssets()
    parser.feed((ROOT / "index.html").read_text(encoding="utf-8"))
    missing_refs = parser.paths - expected
    if missing_refs:
        raise RuntimeError("HTML refers to unpublished local assets: " + ", ".join(sorted(missing_refs)))
    # Preflight every file before creating output.
    validated = []
    for rel in ALLOWLIST:
        source = ROOT / rel
        if not source.is_file() or source.is_symlink():
            raise RuntimeError(f"Missing or symlink public asset: {rel}")
        if any((ROOT / Path(*Path(rel).parts[:i])).is_symlink()
               for i in range(1, len(Path(rel).parts))):
            raise RuntimeError(f"Symlink parent rejected: {rel}")
        mode = source.stat().st_mode
        if not stat.S_ISREG(mode) or source.stat().st_size > 20 * 1024 * 1024:
            raise RuntimeError(f"Nonregular or oversized asset: {rel}")
        validated.append((rel, source.read_bytes()))
    OUTPUT.mkdir(parents=True, exist_ok=False)
    evidence = []
    for rel, content in validated:
        target = OUTPUT / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
        target.chmod(0o644)
        evidence.append({"path": rel, "bytes": len(content), "sha256": hashlib.sha256(content).hexdigest()})
    result = {"output_dir": "build/uda-public", "files": evidence, "count": len(evidence)}
    # Evidence deliberately OUTSIDE published directory.
    print(json.dumps(result, sort_keys=True))
    return result

if __name__ == "__main__":
    try:
        stage()
    except (OSError, RuntimeError) as exc:
        print(f"UDA static staging refused: {exc}", file=sys.stderr)
        raise SystemExit(2)
