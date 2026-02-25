#!/usr/bin/env python3
"""
Switch extension API config between dev (localhost) and prod in one go.
Run from this directory: python set_env.py
"""
import os
import re

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
EXTENSION_DIR = os.path.join(SCRIPT_DIR, "extension")

# Files that contain IS_DEV. (path, pattern for var, pattern for const for background.js)
CONFIG_FILES = [
    (os.path.join(EXTENSION_DIR, "Intent Based Profile Scoring System", "config.js"), "var", None),
    (os.path.join(EXTENSION_DIR, "Intent Based Profile Scoring System", "background.js"), None, "const"),
    (os.path.join(EXTENSION_DIR, "reactedProspectExtractor", "config.js"), "var", None),
    (os.path.join(EXTENSION_DIR, "commentProspectExtractor", "config.js"), "var", None),
]


def set_is_dev(filepath: str, is_dev: bool, var_kind: str | None, const_kind: str | None) -> None:
    """Set IS_DEV to True or False in file. Use var_kind for config.js, const_kind for background.js."""
    with open(filepath, "r") as f:
        content = f.read()
    new_val = "true" if is_dev else "false"
    if var_kind:
        content = re.sub(r"\bvar IS_DEV = (?:true|false)\s*;", f"var IS_DEV = {new_val};", content)
    if const_kind:
        content = re.sub(r"\bconst IS_DEV = (?:true|false)\s*;", f"const IS_DEV = {new_val};", content)
    with open(filepath, "w") as f:
        f.write(content)


def main() -> None:
    prompt = "Is it dev? (y/n, blank = yes): "
    raw = input(prompt).strip().lower()
    is_dev = raw in ("", "y", "yes")
    mode = "dev (localhost:7878)" if is_dev else "prod (4.240.102.231:7878)"
    print(f"Setting all configs to {mode} ...")
    for filepath, var_kind, const_kind in CONFIG_FILES:
        if not os.path.isfile(filepath):
            print(f"  Skip (missing): {filepath}")
            continue
        set_is_dev(filepath, is_dev, var_kind, const_kind)
        print(f"  Updated: {os.path.relpath(filepath, SCRIPT_DIR)}")
    print("Done. Reload the extensions in chrome://extensions if they are already loaded.")


if __name__ == "__main__":
    main()
