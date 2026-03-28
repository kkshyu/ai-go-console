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

# .env.local（機密資訊）— worktree 使用 symlink
if [ ! -f "$PROJECT_DIR/.env.local" ]; then
  if [ -f "$MAIN_PROJECT_DIR/.env.local" ]; then
    ln -s "$MAIN_PROJECT_DIR/.env.local" "$PROJECT_DIR/.env.local"
    info "  已建立 .env.local symbolic link -> $MAIN_PROJECT_DIR/.env.local"
  else
    error ".env.local 不存在於主專案 ($MAIN_PROJECT_DIR)，請先建立。參考 .env.example"
  fi
else
  info "  .env.local 已存在 ✓"
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

  # 停止已有的 port-forward
  pkill -f "kubectl port-forward.*postgres.*5432" 2>/dev/null || true
  pkill -f "kubectl port-forward.*redis.*6379" 2>/dev/null || true
  pkill -f "kubectl port-forward.*builtin-postgres.*5434" 2>/dev/null || true
  sleep 1

  # PostgreSQL (平台資料庫)
  kubectl wait --for=condition=ready pod -l app=postgres \
    -n aigo-system --timeout=60s 2>/dev/null || error "PostgreSQL Pod 未就緒"

  kubectl port-forward svc/postgres 5432:5432 -n aigo-system &>/dev/null &
  PF_PID=$!
  sleep 2

  if ! kill -0 $PF_PID 2>/dev/null; then
    error "PostgreSQL port-forward 啟動失敗"
  fi

  info "  PostgreSQL port-forward 已啟動 (PID: $PF_PID, localhost:5432) ✓"

  # Redis (BullMQ 訊息佇列)
  kubectl wait --for=condition=ready pod -l app=redis \
    -n aigo-system --timeout=60s 2>/dev/null || error "Redis Pod 未就緒"

  kubectl port-forward svc/redis 6379:6379 -n aigo-system &>/dev/null &
  REDIS_PF_PID=$!
  sleep 2

  if ! kill -0 $REDIS_PF_PID 2>/dev/null; then
    error "Redis port-forward 啟動失敗"
  fi

  info "  Redis port-forward 已啟動 (PID: $REDIS_PF_PID, localhost:6379) ✓"

  # Built-in PostgreSQL (組織資料庫)
  kubectl wait --for=condition=ready pod -l app=builtin-postgres \
    -n aigo-system --timeout=60s 2>/dev/null || error "Built-in PostgreSQL Pod 未就緒"

  kubectl port-forward svc/builtin-postgres 5434:5432 -n aigo-system &>/dev/null &
  BPG_PF_PID=$!
  sleep 2

  if ! kill -0 $BPG_PF_PID 2>/dev/null; then
    error "Built-in PostgreSQL port-forward 啟動失敗"
  fi

  info "  Built-in PostgreSQL port-forward 已啟動 (PID: $BPG_PF_PID, localhost:5434) ✓"
else
  info "  使用既有的服務連線 (PostgreSQL:5432, Redis:6379, Built-in PG:5434)"
fi

# ── Step 5: 安裝依賴 ─────────────────────────────────────────────────────
info "Step 5/7: 安裝 pnpm 依賴..."
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# ── 載入環境變數（Prisma CLI 僅讀 .env，需手動 export） ──────────────────
info "  載入環境變數..."
set -a
[ -f "$PROJECT_DIR/.env" ] && source "$PROJECT_DIR/.env"
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
  [ -n "${BPG_PF_PID:-}" ]   && echo "    Built-in PG:      PID $BPG_PF_PID (localhost:5434)"
  echo "  停止全部: kill ${PF_PID} ${REDIS_PF_PID:-} ${BPG_PF_PID:-}"
  echo ""
fi
