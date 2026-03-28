#!/usr/bin/env bash
# ============================================================================
# AI Go Console — 環境啟動腳本
# 用途：讓 AI agent 或開發者快速將專案從零啟動到可運作狀態
# 使用方式：bash scripts/setup.sh [--skip-infra] [--reset-db] [--reset-cluster]
#
# 基礎服務模式：
#   - 若 k3d 已安裝 → 使用 k3d/k8s 叢集（PostgreSQL, Redis, Traefik）
#   - 否則 → 使用 Docker Compose（PostgreSQL, builtin-postgres, disk-storage, caddy）
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
    --skip-docker)    SKIP_INFRA=true ;;  # 向下相容
    --skip-k8s)       SKIP_INFRA=true ;;  # 向下相容
    --reset-db)       RESET_DB=true ;;
    --reset-cluster)  RESET_CLUSTER=true ;;
    --help|-h)
      echo "Usage: bash scripts/setup.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --skip-infra      跳過基礎服務啟動（已在運行時使用）"
      echo "  --reset-db        重置資料庫並重新 seed"
      echo "  --reset-cluster   (k3d 模式) 刪除叢集並重建"
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

# ── 偵測基礎服務模式 ────────────────────────────────────────────────────────
USE_K3D=false
if command -v k3d >/dev/null 2>&1 && command -v kubectl >/dev/null 2>&1; then
  USE_K3D=true
fi

# ── Step 1: 檢查必要工具 ──────────────────────────────────────────────────
info "Step 1/7: 檢查必要工具..."

command -v pnpm   >/dev/null 2>&1 || error "pnpm 未安裝。請先執行: npm install -g pnpm"
command -v docker >/dev/null 2>&1 || error "docker 未安裝。請先安裝 Docker Desktop。"
command -v node   >/dev/null 2>&1 || error "node 未安裝。"

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  error "Node.js 版本需 >= 18，目前為 $(node -v)"
fi

info "  pnpm $(pnpm -v), node $(node -v), docker $(docker --version | awk '{print $3}' | tr -d ',')"

if [ "$USE_K3D" = true ]; then
  info "  k3d $(k3d version | head -1 | awk '{print $3}'), kubectl $(kubectl version --client -o json 2>/dev/null | grep gitVersion | awk -F'\"' '{print $4}')"
  info "  模式: k3d/Kubernetes"
else
  info "  模式: Docker Compose"
fi

# ── Step 2: 確認 .env.local ──────────────────────────────────────────────
info "Step 2/7: 確認環境變數..."

# 找到 git 主專案根目錄（非 worktree）
MAIN_PROJECT_DIR=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null | sed 's|/.git$||')

if [ ! -f "$PROJECT_DIR/.env.local" ]; then
  if [ -f "$MAIN_PROJECT_DIR/.env.local" ]; then
    ln -s "$MAIN_PROJECT_DIR/.env.local" "$PROJECT_DIR/.env.local"
    info "  已建立 .env.local symbolic link -> $MAIN_PROJECT_DIR/.env.local"
  else
    error ".env.local 不存在於主專案 ($MAIN_PROJECT_DIR)，請先建立。"
  fi
else
  info "  .env.local 已存在 ✓"
fi

# ── Step 3: 啟動基礎服務 ─────────────────────────────────────────────────
if [ "$SKIP_INFRA" = false ]; then
  if [ "$USE_K3D" = true ]; then
    # ── k3d 模式 ──
    info "Step 3/7: 啟動 k3d 叢集..."

    K3D_SETUP_ARGS=""
    if [ "$RESET_CLUSTER" = true ]; then
      K3D_SETUP_ARGS="--reset"
    fi

    bash "$SCRIPT_DIR/k3d-setup.sh" $K3D_SETUP_ARGS
  else
    # ── Docker Compose 模式 ──
    info "Step 3/7: 啟動 Docker 服務..."

    COMPOSE_FILE="$MAIN_PROJECT_DIR/docker-compose.yml"
    if [ ! -f "$COMPOSE_FILE" ]; then
      COMPOSE_FILE="$PROJECT_DIR/docker-compose.yml"
    fi

    docker compose -f "$COMPOSE_FILE" up -d 2>/dev/null || docker-compose -f "$COMPOSE_FILE" up -d 2>/dev/null

    # 等待 PostgreSQL 就緒
    info "  等待 PostgreSQL 就緒..."
    for i in $(seq 1 30); do
      if docker exec aigo-postgres pg_isready -U aigo >/dev/null 2>&1; then
        info "  PostgreSQL 已就緒 ✓"
        break
      fi
      if [ "$i" = 30 ]; then
        error "PostgreSQL 啟動逾時（30 秒）"
      fi
      sleep 1
    done
  fi
else
  info "Step 3/7: 跳過基礎服務啟動 (--skip-infra)"
fi

# ── Step 4: 確認資料庫連線 ───────────────────────────────────────────────
info "Step 4/7: 確認資料庫連線..."

if [ "$USE_K3D" = true ] && [ "$SKIP_INFRA" = false ]; then
  # k3d 模式需要 port-forward
  kubectl config use-context k3d-aigo 2>/dev/null || error "無法切換至 k3d-aigo context"

  # 停止已有的 port-forward
  pkill -f "kubectl port-forward.*postgres.*5432" 2>/dev/null || true
  sleep 1

  kubectl wait --for=condition=ready pod -l app=postgres \
    -n aigo-system --timeout=60s 2>/dev/null || error "PostgreSQL Pod 未就緒"

  kubectl port-forward svc/postgres 5432:5432 -n aigo-system &>/dev/null &
  PF_PID=$!
  sleep 2

  if ! kill -0 $PF_PID 2>/dev/null; then
    error "PostgreSQL port-forward 啟動失敗"
  fi

  info "  PostgreSQL port-forward 已啟動 (PID: $PF_PID, localhost:5432) ✓"
else
  # Docker Compose 模式 — PostgreSQL 已直接 bind 到 localhost:5432
  info "  PostgreSQL 在 localhost:5432 ✓"
fi

# ── Step 5: 安裝依賴 ─────────────────────────────────────────────────────
info "Step 5/7: 安裝 pnpm 依賴..."
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# ── 載入 .env.local（Prisma CLI 僅讀 .env，需手動 export） ──────────────
info "  載入 .env.local 環境變數..."
set -a
source "$PROJECT_DIR/.env.local"
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

# 顯示基礎服務狀態
if [ "$USE_K3D" = true ]; then
  POD_COUNT=$(kubectl get pods -n aigo-system --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l | tr -d ' ')
  info "  k8s aigo-system 中有 $POD_COUNT 個 Running Pod"
else
  CONTAINER_COUNT=$(docker ps --filter "name=aigo-" --format '{{.Names}}' 2>/dev/null | wc -l | tr -d ' ')
  info "  Docker 有 $CONTAINER_COUNT 個 aigo 容器運行中"
fi

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

if [ "$USE_K3D" = true ]; then
  echo "  k8s 常用指令："
  echo "    kubectl get pods -n aigo-system   # 平台服務"
  echo "    kubectl get pods -n aigo-dev      # Dev 容器"
  echo ""
  if [ -n "${PF_PID:-}" ]; then
    echo "  注意：PostgreSQL port-forward 在背景執行 (PID: $PF_PID)"
    echo "  停止 port-forward: kill $PF_PID"
    echo ""
  fi
fi
