#!/usr/bin/env bash
# Claude Code WorktreeRemove hook
# Reads JSON from stdin, cleans up the worktree.
set -euo pipefail

INPUT=$(cat)
WORKTREE_PATH=$(echo "$INPUT" | jq -r '.worktree_path')

if [ -z "$WORKTREE_PATH" ] || [ "$WORKTREE_PATH" = "null" ]; then
  echo "[worktree-remove] ERROR: worktree_path not found in input" >&2
  exit 1
fi

# Safety: only remove paths under .claude/worktrees/
case "$WORKTREE_PATH" in
  */.claude/worktrees/*)
    if [ -d "$WORKTREE_PATH" ]; then
      echo "[worktree-remove] Cleaning up $WORKTREE_PATH" >&2
      rm -rf "$WORKTREE_PATH"
      echo "[worktree-remove] Done ✓" >&2
    fi
    ;;
  *)
    echo "[worktree-remove] WARN: Skipping non-standard worktree path: $WORKTREE_PATH" >&2
    ;;
esac
