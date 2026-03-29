#!/usr/bin/env bash
# ============================================================================
# AI Go Console — k3d (k3s-in-Docker) 叢集設定腳本
# 用途：建立本地 k3d 叢集，部署平台基礎服務
# 使用方式：bash scripts/k3d-setup.sh [--reset]
# ============================================================================
set -euo pipefail

# ── 顏色輸出 ────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── 參數解析 ────────────────────────────────────────────────────────────────
RESET=false

for arg in "$@"; do
  case $arg in
    --reset)
      RESET=true
      ;;
    --help|-h)
      echo "Usage: bash scripts/k3d-setup.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --reset    刪除現有叢集並重建"
      echo "  -h, --help 顯示說明"
      exit 0
      ;;
  esac
done

# ── 取得專案根目錄 ──────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── 常數 ────────────────────────────────────────────────────────────────────
CLUSTER_NAME="aigo"
REGISTRY_NAME="aigo-registry"
REGISTRY_PORT=5111

# ── Step 1: 檢查必要工具 ──────────────────────────────────────────────────
info "Step 1/5: 檢查必要工具..."

command -v docker  >/dev/null 2>&1 || error "docker 未安裝。請先安裝 Docker Desktop。"
command -v k3d     >/dev/null 2>&1 || error "k3d 未安裝。請執行: brew install k3d (macOS) 或參考 https://k3d.io"
command -v kubectl >/dev/null 2>&1 || error "kubectl 未安裝。請執行: brew install kubectl (macOS)"

# 選裝工具：k9s（終端 k8s 管理 UI）
if ! command -v k9s >/dev/null 2>&1; then
  warn "k9s 未安裝，嘗試自動安裝..."
  if command -v brew >/dev/null 2>&1; then
    brew install k9s || warn "k9s 安裝失敗，可稍後手動安裝: brew install k9s"
  else
    warn "k9s 未安裝且無 Homebrew，請手動安裝: https://k9scli.io/topics/install/"
  fi
fi

info "  docker $(docker --version | awk '{print $3}' | tr -d ',')"
info "  k3d $(k3d version | head -1 | awk '{print $3}')"
info "  kubectl $(kubectl version --client --short 2>/dev/null || kubectl version --client -o json | grep gitVersion | awk -F'"' '{print $4}')"
command -v k9s >/dev/null 2>&1 && info "  k9s $(k9s version --short 2>/dev/null | grep Version | awk '{print $2}' || k9s version 2>&1 | head -1)"

# ── Step 2: 建立/重置 k3d 叢集 ───────────────────────────────────────────
info "Step 2/5: 建立 k3d 叢集..."

if k3d cluster list 2>/dev/null | grep -q "$CLUSTER_NAME"; then
  if [ "$RESET" = true ]; then
    warn "  刪除現有叢集 '$CLUSTER_NAME'..."
    k3d cluster delete "$CLUSTER_NAME" 2>/dev/null || true
    k3d registry delete "$REGISTRY_NAME" 2>/dev/null || true
  else
    info "  叢集 '$CLUSTER_NAME' 已存在，跳過建立"
    info "  如需重建，請使用 --reset 參數"

    # 確保叢集已啟動
    if ! k3d cluster list 2>/dev/null | grep "$CLUSTER_NAME" | grep -q "running"; then
      info "  啟動叢集..."
      k3d cluster start "$CLUSTER_NAME"
    fi

    # 跳到 namespace 檢查
    SKIP_CREATE=true
  fi
fi

if [ "${SKIP_CREATE:-false}" = false ]; then
  # 建立 registry（如果不存在）
  if ! k3d registry list 2>/dev/null | grep -q "$REGISTRY_NAME"; then
    info "  建立本地 registry: $REGISTRY_NAME:$REGISTRY_PORT..."
    k3d registry create "$REGISTRY_NAME" --port "$REGISTRY_PORT"
  fi

  # 建立 k3d cluster
  # - Traefik 由 k3s 自動啟用
  # - port 80/443 映射到 host 的 loadbalancer
  # - 連接本地 registry
  info "  建立 k3d cluster: $CLUSTER_NAME..."
  k3d cluster create "$CLUSTER_NAME" \
    --port "80:80@loadbalancer" \
    --port "443:443@loadbalancer" \
    --port "5432:30432@server:0" \
    --port "6379:30379@server:0" \
    --port "9001:30901@server:0" \
    --registry-use "k3d-${REGISTRY_NAME}:${REGISTRY_PORT}" \
    --k3s-arg "--disable=traefik@server:0" \
    --wait

  info "  叢集建立完成 ✓"
fi

# 確認 kubectl context
kubectl config use-context "k3d-${CLUSTER_NAME}" 2>/dev/null || true

# ── Step 3: 建立 Namespace ────────────────────────────────────────────────
info "Step 3/5: 建立 Namespace..."

kubectl apply -f "$PROJECT_DIR/k8s/namespaces.yaml"

info "  Namespace 建立完成 ✓"

# ── Step 4: 部署平台服務 ──────────────────────────────────────────────────
info "Step 4/5: 部署平台服務..."

# Traefik Ingress Controller
kubectl apply -f "$PROJECT_DIR/k8s/traefik/"

# 平台服務（PostgreSQL, Redis, Storage）
kubectl apply -f "$PROJECT_DIR/k8s/platform/"

