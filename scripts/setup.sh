#!/usr/bin/env bash
# ============================================================================
# AI Go Console — 環境啟動腳本
# 用途：讓 AI agent 或開發者快速將專案從零啟動到可運作狀態
# 使用方式：bash scripts/setup.sh [--skip-infra] [--reset-db] [--reset-cluster]
#
# 基礎服務：k3d/k8s 叢集（PostgreSQL, Redis, Traefik）
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
SKIP_INFRA=false
RESET_DB=false
RESET_CLUSTER=false

for arg in "$@"; do
  case $arg in
    --skip-infra)     SKIP_INFRA=true ;;
    --reset-db)       RESET_DB=true ;;
    --reset-cluster)  RESET_CLUSTER=true ;;
    --help|-h)
      echo "Usage: bash scripts/setup.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --skip-infra      跳過基礎服務啟動（已在運行時使用）"
      echo "  --reset-db        重置資料庫並重新 seed"
      echo "  --reset-cluster   刪除 k3d 叢集並重建"
      echo "  -h, --help        顯示說明"
      exit 0
      ;;
  esac
done

# ── 取得專案根目錄 ──────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

info "專案目錄: $PROJECT_DIR"

# ── Step 1: 檢查必要工具 ──────────────────────────────────────────────────
info "Step 1/7: 檢查必要工具..."

command -v pnpm   >/dev/null 2>&1 || error "pnpm 未安裝。請先執行: npm install -g pnpm"
command -v docker >/dev/null 2>&1 || error "docker 未安裝。請先安裝 Docker Desktop。"
command -v node   >/dev/null 2>&1 || error "node 未安裝。"
command -v k3d    >/dev/null 2>&1 || error "k3d 未安裝。請執行: brew install k3d (macOS) 或參考 https://k3d.io"
command -v kubectl >/dev/null 2>&1 || error "kubectl 未安裝。請執行: brew install kubectl (macOS)"

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  error "Node.js 版本需 >= 18，目前為 $(node -v)"
fi

info "  pnpm $(pnpm -v), node $(node -v), docker $(docker --version | awk '{print $3}' | tr -d ',')"
info "  k3d $(k3d version | head -1 | awk '{print $3}'), kubectl $(kubectl version --client -o json 2>/dev/null | grep gitVersion | awk -F'\"' '{print $4}')"

# ── Step 2: 確認環境變數檔案 ─────────────────────────────────────────────
info "Step 2/7: 確認環境變數..."

# 找到 git 主專案根目錄（非 worktree）
MAIN_PROJECT_DIR=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null | sed 's|/.git$||')

# .env（非機密預設值）— 若不存在則從 .env.example 複製
if [ ! -f "$PROJECT_DIR/.env" ]; then
  if [ -f "$PROJECT_DIR/.env.example" ]; then
    # 從 .env.example 擷取非機密部分（到 Secrets 區段之前）
    sed -n '/^# === Non-secret/,/^# === Secrets/{ /^# === Secrets/d; p; }' \
      "$PROJECT_DIR/.env.example" > "$PROJECT_DIR/.env"
    info "  已從 .env.example 建立 .env ✓"
  elif [ -f "$MAIN_PROJECT_DIR/.env" ]; then
    cp "$MAIN_PROJECT_DIR/.env" "$PROJECT_DIR/.env"
    info "  已從主專案複製 .env ✓"
  else
    warn "  .env 不存在且無法自動建立，請從 .env.example 複製"
  fi
else
  info "  .env 已存在 ✓"
fi

# Worktree: symlink .env from main project
if [ "$PROJECT_DIR" != "$MAIN_PROJECT_DIR" ] && [ ! -f "$PROJECT_DIR/.env" ]; then
  if [ -f "$MAIN_PROJECT_DIR/.env" ]; then
    ln -s "$MAIN_PROJECT_DIR/.env" "$PROJECT_DIR/.env"
    info "  已建立 .env symbolic link -> $MAIN_PROJECT_DIR/.env"
  else
    error ".env 不存在於主專案 ($MAIN_PROJECT_DIR)，請先建立 (cp .env.example .env)"
  fi
fi

# ── Step 3: 啟動 k3d 叢集 ────────────────────────────────────────────────
if [ "$SKIP_INFRA" = false ]; then
  info "Step 3/7: 啟動 k3d 叢集..."

  K3D_SETUP_ARGS=""
  if [ "$RESET_CLUSTER" = true ]; then
    K3D_SETUP_ARGS="--reset"
  fi

  bash "$SCRIPT_DIR/k3d-setup.sh" $K3D_SETUP_ARGS
