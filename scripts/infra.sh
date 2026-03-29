#!/usr/bin/env bash
# ============================================================================
# AI Go Console — 基礎服務自動啟動（predev hook）
# 叢集不存在 → 執行完整 setup
# 叢集已存在 → 確保 running + port-forward
# ============================================================================
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

command -v k3d    >/dev/null 2>&1 || error "k3d 未安裝"
command -v kubectl >/dev/null 2>&1 || error "kubectl 未安裝"

# ── 叢集不存在 → 完整 setup ────────────────────────────────────────────────
if ! k3d cluster list 2>/dev/null | grep -q "aigo"; then
  info "叢集 'aigo' 不存在，執行完整 setup..."
  bash "$SCRIPT_DIR/setup.sh"
  exit 0
fi

# ── 叢集已停止 → 啟動 ─────────────────────────────────────────────────────
if ! k3d cluster list 2>/dev/null | grep "aigo" | grep -q "running"; then
  info "啟動 k3d 叢集..."
  k3d cluster start aigo
fi

kubectl config use-context k3d-aigo 2>/dev/null || error "無法切換至 k3d-aigo context"

# ── 等待核心服務 ──────────────────────────────────────────────────────────
info "等待核心服務就緒..."
kubectl wait --for=condition=ready pod -l app=platform-postgres \
  -n aigo-system --timeout=60s 2>/dev/null || error "PostgreSQL 未就緒"
kubectl wait --for=condition=ready pod -l app=platform-redis \
  -n aigo-system --timeout=60s 2>/dev/null || error "Redis 未就緒"
kubectl wait --for=condition=available deployment/builtin-supabase-kong \
  -n aigo-system --timeout=60s 2>/dev/null || warn "Supabase Kong 尚未就緒"

# ── 核心服務由 k3d port mapping 管理（不需 port-forward）────────────────────
# PostgreSQL: localhost:5432 → k3d → NodePort 30432
# Redis:      localhost:6379 → k3d → NodePort 30379
# MinIO UI:   localhost:9001 → k3d → NodePort 30901

# ── Builtin 平台服務 port-forward（僅本地開發用）──────────────────────────
forward_if_needed() {
  local label=$1 svc=$2 ports=$3
  if ! pgrep -f "kubectl port-forward.*${svc}.*${ports}" >/dev/null 2>&1; then
    kubectl port-forward "svc/${svc}" "$ports" -n aigo-system &>/dev/null &
    info "  ${label} → localhost:${ports%%:*}"
  fi
}

forward_if_needed "Supabase"    "builtin-supabase-kong" "54321:8000"
forward_if_needed "MinIO API"   "builtin-minio"         "9000:9000"
forward_if_needed "Qdrant"      "builtin-qdrant"        "6333:6333"
forward_if_needed "Meilisearch" "builtin-meilisearch"   "7700:7700"
forward_if_needed "n8n"         "builtin-n8n"           "5678:5678"
forward_if_needed "Metabase"    "builtin-metabase"      "3001:3000"
forward_if_needed "PostHog"     "builtin-posthog"       "8100:8000"
forward_if_needed "Keycloak"    "builtin-keycloak"      "8180:8080"
sleep 1

info "基礎服務就緒"
