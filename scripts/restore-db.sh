#!/usr/bin/env bash
# ============================================================================
# PostgreSQL 還原腳本
# 用途：從備份檔還原 AI Go Console 的 PostgreSQL 資料庫
# 使用方式：bash scripts/restore-db.sh --backup-file <path> [OPTIONS]
#
# 安全機制：
#   - 還原前自動建立當前狀態快照
#   - 需要 --confirm 參數確認（防誤操作）
#   - 支援 --dry-run 預覽模式
# ============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[RESTORE]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── 參數預設值 ──────────────────────────────────────────────────────────────
BACKUP_FILE=""
ENV="dev"
CONFIRM=false
DRY_RUN=false
SKIP_SNAPSHOT=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --backup-file)    BACKUP_FILE="$2"; shift 2 ;;
    --env)            ENV="$2"; shift 2 ;;
    --confirm)        CONFIRM=true; shift ;;
    --dry-run)        DRY_RUN=true; shift ;;
    --skip-snapshot)  SKIP_SNAPSHOT=true; shift ;;
    --help|-h)
      echo "Usage: bash scripts/restore-db.sh --backup-file <path> [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --backup-file <path>   備份檔路徑（必填）"
      echo "  --env dev|prod         環境（預設 dev）"
      echo "  --confirm              確認還原（必填，防誤操作）"
      echo "  --dry-run              預覽模式，不實際還原"
      echo "  --skip-snapshot        跳過還原前快照（不建議）"
      exit 0
      ;;
    *) error "未知參數: $1" ;;
  esac
done

# ── 驗證參數 ────────────────────────────────────────────────────────────────
[ -z "$BACKUP_FILE" ] && error "請指定備份檔：--backup-file <path>"
[ ! -f "$BACKUP_FILE" ] && error "備份檔不存在: $BACKUP_FILE"
[ "$CONFIRM" = false ] && [ "$DRY_RUN" = false ] && \
  error "請加上 --confirm 確認還原，或 --dry-run 預覽"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── 載入環境變數 ────────────────────────────────────────────────────────────
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  source "$PROJECT_DIR/.env"
  set +a
fi

DB_URL="${DATABASE_URL:-}"
[ -z "$DB_URL" ] && error "DATABASE_URL 未設定"

DB_USER=$(echo "$DB_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
DB_PASS=$(echo "$DB_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
DB_HOST=$(echo "$DB_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
DB_PORT=$(echo "$DB_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
DB_NAME=$(echo "$DB_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')

# ── 顯示備份資訊 ────────────────────────────────────────────────────────────
BACKUP_SIZE=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE" 2>/dev/null || echo "0")
info "備份檔資訊:"
info "  檔案: $BACKUP_FILE"
info "  大小: $(echo "$BACKUP_SIZE" | awk '{printf "%.2f MB", $1/1024/1024}')"
info "  目標: $DB_NAME@$DB_HOST:$DB_PORT"
info "  環境: $ENV"

# ── Dry Run ─────────────────────────────────────────────────────────────────
if [ "$DRY_RUN" = true ]; then
  info "[DRY RUN] 預覽備份內容..."
  if echo "$BACKUP_FILE" | grep -q '\.gz$'; then
    gunzip -c "$BACKUP_FILE" | pg_restore --list 2>/dev/null | head -30 || \
      info "  （備份為 SQL 純文字格式）"
  else
    pg_restore --list "$BACKUP_FILE" 2>/dev/null | head -30 || \
      info "  （備份為 SQL 純文字格式）"
  fi
  info "[DRY RUN] 結束。使用 --confirm 執行實際還原。"
  exit 0
fi

# ── 還原前快照 ──────────────────────────────────────────────────────────────
if [ "$SKIP_SNAPSHOT" = false ]; then
  info "建立還原前快照..."
  PRE_RESTORE_BACKUP=$("$SCRIPT_DIR/backup-db.sh" \
    --env "$ENV" \
    --label "pre-restore" \
    --quiet 2>/dev/null | tail -1)
  info "  快照已建立: $PRE_RESTORE_BACKUP"
  info "  若還原失敗，可用此快照回復"
else
  warn "跳過還原前快照（--skip-snapshot）"
fi

# ── 執行還原 ────────────────────────────────────────────────────────────────
info "開始還原資料庫..."
warn ">>> 這將覆蓋 $DB_NAME 的所有資料 <<<"

export PGPASSWORD="$DB_PASS"

if echo "$BACKUP_FILE" | grep -q '\.gz$'; then
  # gzip 壓縮的 custom format
  gunzip -c "$BACKUP_FILE" | pg_restore \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    --single-transaction \
    2>&1 || warn "部分物件可能已存在（可忽略 DROP 錯誤）"
else
  pg_restore \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    --single-transaction \
    "$BACKUP_FILE" \
    2>&1 || warn "部分物件可能已存在（可忽略 DROP 錯誤）"
fi

unset PGPASSWORD

# ── 驗證還原 ────────────────────────────────────────────────────────────────
info "驗證還原結果..."

export PGPASSWORD="$DB_PASS"
USER_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM \"User\"" 2>/dev/null | tr -d ' ' || echo "N/A")
APP_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM \"App\"" 2>/dev/null | tr -d ' ' || echo "N/A")
unset PGPASSWORD

info "  Users: $USER_COUNT"
info "  Apps: $APP_COUNT"
info "還原完成"

if [ "$SKIP_SNAPSHOT" = false ]; then
  echo ""
  info "如需回復還原前狀態："
  info "  bash scripts/restore-db.sh --backup-file $PRE_RESTORE_BACKUP --env $ENV --confirm --skip-snapshot"
fi
