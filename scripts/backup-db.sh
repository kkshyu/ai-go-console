#!/usr/bin/env bash
# ============================================================================
# PostgreSQL 備份腳本
# 用途：備份 AI Go Console 的 PostgreSQL 資料庫
# 使用方式：bash scripts/backup-db.sh [OPTIONS]
#
# 選項：
#   --env dev|prod            環境（預設 dev）
#   --output-dir <path>       備份輸出目錄（預設 backups/db/）
#   --retention-days <n>      每日備份保留天數（預設 7）
#   --retention-weeks <n>     每週備份保留週數（預設 4）
#   --weekly                  標記為每週備份
#   --label <text>            備份標籤（如 pre-migrate, pre-publish）
#   --upload-to-minio         上傳到 MinIO backup bucket（正式環境用）
#   --quiet                   減少輸出
# ============================================================================
set -euo pipefail

# ── 顏色輸出 ────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { [ "$QUIET" = true ] || echo -e "${GREEN}[BACKUP]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── 參數預設值 ──────────────────────────────────────────────────────────────
ENV="dev"
OUTPUT_DIR=""
RETENTION_DAYS=7
RETENTION_WEEKS=4
WEEKLY=false
LABEL=""
UPLOAD_TO_MINIO=false
QUIET=false

# ── 參數解析 ────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --env)             ENV="$2"; shift 2 ;;
    --output-dir)      OUTPUT_DIR="$2"; shift 2 ;;
    --retention-days)  RETENTION_DAYS="$2"; shift 2 ;;
    --retention-weeks) RETENTION_WEEKS="$2"; shift 2 ;;
    --weekly)          WEEKLY=true; shift ;;
    --label)           LABEL="$2"; shift 2 ;;
    --upload-to-minio) UPLOAD_TO_MINIO=true; shift ;;
    --quiet)           QUIET=true; shift ;;
    --help|-h)
      echo "Usage: bash scripts/backup-db.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --env dev|prod            環境（預設 dev）"
      echo "  --output-dir <path>       備份輸出目錄"
      echo "  --retention-days <n>      每日備份保留天數（預設 7）"
      echo "  --retention-weeks <n>     每週備份保留週數（預設 4）"
      echo "  --weekly                  標記為每週備份"
      echo "  --label <text>            備份標籤"
      echo "  --upload-to-minio         上傳到 MinIO"
      echo "  --quiet                   減少輸出"
      exit 0
      ;;
    *) error "未知參數: $1" ;;
  esac
done

# ── 取得專案根目錄 ──────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── 設定備份目錄 ────────────────────────────────────────────────────────────
if [ -z "$OUTPUT_DIR" ]; then
  OUTPUT_DIR="$PROJECT_DIR/backups/db"
fi
mkdir -p "$OUTPUT_DIR"

# ── 載入環境變數 ────────────────────────────────────────────────────────────
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  source "$PROJECT_DIR/.env"
  set +a
fi

# ── 解析 DATABASE_URL ───────────────────────────────────────────────────────
DB_URL="${DATABASE_URL:-}"
if [ -z "$DB_URL" ]; then
  error "DATABASE_URL 未設定。請確認 .env 檔案存在且包含 DATABASE_URL"
fi

