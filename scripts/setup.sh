#!/usr/bin/env bash
# ============================================================================
# AI Go Console — 環境啟動腳本
# 用途：讓 AI agent 或開發者快速將專案從零啟動到可運作狀態
# 使用方式：bash scripts/setup.sh [--skip-docker] [--reset-db]
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
SKIP_DOCKER=false
RESET_DB=false

for arg in "$@"; do
  case $arg in
    --skip-docker) SKIP_DOCKER=true ;;
    --reset-db)    RESET_DB=true ;;
    --help|-h)
      echo "Usage: bash scripts/setup.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --skip-docker   跳過 Docker 服務啟動（已在運行時使用）"
      echo "  --reset-db      重置資料庫並重新 seed"
      echo "  -h, --help      顯示說明"
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
info "Step 1/6: 檢查必要工具..."

command -v pnpm  >/dev/null 2>&1 || error "pnpm 未安裝。請先執行: npm install -g pnpm"
command -v docker >/dev/null 2>&1 || error "docker 未安裝。請先安裝 Docker Desktop。"
command -v node   >/dev/null 2>&1 || error "node 未安裝。"

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  error "Node.js 版本需 >= 18，目前為 $(node -v)"
fi

info "  pnpm $(pnpm -v), node $(node -v), docker $(docker --version | awk '{print $3}' | tr -d ',')"

# ── Step 2: 確認 .env.local ──────────────────────────────────────────────
info "Step 2/6: 確認環境變數..."

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

# ── Step 3: 啟動 Docker 服務 ─────────────────────────────────────────────
if [ "$SKIP_DOCKER" = false ]; then
  info "Step 3/6: 啟動 Docker 服務..."

  # 使用主專案的 docker-compose（worktree 中可能沒有 volumes）
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
else
  info "Step 3/6: 跳過 Docker 啟動 (--skip-docker)"
fi

# ── Step 4: 安裝依賴 ─────────────────────────────────────────────────────
info "Step 4/6: 安裝 pnpm 依賴..."
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# ── Step 5: 資料庫遷移與 Seed ────────────────────────────────────────────
info "Step 5/6: 資料庫遷移..."

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

# ── Step 6: 驗證 ─────────────────────────────────────────────────────────
info "Step 6/6: 驗證環境..."

# 檢查 DB 連線
if npx prisma db execute --stdin <<< "SELECT 1" >/dev/null 2>&1; then
  info "  資料庫連線正常 ✓"
else
  warn "  資料庫連線檢查失敗，請確認 DATABASE_URL"
fi

# 檢查 seed 資料
USER_COUNT=$(npx prisma db execute --stdin <<< "SELECT count(*) FROM \"User\"" 2>/dev/null | grep -o '[0-9]*' | head -1 || echo "0")
info "  資料庫中有 $USER_COUNT 個使用者"

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