else
  info "Step 3/7: 跳過基礎服務啟動 (--skip-infra)"
fi

# ── Step 4: 確認服務連線（PostgreSQL, Redis, Built-in PostgreSQL）────────
info "Step 4/7: 確認服務連線..."

if [ "$SKIP_INFRA" = false ]; then
  kubectl config use-context k3d-aigo 2>/dev/null || error "無法切換至 k3d-aigo context"

  # 核心服務由 k3d port mapping 管理（不需 port-forward）
  # PostgreSQL: localhost:5432 → k3d → NodePort 30432
  # Redis:      localhost:6379 → k3d → NodePort 30379
  # MinIO UI:   localhost:9001 → k3d → NodePort 30901

  # 等待核心服務就緒
  kubectl wait --for=condition=ready pod -l app=postgres \
    -n aigo-system --timeout=60s 2>/dev/null || error "PostgreSQL Pod 未就緒"
  info "  PostgreSQL 就緒 (localhost:5432 via k3d) ✓"

  kubectl wait --for=condition=ready pod -l app=redis \
    -n aigo-system --timeout=60s 2>/dev/null || error "Redis Pod 未就緒"
  info "  Redis 就緒 (localhost:6379 via k3d) ✓"

  kubectl wait --for=condition=ready pod -l app=builtin-minio \
    -n aigo-system --timeout=60s 2>/dev/null || warn "MinIO 尚未就緒"
  info "  MinIO Console 就緒 (localhost:9001 via k3d) ✓"

  # Builtin 平台服務 port-forward（僅本地開發用）
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
else
  info "  使用既有的服務連線"
fi

# ── Step 5: 安裝依賴 ─────────────────────────────────────────────────────
info "Step 5/7: 安裝 pnpm 依賴..."
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# ── 載入環境變數（Prisma CLI 僅讀 .env，需手動 export） ──────────────────
info "  載入環境變數..."
set -a
source "$PROJECT_DIR/.env"
set +a

# ── Step 6: 資料庫遷移與 Seed ────────────────────────────────────────────
info "Step 6/7: 資料庫遷移..."

if [ "$RESET_DB" = true ]; then
  warn "  重置資料庫..."
  npx prisma migrate reset --force
else
  npx prisma migrate deploy 2>/dev/null || npx prisma db push
fi

info "  產生 Prisma Client..."
npx prisma generate

info "  Seed 測試資料..."
npx prisma db seed 2>/dev/null && info "  Seed 完成 ✓" || warn "  Seed 已存在或失敗（可忽略）"

# ── Step 7: 驗證 ─────────────────────────────────────────────────────────
info "Step 7/7: 驗證環境..."

# 檢查 DB 連線
if npx prisma db execute --stdin <<< "SELECT 1" >/dev/null 2>&1; then
  info "  資料庫連線正常 ✓"
else
  warn "  資料庫連線檢查失敗，請確認 DATABASE_URL"
fi

# 檢查 seed 資料
USER_COUNT=$(npx prisma db execute --stdin <<< "SELECT count(*) FROM \"User\"" 2>/dev/null | grep -o '[0-9]*' | head -1 || echo "0")
info "  資料庫中有 $USER_COUNT 個使用者"

# 顯示 k8s 服務狀態
POD_COUNT=$(kubectl get pods -n aigo-system --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l | tr -d ' ')
info "  k8s aigo-system 中有 $POD_COUNT 個 Running Pod"

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  環境準備完成！${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "  啟動 dev server:  pnpm dev"
echo "  或使用 preview:   preview_start ai-go-console"
echo ""
echo "  測試帳號："
echo "    admin@example.com / password123 (Admin, Acme Corp)"
echo "    alice@example.com / password123 (User, Acme Corp)"
echo "    bob@example.com   / password123 (Admin, Cool Startup)"
echo ""
echo "  k8s 常用指令："
echo "    kubectl get pods -n aigo-system   # 平台服務"
echo "    kubectl get pods -n aigo-dev      # Dev 容器"
echo ""
if [ -n "${PF_PID:-}" ]; then
  echo "  Port-forward 背景執行中："
  echo "    PostgreSQL:       PID $PF_PID (localhost:5432)"
  [ -n "${REDIS_PF_PID:-}" ] && echo "    Redis:            PID $REDIS_PF_PID (localhost:6379)"
  [ -n "${SB_PF_PID:-}" ]    && echo "    Supabase:         PID $SB_PF_PID (localhost:54321)"
  echo "  停止全部: kill ${PF_PID} ${REDIS_PF_PID:-} ${SB_PF_PID:-}"
  echo ""
fi
