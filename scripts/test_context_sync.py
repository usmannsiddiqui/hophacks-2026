import importlib.util
import pathlib
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("context_sync", pathlib.Path(__file__).with_name("context_sync.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ContextSyncTests(unittest.TestCase):
    def test_exports_vault_edits_without_touching_unlisted_notes(self):
        with tempfile.TemporaryDirectory() as root:
            repo, vault = pathlib.Path(root) / "repo", pathlib.Path(root) / "vault"
            repo.mkdir(); vault.mkdir()
            (repo / "CONTEXT.md").write_text("original")
            (vault / "private.md").write_text("private strategy")
            module.sync(repo, vault, ["CONTEXT.md"], "init")
            (vault / "CONTEXT.md").write_text("new term")
            module.sync(repo, vault, ["CONTEXT.md"], "export")
            self.assertEqual((repo / "CONTEXT.md").read_text(), "new term")
            self.assertFalse((repo / "private.md").exists())

    def test_conflict_does_not_overwrite_either_side(self):
        with tempfile.TemporaryDirectory() as root:
            repo, vault = pathlib.Path(root) / "repo", pathlib.Path(root) / "vault"
            repo.mkdir(); vault.mkdir()
            (repo / "CONTEXT.md").write_text("original")
            module.sync(repo, vault, ["CONTEXT.md"], "init")
            (repo / "CONTEXT.md").write_text("teammate change")
            (vault / "CONTEXT.md").write_text("owner change")
            with self.assertRaises(module.SyncConflict):
                module.sync(repo, vault, ["CONTEXT.md"], "export")
            self.assertEqual((repo / "CONTEXT.md").read_text(), "teammate change")
            self.assertEqual((vault / "CONTEXT.md").read_text(), "owner change")

    def test_imports_teammate_edits_and_check_catches_drift(self):
        with tempfile.TemporaryDirectory() as root:
            repo, vault = pathlib.Path(root) / "repo", pathlib.Path(root) / "vault"
            repo.mkdir(); vault.mkdir()
            (repo / "CONTEXT.md").write_text("original")
            module.sync(repo, vault, ["CONTEXT.md"], "init")
            (repo / "CONTEXT.md").write_text("teammate change")
            with self.assertRaises(module.SyncConflict):
                module.sync(repo, vault, ["CONTEXT.md"], "check")
            module.sync(repo, vault, ["CONTEXT.md"], "import")
            self.assertEqual((vault / "CONTEXT.md").read_text(), "teammate change")


if __name__ == "__main__":
    unittest.main()
