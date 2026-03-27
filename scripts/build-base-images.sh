#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
TEMPLATES_DIR="$ROOT_DIR/templates"

TEMPLATES=("react-spa" "nextjs-fullstack" "node-api" "line-bot")

for tmpl in "${TEMPLATES[@]}"; do
  echo "=== Building dev base image: aigo-dev-base-${tmpl} ==="
  docker build \
    -t "aigo-dev-base-${tmpl}:latest" \
    -f "${TEMPLATES_DIR}/${tmpl}/Dockerfile.dev" \
    "${TEMPLATES_DIR}/${tmpl}/"
  echo "=== Done: aigo-dev-base-${tmpl} ==="
  echo
done

echo "All base images built successfully."