# 從 DATABASE_URL 解析連線資訊
# postgresql://user:password@host:port/dbname?schema=public
DB_USER=$(echo "$DB_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
DB_PASS=$(echo "$DB_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
DB_HOST=$(echo "$DB_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
DB_PORT=$(echo "$DB_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
DB_NAME=$(echo "$DB_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')

if [ -z "$DB_USER" ] || [ -z "$DB_HOST" ] || [ -z "$DB_NAME" ]; then
  error "無法解析 DATABASE_URL: $DB_URL"
fi

# ── 建立備份 ────────────────────────────────────────────────────────────────
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
TYPE="daily"
[ "$WEEKLY" = true ] && TYPE="weekly"

FILENAME="aigo_${ENV}_${TYPE}_${TIMESTAMP}"
[ -n "$LABEL" ] && FILENAME="aigo_${ENV}_${LABEL}_${TIMESTAMP}"
FILEPATH="${OUTPUT_DIR}/${FILENAME}.sql.gz"

info "開始備份 PostgreSQL..."
info "  環境: $ENV"
info "  資料庫: $DB_NAME@$DB_HOST:$DB_PORT"
info "  輸出: $FILEPATH"

# 執行 pg_dump
export PGPASSWORD="$DB_PASS"

if command -v pg_dump >/dev/null 2>&1; then
  pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-owner \
    --no-privileges \
    --clean \
    --if-exists \
    -F c \
    | gzip > "$FILEPATH"
elif kubectl get pods -n aigo-system -l app=platform-postgres --no-headers 2>/dev/null | grep -q Running; then
  # 透過 k8s exec 執行 pg_dump
  POD_NAME=$(kubectl get pods -n aigo-system -l app=platform-postgres -o jsonpath='{.items[0].metadata.name}')
  kubectl exec -n aigo-system "$POD_NAME" -- \
    pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-privileges --clean --if-exists \
    | gzip > "$FILEPATH"
else
  error "找不到 pg_dump 且 PostgreSQL Pod 不可用"
fi

unset PGPASSWORD

# 驗證備份
BACKUP_SIZE=$(stat -f%z "$FILEPATH" 2>/dev/null || stat -c%s "$FILEPATH" 2>/dev/null || echo "0")
if [ "$BACKUP_SIZE" -lt 100 ]; then
  error "備份檔案太小 (${BACKUP_SIZE} bytes)，備份可能失敗"
fi

info "  備份完成: $(echo "$BACKUP_SIZE" | awk '{printf "%.2f MB", $1/1024/1024}')"

# ── 上傳到 MinIO（正式環境） ────────────────────────────────────────────────
if [ "$UPLOAD_TO_MINIO" = true ]; then
  MINIO_URL="${BUILTIN_MINIO_URL:-http://localhost:9000}"
  MINIO_USER="${BUILTIN_MINIO_ROOT_USER:-minioadmin}"
  MINIO_PASS="${BUILTIN_MINIO_ROOT_PASSWORD:-minioadmin}"
  BACKUP_BUCKET="backup-db"

  if command -v mc >/dev/null 2>&1; then
    mc alias set aigo-backup "$MINIO_URL" "$MINIO_USER" "$MINIO_PASS" --api S3v4 2>/dev/null
    mc mb --ignore-existing "aigo-backup/${BACKUP_BUCKET}" 2>/dev/null
    mc cp "$FILEPATH" "aigo-backup/${BACKUP_BUCKET}/${FILENAME}.sql.gz"
    info "  已上傳到 MinIO: ${BACKUP_BUCKET}/${FILENAME}.sql.gz"
  else
    warn "  mc (MinIO Client) 未安裝，跳過上傳"
  fi
fi

# ── 清理過期備份 ────────────────────────────────────────────────────────────
info "清理過期備份..."

# 清理過期 daily 備份
find "$OUTPUT_DIR" -name "aigo_${ENV}_daily_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete 2>/dev/null && \
  info "  已清理超過 ${RETENTION_DAYS} 天的 daily 備份" || true

# 清理過期 weekly 備份
RETENTION_WEEKLY_DAYS=$((RETENTION_WEEKS * 7))
find "$OUTPUT_DIR" -name "aigo_${ENV}_weekly_*.sql.gz" -mtime +"$RETENTION_WEEKLY_DAYS" -delete 2>/dev/null && \
  info "  已清理超過 ${RETENTION_WEEKS} 週的 weekly 備份" || true

# 清理帶標籤的快照（保留 30 天）
find "$OUTPUT_DIR" -name "aigo_${ENV}_pre-*.sql.gz" -mtime +30 -delete 2>/dev/null || true

# ── 輸出備份清單 ────────────────────────────────────────────────────────────
BACKUP_COUNT=$(find "$OUTPUT_DIR" -name "aigo_${ENV}_*.sql.gz" 2>/dev/null | wc -l | tr -d ' ')
info "目前共有 ${BACKUP_COUNT} 個 ${ENV} 備份"

# 輸出備份路徑（供其他腳本使用）
echo "$FILEPATH"
