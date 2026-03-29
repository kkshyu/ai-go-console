#!/usr/bin/env bash
# Symlink .env from the git main worktree (shared secrets). Used by Cursor worktree setup.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

MAIN_RAW=$(git rev-parse --path-format=absolute --git-common-dir) || {
  echo "[link-worktree-env] ERROR: git rev-parse failed; run this script from a git checkout." >&2
  exit 1
}
# Strip trailing /.git from common-dir; must not become empty or "/" or we would touch /.env
MAIN_PROJECT_DIR="${MAIN_RAW%/.git}"
if [ -z "$MAIN_PROJECT_DIR" ] || [ "$MAIN_PROJECT_DIR" = "/" ]; then
  echo "[link-worktree-env] ERROR: Invalid main worktree path from git (resolved to empty or filesystem root)." >&2
  exit 1
fi
if [ ! -d "$MAIN_PROJECT_DIR" ]; then
  echo "[link-worktree-env] ERROR: Main worktree directory is missing or not a directory: $MAIN_PROJECT_DIR" >&2
  exit 1
fi

if [ ! -f "$PROJECT_DIR/.env" ]; then
  if [ -f "$MAIN_PROJECT_DIR/.env" ]; then
    ln -sfn "$MAIN_PROJECT_DIR/.env" "$PROJECT_DIR/.env"
    echo "[link-worktree-env] Linked .env -> $MAIN_PROJECT_DIR/.env"
  else
    echo "[link-worktree-env] ERROR: No .env at main repo ($MAIN_PROJECT_DIR). Create it there first (cp .env.example .env)." >&2
    exit 1
  fi
else
  echo "[link-worktree-env] .env already present ✓"
fi