# Background Workers
kubectl apply -f "$PROJECT_DIR/k8s/workers/" 2>/dev/null || true

# Network Policies
kubectl apply -f "$PROJECT_DIR/k8s/network-policies/" 2>/dev/null || true

info "  平台服務部署完成 ✓"

# ── Step 5: 等待服務就緒 ──────────────────────────────────────────────────
info "Step 5/5: 等待平台服務就緒..."

# 等待 Traefik
info "  等待 Traefik Ingress Controller..."
kubectl wait --for=condition=available deployment/traefik \
  -n aigo-system --timeout=120s 2>/dev/null || warn "  Traefik 尚未就緒，請稍後檢查"

# 等待 PostgreSQL
info "  等待 PostgreSQL..."
kubectl wait --for=condition=ready pod -l app=platform-postgres \
  -n aigo-system --timeout=120s 2>/dev/null || warn "  PostgreSQL 尚未就緒，請稍後檢查"

# 等待 Redis
info "  等待 Redis..."
kubectl wait --for=condition=ready pod -l app=platform-redis \
  -n aigo-system --timeout=60s 2>/dev/null || warn "  Redis 尚未就緒，請稍後檢查"

# 等待 Supabase 服務
info "  等待 Supabase DB..."
kubectl wait --for=condition=ready pod -l app=builtin-supabase-db \
  -n aigo-system --timeout=120s 2>/dev/null || warn "  Supabase DB 尚未就緒，請稍後檢查"

info "  等待 Supabase REST (PostgREST)..."
kubectl wait --for=condition=available deployment/builtin-supabase-rest \
  -n aigo-system --timeout=120s 2>/dev/null || warn "  Supabase REST 尚未就緒，請稍後檢查"

info "  等待 Supabase Auth (GoTrue)..."
kubectl wait --for=condition=available deployment/builtin-supabase-auth \
  -n aigo-system --timeout=120s 2>/dev/null || warn "  Supabase Auth 尚未就緒，請稍後檢查"

info "  等待 Supabase Kong (API Gateway)..."
kubectl wait --for=condition=available deployment/builtin-supabase-kong \
  -n aigo-system --timeout=120s 2>/dev/null || warn "  Supabase Kong 尚未就緒，請稍後檢查"

# 等待 Keycloak
info "  等待 Keycloak..."
kubectl wait --for=condition=available deployment/builtin-keycloak \
  -n aigo-system --timeout=180s 2>/dev/null || warn "  Keycloak 尚未就緒，請稍後檢查"

# 等待 MinIO
info "  等待 MinIO..."
kubectl wait --for=condition=ready pod -l app=builtin-minio \
  -n aigo-system --timeout=120s 2>/dev/null || warn "  MinIO 尚未就緒，請稍後檢查"

# 等待 n8n
info "  等待 n8n..."
kubectl wait --for=condition=ready pod -l app=builtin-n8n \
  -n aigo-system --timeout=120s 2>/dev/null || warn "  n8n 尚未就緒，請稍後檢查"

# 等待 Qdrant
info "  等待 Qdrant..."
kubectl wait --for=condition=ready pod -l app=builtin-qdrant \
  -n aigo-system --timeout=120s 2>/dev/null || warn "  Qdrant 尚未就緒，請稍後檢查"

# 等待 Meilisearch
info "  等待 Meilisearch..."
kubectl wait --for=condition=ready pod -l app=builtin-meilisearch \
  -n aigo-system --timeout=120s 2>/dev/null || warn "  Meilisearch 尚未就緒，請稍後檢查"

# 等待 PostHog
info "  等待 PostHog..."
kubectl wait --for=condition=available deployment/builtin-posthog \
  -n aigo-system --timeout=180s 2>/dev/null || warn "  PostHog 尚未就緒，請稍後檢查"

# 等待 Metabase PostgreSQL
info "  等待 Metabase PostgreSQL..."
kubectl wait --for=condition=ready pod -l app=builtin-metabase-pg \
  -n aigo-system --timeout=120s 2>/dev/null || warn "  Metabase PostgreSQL 尚未就緒，請稍後檢查"

# 等待 Metabase
info "  等待 Metabase..."
kubectl wait --for=condition=available deployment/builtin-metabase \
  -n aigo-system --timeout=180s 2>/dev/null || warn "  Metabase 尚未就緒，請稍後檢查"

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  k3d 叢集準備完成！${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "  叢集名稱:  $CLUSTER_NAME"
echo "  Registry:  k3d-${REGISTRY_NAME}:${REGISTRY_PORT} (本地推送用 localhost:${REGISTRY_PORT})"
echo "  Namespace: aigo-system, aigo-dev, aigo-prod, aigo-workers"
echo ""
echo "  常用指令："
echo "    kubectl get pods -A              # 查看所有 Pod"
echo "    kubectl get pods -n aigo-dev     # 查看 dev 容器"
echo "    kubectl get pods -n aigo-prod    # 查看 prod 容器"
echo "    kubectl get ingressroute -A      # 查看路由"
echo "    k3d cluster stop $CLUSTER_NAME   # 停止叢集"
echo "    k3d cluster start $CLUSTER_NAME  # 啟動叢集"
echo "    k9s                              # 終端 k8s 管理 UI"
echo ""
