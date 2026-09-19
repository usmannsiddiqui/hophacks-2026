"""Explicit, conflict-checked export of shared context; never scans private vault notes."""
import argparse
import hashlib
import json
import os
from pathlib import Path


class SyncConflict(Exception):
    pass


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else None


def sync(repo, vault, files, direction):
    state_file = repo / ".context-sync-state.json"
    state = json.loads(state_file.read_text()) if state_file.exists() else {}
    planned, errors = [], []
    for relative in files:
        if Path(relative).is_absolute() or ".." in Path(relative).parts:
            raise SyncConflict("Only repository-relative shared paths are allowed")
        local, canonical = repo / relative, vault / relative
        left, right = digest(local), digest(canonical)
        baseline = state.get(relative)
        if left is None:
            errors.append(f"{relative}: repository copy is missing; restore it before syncing")
            continue
        if direction == "init":
            if right is not None and right != left:
                errors.append(f"{relative}: vault copy already differs; reconcile manually")
            elif right is None:
                planned.append((local, canonical))
        elif direction == "check":
            if left != right:
                errors.append(f"{relative}: copies differ; import teammate edits or export vault edits")
        elif right is None or baseline is None:
            errors.append(f"{relative}: missing vault copy or baseline; run init first")
        elif left != right:
            if direction == "export" and left == baseline:
                planned.append((canonical, local))
            elif direction == "import" and right == baseline:
                planned.append((local, canonical))
            else:
                errors.append(f"{relative}: target changed since last sync; reconcile both versions manually")
    if errors:
        raise SyncConflict("\n".join(errors))
    if direction == "check":
        return 0
    # Preflight every path before writing any destination. Never delete either copy.
    for source, target in planned:
        target.parent.mkdir(parents=True, exist_ok=True)
        temporary = target.with_name(target.name + ".context-sync-tmp")
        temporary.write_bytes(source.read_bytes())
        temporary.replace(target)
    state.update({relative: digest(repo / relative) for relative in files})
    state_file.write_text(json.dumps(state, indent=2) + "\n")
    return len(planned)


def main():
    repo = Path(__file__).resolve().parents[1]
    config_file = repo / ".context-sync.local.json"
    local_config = json.loads(config_file.read_text()) if config_file.exists() else {}
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("direction", choices=["init", "check", "export", "import"])
    parser.add_argument("--vault", default=os.environ.get("MASHWARA_CONTEXT_VAULT") or local_config.get("vault"))
    args = parser.parse_args()
    if not args.vault:
        parser.error("Set MASHWARA_CONTEXT_VAULT or pass --vault /path/to/Hophacks/team-context")
    files = json.loads((repo / "context-files.json").read_text())
    try:
        count = sync(repo, Path(args.vault).expanduser().resolve(), files, args.direction)
        print(f"Context {args.direction}: {len(files)} files checked, {count} copied.")
    except (SyncConflict, OSError, ValueError) as error:
        parser.exit(1, f"Context sync stopped. No conflicts are overwritten.\n{error}\n")


if __name__ == "__main__":
    main()
