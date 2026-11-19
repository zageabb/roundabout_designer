#!/usr/bin/env python3
"""Fail-closed UDA public asset staging; run only in disposable build checkout."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
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
