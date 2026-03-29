#!/usr/bin/env bash
# Claude Code SessionEnd hook
# Auto-commits uncommitted changes and merges worktree branch to main.
# Only runs on non-main branches. Does NOT push to remote.
set -euo pipefail

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)

# Skip if on main or detached HEAD
if [ -z "$BRANCH" ] || [ "$BRANCH" = "main" ] || [ "$BRANCH" = "HEAD" ]; then
  echo "[session-end-merge] On main or detached HEAD, skipping." >&2
  exit 0
fi

echo "[session-end-merge] Branch: $BRANCH" >&2

# Check for uncommitted changes (staged, unstaged, untracked)
if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
  echo "[session-end-merge] No uncommitted changes." >&2
else
  echo "[session-end-merge] Committing uncommitted changes..." >&2
  git add -A
  git commit -m "auto: session end commit on $BRANCH" --no-verify
  echo "[session-end-merge] Committed." >&2
fi

# Check if there are commits to merge (branch ahead of main)
if [ "$(git rev-parse HEAD)" = "$(git merge-base HEAD main 2>/dev/null)" ]; then
  echo "[session-end-merge] Branch has no new commits over main, skipping merge." >&2
  exit 0
fi

# Resolve main worktree path for cross-worktree merge
MAIN_GIT_COMMON=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null)
MAIN_PROJECT_DIR="${MAIN_GIT_COMMON%/.git}"

echo "[session-end-merge] Merging $BRANCH into main at $MAIN_PROJECT_DIR..." >&2

# Use the main worktree to perform the merge (avoids checkout conflicts in worktree)
git -C "$MAIN_PROJECT_DIR" merge "$BRANCH" --no-edit 2>&1 >&2 || {
  echo "[session-end-merge] ERROR: Merge failed (likely conflict). Resolve manually." >&2
  exit 0
}

echo "[session-end-merge] Merged $BRANCH into main ✓" >&2
