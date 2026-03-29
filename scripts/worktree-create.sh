#!/usr/bin/env bash
# Claude Code WorktreeCreate hook
# Reads JSON from stdin, initializes the worktree environment, outputs worktree_path.
set -euo pipefail

INPUT=$(cat)
WORKTREE_PATH=$(echo "$INPUT" | jq -r '.worktree_path')

if [ -z "$WORKTREE_PATH" ] || [ "$WORKTREE_PATH" = "null" ]; then
  echo "[worktree-create] ERROR: worktree_path not found in input" >&2
  exit 1
fi

cd "$WORKTREE_PATH"

# --- 1. Symlink .env from main worktree ---
MAIN_RAW=$(git rev-parse --path-format=absolute --git-common-dir) || {
  echo "[worktree-create] ERROR: git rev-parse failed" >&2
  exit 1
}
MAIN_PROJECT_DIR="${MAIN_RAW%/.git}"

if [ ! -f "$WORKTREE_PATH/.env" ]; then
  if [ -f "$MAIN_PROJECT_DIR/.env" ]; then
    ln -sfn "$MAIN_PROJECT_DIR/.env" "$WORKTREE_PATH/.env"
    echo "[worktree-create] Linked .env -> $MAIN_PROJECT_DIR/.env" >&2
  else
    echo "[worktree-create] WARN: No .env at main repo ($MAIN_PROJECT_DIR)" >&2
  fi
fi

# --- 2. Install dependencies ---
if [ ! -d "$WORKTREE_PATH/node_modules" ]; then
  echo "[worktree-create] Running pnpm install..." >&2
  pnpm install --frozen-lockfile 2>&1 >&2 || pnpm install 2>&1 >&2
fi

# --- 3. Generate Prisma Client ---
echo "[worktree-create] Generating Prisma Client..." >&2
npx prisma generate 2>&1 >&2

echo "[worktree-create] Done ✓" >&2

# Output worktree path (required by Claude Code)
echo "$WORKTREE_PATH"
