#!/usr/bin/env bash
# Symlink .env.local from the git main worktree (shared secrets). Used by Cursor worktree setup.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

MAIN_PROJECT_DIR=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null | sed 's|/.git$||')

if [ ! -f "$PROJECT_DIR/.env.local" ]; then
  if [ -f "$MAIN_PROJECT_DIR/.env.local" ]; then
    ln -sfn "$MAIN_PROJECT_DIR/.env.local" "$PROJECT_DIR/.env.local"
    echo "[link-worktree-env] Linked .env.local -> $MAIN_PROJECT_DIR/.env.local"
  else
    echo "[link-worktree-env] ERROR: No .env.local at main repo ($MAIN_PROJECT_DIR). Create it there first." >&2
    exit 1
  fi
else
  echo "[link-worktree-env] .env.local already present ✓"
fi
