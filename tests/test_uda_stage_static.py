"""Offline tests of UDA static publication staging; no network or production IO."""
from __future__ import annotations

import importlib.util
from pathlib import Path
import tempfile
import unittest

MODULE = Path(__file__).resolve().parents[1] / "tools" / "uda_stage_static.py"


class StagingTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="uda-stage-test-")
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        spec = importlib.util.spec_from_file_location("uda_stage_static_under_test", MODULE)
        self.stage_module = importlib.util.module_from_spec(spec)
        assert spec and spec.loader
        spec.loader.exec_module(self.stage_module)
        self.stage_module.ROOT = self.root
        self.stage_module.OUTPUT = self.root / "build" / "uda-public"

    def populate(self):
        for relative in self.stage_module.ALLOWLIST:
            path = self.root / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(b"public-fixture")

    def test_stages_only_exact_allowlist(self):
        self.populate()
        (self.root / ".env").write_text("DO_NOT_PUBLISH")
        (self.root / "AGENTS.md").write_text("DO_NOT_PUBLISH")
        record = self.stage_module.stage()
        output = self.stage_module.OUTPUT
        self.assertEqual(record["count"], len(self.stage_module.ALLOWLIST))
        self.assertEqual(
            {p.relative_to(output).as_posix() for p in output.rglob("*") if p.is_file()},
            set(self.stage_module.ALLOWLIST))
        self.assertFalse((output / ".env").exists())
        self.assertFalse((output / "AGENTS.md").exists())

    def test_missing_file_blocks_staging_before_any_output(self):
        self.populate()
        (self.root / self.stage_module.ALLOWLIST[-1]).unlink()
        with self.assertRaises(RuntimeError):
            self.stage_module.stage()
        self.assertFalse(self.stage_module.OUTPUT.exists())

    def test_existing_output_refuses_overwrite(self):
        self.populate()
        self.stage_module.OUTPUT.mkdir(parents=True)
        marker = self.stage_module.OUTPUT / "keep.txt"
        marker.write_text("unchanged")
        with self.assertRaises(RuntimeError):
            self.stage_module.stage()
        self.assertEqual(marker.read_text(), "unchanged")

    def test_symlink_asset_is_rejected(self):
        self.populate()
        target = self.root / self.stage_module.ALLOWLIST[0]
        target.unlink()
        target.symlink_to(self.root / self.stage_module.ALLOWLIST[-1])
        with self.assertRaises(RuntimeError):
            self.stage_module.stage()
        self.assertFalse(self.stage_module.OUTPUT.exists())


if __name__ == "__main__":
    unittest.main()
